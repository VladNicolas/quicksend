import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import env from '../config/environments';

// Initialize storage
const storage = new Storage({
  projectId: env.gcpProjectId,
});

const bucket = storage.bucket(env.gcpBucketName);

/**
 * Uploads a file to Google Cloud Storage
 * @param filePath - Local path to the file
 * @param destinationPath - Path in the bucket
 */
export const uploadFile = async (filePath: string, destinationPath: string): Promise<string> => {
  try {
    await bucket.upload(filePath, {
      destination: destinationPath,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    
    // Remove local file after upload
    fs.unlinkSync(filePath);
    
    return destinationPath;
  } catch (error) {
    console.error('Error uploading file to Google Cloud Storage:', error);
    throw error;
  }
};

/**
 * Gets a readable stream for a file from Google Cloud Storage
 * @param filePath - Path to the file in the bucket
 */
export const getFileStream = (filePath: string) => {
  const file = bucket.file(filePath);
  return file.createReadStream();
};

/**
 * Deletes a file from Google Cloud Storage
 * @param filePath - Path to the file in the bucket
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await bucket.file(filePath).delete();
  } catch (error) {
    console.error('Error deleting file from Google Cloud Storage:', error);
    throw error;
  }
};

export default {
  uploadFile,
  getFileStream,
  deleteFile,
}; 