import { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileOperations, FileMetadata, userProfileOperations } from '../utils/firestore'; // Use Firestore utils
import storage from '../utils/storage'; // Use GCS utils
import env from '../config/environments'; // Import env for limits
import { firestore } from '../config/firebase'; // Need firestore directly for query
import { COLLECTIONS } from '../utils/firestore';
import { logger } from '../config/logger'; // Import logger
import formData from 'form-data'; // mailgun.js dependency
import Mailgun from 'mailgun.js';

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

    // --- MODIFICATION START: Create Firestore doc first to get the ID ---
    // Prepare Firestore data (without storagePath initially, maybe? Or with it?)
    // Let's create the doc ID first, then upload with metadata, then set the data.
    
    const fileRef = firestore.collection(COLLECTIONS.FILES).doc();
    const fileId = fileRef.id;
    
    // Now upload to GCS, including the Firestore ID in metadata
    try {
      await storage.uploadFile(tempFilePath, destinationPath, { firestoreId: fileId });
      logger.info(`File uploaded to GCS with Firestore ID: ${fileId}`);
    } catch (uploadError) {
        logger.error(`GCS upload failed for ${destinationPath}:`, uploadError);
        // If GCS upload fails, we shouldn't proceed to create the Firestore record or update quota
        res.status(500).json({ error: 'Failed to store file in cloud storage.' });
        return; // Stop execution
    }
    // --- MODIFICATION END ---

    // Create file record in Firestore using the generated ID
    const fileData = {
      name: originalname,
      size: newFileSize,
      type: mimetype,
      ownerId: userId,
      status: 'uploaded' as const,
      storagePath: destinationPath, // Use the final path
    };

    // Use the fileRef obtained earlier to set the data
    const { shareToken, expiryTimestamp } = await fileOperations.createFileMetadata(fileData, fileRef);

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
      .orderBy('uploadDate', 'desc')
      .get();

    // --- MODIFICATION START: Generate signed URLs conditionally ---
    // Process files and generate signed URLs concurrently
    const userFilesPromises = filesSnapshot.docs.map(async (doc) => {
      const data = doc.data() as FileMetadata;
      let previewUrl: string | null = null;

      // --- MODIFICATION: Prioritize thumbnail path --- 
      const pathToSign = data.thumbnailPath || (data.type.startsWith('image/') ? data.storagePath : null);
      
      // --- ADDED: Debug logging for paths ---
      if (data.type.startsWith('image/')) { // Only log for images
          logger.debug(`getMyFiles - File: ${data.name} (ID: ${doc.id})`);
          logger.debug(`  Type: ${data.type}`);
          logger.debug(`  Firestore thumbnailPath: ${data.thumbnailPath}`);
          logger.debug(`  Firestore storagePath: ${data.storagePath}`);
          logger.debug(`  Path chosen for signing: ${pathToSign}`);
      }
      // --- END ADDED ---

      if (pathToSign) { // Only generate URL if we have a path (thumb or original image)
        try {
          previewUrl = await storage.generateV4ReadSignedUrl(pathToSign);
        } catch (urlError) {
          logger.error(`Failed to generate preview URL for ${pathToSign}:`, urlError);
        }
      }

      return {
        id: doc.id,
        name: data.name,
        size: data.size,
        type: data.type,
        uploadDate: data.uploadDate.toDate(),
        expiryTimestamp: data.expiryTimestamp.toDate(),
        downloadCount: data.downloadCount,
        shareToken: data.shareToken,
        previewUrl: previewUrl, // Include the generated URL (or null)
        // Note: We no longer return storagePath to the frontend
      };
    });

    // Wait for all promises to resolve
    const userFiles = await Promise.all(userFilesPromises);
    // --- MODIFICATION END ---

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

/**
 * Delete a file owned by the authenticated user
 * @route DELETE /api/files/:fileId
 */
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            logger.warn('Attempt to delete file without authentication.');
            res.status(401).json({ error: 'Unauthorized: User not authenticated' });
            return;
        }
        const userId = req.user.uid;
        const { fileId } = req.params;

        if (!fileId) {
            res.status(400).json({ error: 'Bad Request: Missing file ID' });
            return;
        }

        logger.info(`User ${userId} attempting to delete file ${fileId}`);

        // 1. Fetch file metadata
        const fileMetadata = await fileOperations.getFileMetadata(fileId); // Corrected function name

        if (!fileMetadata) {
            logger.warn(`File not found for deletion: ${fileId} by user ${userId}`);
            res.status(404).json({ error: 'File not found' });
            return;
        }

        // 2. Verify ownership
        if (fileMetadata.ownerId !== userId) {
            logger.warn(`Forbidden: User ${userId} attempted to delete file ${fileId} owned by ${fileMetadata.ownerId}`);
            res.status(403).json({ error: 'Forbidden: You do not own this file' });
            return;
        }

        const fileSize = fileMetadata.size;
        const storagePath = fileMetadata.storagePath;

        // 3. Delete file from GCS
        try {
            await storage.deleteFile(storagePath);
            logger.info(`Successfully deleted file from GCS: ${storagePath}`);
        } catch (gcsError) {
            logger.error(`Failed to delete file from GCS: ${storagePath}. Error:`, gcsError);
            // Proceed to delete metadata but log the GCS error. Might require manual cleanup later.
            // Alternatively, you could stop here and return an error.
            // Let's proceed for now to ensure metadata consistency.
        }

        // 4. Delete file metadata from Firestore
        try {
            await fileOperations.deleteFileMetadata(fileId);
            logger.info(`Successfully deleted file metadata from Firestore: ${fileId}`);
        } catch (firestoreError) {
            logger.error(`Failed to delete file metadata from Firestore: ${fileId}. Error:`, firestoreError);
            // If metadata deletion fails after GCS deletion, this is problematic.
            // Consider mechanisms for reconciliation.
            res.status(500).json({ error: 'Failed to delete file record. Please try again.' });
            return;
        }

        // 5. Update user's used storage (decrement)
        try {
            await userProfileOperations.updateUsedStorage(userId, -fileSize); // Pass negative size
            logger.info(`Updated usedStorage for user ${userId} by ${-fileSize} after deleting file ${fileId}`);
        } catch (storageUpdateError) {
            logger.error(`Failed to update usedStorage for user ${userId} after deleting file ${fileId}. Error:`, storageUpdateError);
            // Log this error, but the main deletion was successful.
        }

        res.status(200).json({ message: 'File deleted successfully' });

    } catch (error) {
        logger.error('Error deleting file:', error);
        res.status(500).json({ error: 'Internal server error during file deletion' });
    }
};

/**
 * Share a file via email using Mailgun
 * @route POST /api/share/email
 */
export const shareViaEmail = async (req: Request, res: Response): Promise<void> => {
  const { recipientEmail, shareToken } = req.body;

  // Basic validation
  if (!recipientEmail || !shareToken) {
    res.status(400).json({ error: 'Missing recipientEmail or shareToken in request body' });
    return;
  }

  // Validate email format (simple regex, consider a more robust library for production)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    res.status(400).json({ error: 'Invalid recipient email format' });
    return;
  }

  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  const mailgunFromEmail = process.env.MAILGUN_FROM_EMAIL;
  const backendBaseUrl = process.env.BACKEND_BASE_URL;

  if (!mailgunApiKey || !mailgunDomain || !mailgunFromEmail || !backendBaseUrl) {
    logger.error('Mailgun or Backend URL configuration is missing in environment variables.');
    res.status(500).json({ error: 'Email service configuration error.' });
    return;
  }

  // Check if file exists and is valid before attempting to send email
  try {
    const fileResult = await fileOperations.getFileMetadataByToken(shareToken);
    if (!fileResult || !fileResult.data) {
      res.status(404).json({ error: 'File not found or invalid share token.' });
      return;
    }
    const file = fileResult.data;
    if (new Date() > file.expiryTimestamp.toDate()) {
        res.status(410).json({ error: 'Cannot share, file has expired.' });
        return;
    }
    if (file.downloadCount >= env.maxDownloads) {
        res.status(410).json({ error: 'Cannot share, file download limit reached.' });
        return;
    }

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({ username: 'api', key: mailgunApiKey });

    const downloadLink = `${backendBaseUrl}/api/download/${shareToken}`;
    
    const emailSubject = 'A file has been shared with you via QuickSend';
    const emailTextBody = `Someone has shared a file with you. You can download it here: ${downloadLink}\n\nThis link will expire in 7 days or after ${env.maxDownloads} downloads.`;
    // Optional: Add an HTML body for prettier emails
    const emailHtmlBody = `
      <p>Hello,</p>
      <p>Someone has shared a file with you using QuickSend: <strong>${file.name}</strong> (Size: ${(file.size / 1024 / 1024).toFixed(2)} MB).</p>
      <p>You can download it using the link below:</p>
      <p><a href="${downloadLink}">${downloadLink}</a></p>
      <p>This link will expire on ${file.expiryTimestamp.toDate().toLocaleDateString()} or after ${env.maxDownloads} downloads.</p>
      <p>Thank you for using QuickSend!</p>
    `;

    const messageData = {
      from: `QuickSend File Share <${mailgunFromEmail}>`,
      to: recipientEmail,
      subject: emailSubject,
      text: emailTextBody,
      html: emailHtmlBody
    };

    await mg.messages.create(mailgunDomain, messageData);
    logger.info(`Email sent successfully to ${recipientEmail} for token ${shareToken}`);
    res.status(200).json({ message: 'Email sent successfully.' });

  } catch (error: any) {
    logger.error('Error sending email via Mailgun:', error.message || error);
    if (error.status && error.message) { // Mailgun specific error
        res.status(error.status).json({ error: `Failed to send email: ${error.message}` });
    } else {
        res.status(500).json({ error: 'Failed to send email due to an internal error.' });
    }
  }
};

// Update the default export to include the new function
export default {
  uploadFile,
  getFileInfo,
  downloadFile,
  getMyFiles,
  deleteFile,
  shareViaEmail,
}; 