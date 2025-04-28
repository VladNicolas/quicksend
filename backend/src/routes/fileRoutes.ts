import express from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fileController from '../controllers/fileController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use OS temp directory
    cb(null, os.tmpdir());
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Routes
router.post('/upload', authMiddleware, upload.single('file'), fileController.uploadFile);

// New route for fetching user's files (protected)
router.get('/my-files', authMiddleware, fileController.getMyFiles);

// Public routes for file info and download
router.get('/files/:shareToken', fileController.getFileInfo);
router.get('/download/:shareToken', fileController.downloadFile);

// New route for deleting a file (protected)
router.delete('/files/:fileId', authMiddleware, fileController.deleteFile);

export default router; 