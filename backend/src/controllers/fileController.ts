import { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileOperations, FileMetadata, userProfileOperations } from '../utils/firestore'; // Use Firestore utils
import storage from '../utils/storage'; // Use GCS utils
import env from '../config/environments'; // Import env for limits

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

    const { originalname, mimetype, size, path: tempFilePath } = req.file;
    const fileExtension = path.extname(originalname);
    const uniqueFilename = crypto.randomBytes(16).toString('hex') + fileExtension;
    const userId = req.user.uid;

    // Construct destination path using user ID
    const destinationPath = `users/${userId}/${uniqueFilename}`;
    console.log(`Uploading to GCS path: ${destinationPath}`); // Log the path

    // Upload file to GCS (storage util deletes temp file)
    await storage.uploadFile(tempFilePath, destinationPath);

    // --- User Profile Check/Creation --- BEGIN
    let userProfile = await userProfileOperations.getUserProfile(userId);

    if (!userProfile) {
      console.log(`User profile not found for ${userId}, creating one.`);
      try {
        // Extract email from decoded token (if available)
        const userEmail = req.user.email;

        await userProfileOperations.createUserProfile(userId, {
          // Define default values for a new profile
          email: userEmail, // Pass the email
          storageQuota: 1 * 1024 * 1024 * 1024, // Default 1 GB quota
          preferences: { // Example preferences
            defaultPrivacy: 'private',
            notifications: true,
          },
        });
        console.log(`User profile created for ${userId}.`);
        // Optionally re-fetch the profile if needed later, but not strictly necessary here
      } catch (profileError) {
        console.error(`Error creating user profile for ${userId}:`, profileError);
        // Decide if this error should prevent file upload or just be logged
        // For now, let's log and continue with the upload
      }
    } else {
      // Optionally update last seen/activity timestamp
       userProfileOperations.updateLastLogin(userId); // Re-using this to update activity
    }
    // --- User Profile Check/Creation --- END

    // Create file record in Firestore
    const fileData = {
      name: originalname,
      size,
      type: mimetype,
      ownerId: req.user.uid,
      status: 'uploaded' as const,
      storagePath: destinationPath,
    };

    const { shareToken, expiryTimestamp } = await fileOperations.createFileMetadata(fileData);

    res.status(201).json({
      message: 'File uploaded successfully',
      shareToken: shareToken,
      expiryDate: expiryTimestamp.toDate(), // Convert Firestore Timestamp to JS Date
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Error uploading file' });
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

// Keep the export structure the same
export default {
  uploadFile,
  getFileInfo,
  downloadFile,
}; 