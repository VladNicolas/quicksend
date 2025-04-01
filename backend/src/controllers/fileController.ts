import { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import File from '../models/File';
import storage from '../utils/storage';

/**
 * Upload a file
 * @route POST /api/upload
 */
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { originalname, mimetype, size, path: filePath } = req.file;
    const fileExtension = path.extname(originalname);
    const fileId = crypto.randomBytes(16).toString('hex');
    const destinationPath = `files/${fileId}${fileExtension}`;

    // Upload file to GCS
    await storage.uploadFile(filePath, destinationPath);

    // Create file record in database
    const file = new File({
      originalFilename: originalname,
      storagePath: destinationPath,
      mimeType: mimetype,
      size,
    });

    await file.save();

    res.status(201).json({
      message: 'File uploaded successfully',
      shareToken: file.shareToken,
      expiryDate: file.expiryTimestamp,
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
    
    const file = await File.findOne({ shareToken });
    
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    
    // Check if file is expired
    if (file.isExpired()) {
      res.status(410).json({ error: 'File has expired' });
      return;
    }
    
    // Check if download limit is reached
    if (file.isDownloadLimitReached()) {
      res.status(410).json({ error: 'Download limit reached' });
      return;
    }
    
    res.status(200).json({
      filename: file.originalFilename,
      size: file.size,
      uploadDate: file.uploadTimestamp,
      expiryDate: file.expiryTimestamp,
      downloads: file.downloadCount,
    });
  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ error: 'Error getting file info' });
  }
};

/**
 * Download a file
 * @route GET /download/:shareToken
 */
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareToken } = req.params;
    
    const file = await File.findOne({ shareToken });
    
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    
    // Check if file is expired
    if (file.isExpired()) {
      res.status(410).json({ error: 'File has expired' });
      return;
    }
    
    // Check if download limit is reached
    if (file.isDownloadLimitReached()) {
      res.status(410).json({ error: 'Download limit reached' });
      return;
    }
    
    // Increment download count
    file.downloadCount += 1;
    await file.save();
    
    // Set headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalFilename}"`);
    res.setHeader('Content-Type', file.mimeType);
    
    // Stream file from GCS
    const fileStream = storage.getFileStream(file.storagePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Error downloading file' });
  }
};

export default {
  uploadFile,
  getFileInfo,
  downloadFile,
}; 