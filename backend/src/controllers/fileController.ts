import { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileOperations, FileMetadata, userProfileOperations } from '../utils/firestore'; // Use Firestore utils
import storage from '../utils/storage'; // Use GCS utils
import env from '../config/environments'; // Import env for limits
import { firestore } from '../config/firebase'; // Need firestore directly for query
import { COLLECTIONS } from '../utils/firestore';

/**
 * Upload a file
 * @route POST /api/upload
 */
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Auth middleware ensures req.user exists if we reach here
    if (!req.user) {
      // This should technically not happen if middleware is applied correctly
      console.error('Authentication error: req.user not found after auth middleware.');
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const userId = req.user.uid;
    const newFileSize = req.file.size;

    // --- Storage Quota Check --- BEGIN
    const userProfile = await userProfileOperations.getUserProfile(userId);

    // Ensure profile exists (it should have been created on first interaction or needs backfill)
    if (!userProfile) {
        console.error(`Critical: User profile not found for ${userId} during upload quota check.`);
        // Create profile on the fly? Or rely on backfill/previous creation?
        // For now, let's create it if missing, assuming defaults are acceptable.
        // Ideally, profile creation should be robustly handled elsewhere (e.g., on signup)
         try {
            await userProfileOperations.createUserProfile(userId, {
                email: req.user.email,
                storageQuota: 1 * 1024 * 1024 * 1024, // Default 1 GB
                preferences: {}, 
            });
            console.log(`User profile created on-the-fly during upload for ${userId}.`);
            // Re-fetch profile to get initial values
            const refetchedProfile = await userProfileOperations.getUserProfile(userId);
            if (!refetchedProfile) throw new Error("Failed to fetch newly created profile");
            // Proceed with quota check using the newly created profile
            if (newFileSize > refetchedProfile.storageQuota) { // Check against total quota for first file
                res.status(413).json({ error: `File size (${(newFileSize / 1024 / 1024).toFixed(1)}MB) exceeds your total storage quota (${(refetchedProfile.storageQuota / 1024 / 1024 / 1024).toFixed(1)}GB).` });
                return;
            }
            // If first file is within quota, usedStorage is 0, no further check needed here
         } catch (profileError) {
            console.error(`Error handling missing profile for ${userId} during upload:`, profileError);
            res.status(500).json({ error: 'Error checking user storage quota.' });
            return;
         }
    } else {
        // Profile exists, check quota
        const currentUsage = userProfile.usedStorage || 0; // Default to 0 if field missing (needs backfill)
        const quota = userProfile.storageQuota;
        if (currentUsage + newFileSize > quota) {
            console.log(`Quota exceeded for user ${userId}. Usage: ${currentUsage}, New File: ${newFileSize}, Quota: ${quota}`);
            res.status(413).json({ error: `Uploading this file would exceed your storage quota (${(quota / 1024 / 1024 / 1024).toFixed(1)}GB).` });
            return;
        }
        // Update last activity timestamp if profile exists
        userProfileOperations.updateLastLogin(userId); 
    }
    // --- Storage Quota Check --- END

    // If quota check passes, proceed with upload
    const { originalname, mimetype, path: tempFilePath } = req.file;
    const fileExtension = path.extname(originalname);
    const uniqueFilename = crypto.randomBytes(16).toString('hex') + fileExtension;
    const destinationPath = `users/${userId}/${uniqueFilename}`;
    console.log(`Uploading to GCS path: ${destinationPath}`);

    await storage.uploadFile(tempFilePath, destinationPath);

    // Create file record in Firestore
    const fileData = {
      name: originalname,
      size: newFileSize,
      type: mimetype,
      ownerId: userId,
      status: 'uploaded' as const,
      storagePath: destinationPath,
    };

    const { id: fileId, shareToken, expiryTimestamp } = await fileOperations.createFileMetadata(fileData);

    // --- Update Used Storage --- BEGIN
    try {
        await userProfileOperations.updateUsedStorage(userId, newFileSize);
        console.log(`Updated usedStorage for user ${userId} by ${newFileSize}`);
    } catch (storageUpdateError) {
        console.error(`Failed to update usedStorage for user ${userId} after uploading file ${fileId}:`, storageUpdateError);
        // Log this error, but don't fail the upload request itself as the file is already uploaded.
        // A background job could reconcile storage later if needed.
    }
    // --- Update Used Storage --- END

    res.status(201).json({
      message: 'File uploaded successfully',
      shareToken: shareToken,
      expiryDate: expiryTimestamp.toDate(),
    });
  } catch (error: any) { // Catch specific multer error for file size
      if (error.code === 'LIMIT_FILE_SIZE') {
        console.log('Multer rejected file due to size limit');
        res.status(413).json({ error: `File exceeds the 10MB size limit.` });
      } else {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Error uploading file' });
      }
  }
};

/**
 * Get file info
 * @route GET /api/files/:shareToken
 */
export const getFileInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareToken } = req.params;

    const fileResult = await fileOperations.getFileMetadataByToken(shareToken);

    if (!fileResult) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const file = fileResult.data;

    // Check if file is expired
    if (new Date() > file.expiryTimestamp.toDate()) {
      res.status(410).json({ error: 'File has expired' });
      // Optionally: Trigger deletion from GCS and Firestore here or via background job
      return;
    }

    // Check if download limit is reached
    if (file.downloadCount >= env.maxDownloads) {
      res.status(410).json({ error: 'Download limit reached' });
      // Optionally: Trigger deletion
      return;
    }

    res.status(200).json({
      filename: file.name,
      size: file.size,
      uploadDate: file.uploadDate.toDate(),
      expiryDate: file.expiryTimestamp.toDate(),
      downloads: file.downloadCount,
    });
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ error: 'Error getting file info' });
  }
};

/**
 * Download a file
 * @route GET /api/download/:shareToken
 */
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareToken } = req.params;

    const fileResult = await fileOperations.getFileMetadataByToken(shareToken);

    if (!fileResult) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const fileId = fileResult.id;
    const file = fileResult.data;

    // Check if file is expired
    if (new Date() > file.expiryTimestamp.toDate()) {
      res.status(410).json({ error: 'File has expired' });
      return;
    }

    // Check if download limit is reached
    if (file.downloadCount >= env.maxDownloads) {
      res.status(410).json({ error: 'Download limit reached' });
      return;
    }

    // Increment download count in Firestore
    await fileOperations.incrementDownloadCount(fileId);

    // Set headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.type);

    // Stream file from GCS
    const fileStream = storage.getFileStream(file.storagePath);

    // Handle stream errors
    fileStream.on('error', (err) => {
      console.error('Error streaming file from GCS:', err);
      // Avoid sending status if headers already sent
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading file:', error);
    // Avoid sending status if headers already sent (e.g., during streaming)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error downloading file' });
    }
  }
};

/**
 * Get files uploaded by the authenticated user
 * @route GET /api/my-files
 */
export const getMyFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }
    const userId = req.user.uid;

    // 1. Fetch user's files
    const filesSnapshot = await firestore.collection(COLLECTIONS.FILES)
      .where('ownerId', '==', userId)
      .orderBy('uploadDate', 'desc') // Optional: Order by upload date, newest first
      .get();

    const userFiles = filesSnapshot.docs.map(doc => {
      const data = doc.data() as FileMetadata;
      return {
        id: doc.id, // Include Firestore document ID
        name: data.name,
        size: data.size,
        type: data.type,
        uploadDate: data.uploadDate.toDate(), // Convert Timestamp to Date
        expiryTimestamp: data.expiryTimestamp.toDate(),
        downloadCount: data.downloadCount,
        shareToken: data.shareToken,
      };
    });

    // 2. Fetch user profile for storage info
    const userProfile = await userProfileOperations.getUserProfile(userId);

    // Handle case where profile might be missing (though unlikely if they've uploaded)
    const storageInfo = {
      usedStorage: userProfile?.usedStorage ?? 0,
      storageQuota: userProfile?.storageQuota ?? 1 * 1024 * 1024 * 1024, // Default 1GB if missing
    };

    res.status(200).json({
      files: userFiles,
      storage: storageInfo,
    });

  } catch (error) {
    console.error('Error fetching user files:', error);
    res.status(500).json({ error: 'Error fetching user files' });
  }
};

// Update the default export to include the new function
export default {
  uploadFile,
  getFileInfo,
  downloadFile,
  getMyFiles,
}; 