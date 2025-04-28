import { Storage, UploadOptions } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import env from '../config/environments';

// Initialize storage with service account credentials
const storage = new Storage({
  projectId: env.gcpProjectId,
  keyFilename: env.gcpServiceAccountPath,
});

const bucket = storage.bucket(env.gcpBucketName);

/**
 * Uploads a file to Google Cloud Storage
 * @param filePath - Local path to the file
 * @param destinationPath - Path in the bucket
 * @param gcsMetadata - Optional metadata to attach to the GCS object
 */
export const uploadFile = async (
  filePath: string, 
  destinationPath: string, 
  gcsMetadata?: { [key: string]: string } // Add optional metadata parameter
): Promise<string> => {
  try {
    const options: UploadOptions = {
      destination: destinationPath,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        // Merge custom metadata if provided
        metadata: gcsMetadata 
      },
    };

    await bucket.upload(filePath, options);
    
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

/**
 * Gets a public URL for a file in Google Cloud Storage
 * @param filePath - Path to the file in the bucket
 */
export const getFileUrl = (filePath: string): string => {
  return `https://storage.googleapis.com/${env.gcpBucketName}/${filePath}`;
};

/**
 * Generates a V4 signed URL for reading a file from GCS.
 * URL is valid for 15 minutes.
 * @param filePath - Path to the file in the bucket
 */
export const generateV4ReadSignedUrl = async (filePath: string): Promise<string> => {
  // These options will allow temporary read access to the file
  const options = {
    version: 'v4' as const, // Specify V4 signing
    action: 'read' as const,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  };

  try {
    // Get a v4 signed URL for reading the file
    const [url] = await bucket.file(filePath).getSignedUrl(options);
    return url;
  } catch (error) {
    console.error('Error generating signed URL for file:', filePath, error);
    // Depending on desired behavior, you might want to throw the error
    // or return an empty string/null/specific error indicator.
    // Throwing for now, as the caller (getMyFiles) might need to know.
    throw new Error(`Failed to generate signed URL for ${filePath}`);
  }
};

export default {
  uploadFile,
  getFileStream,
  deleteFile,
  getFileUrl,
  generateV4ReadSignedUrl,
}; 