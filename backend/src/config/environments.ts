/**
 * Environment configuration file
 * Centralizes all environment variables and provides type safety with defaults
 */
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Type definition for all environment variables used in the application
 */
interface Environments {
  nodeEnv: string;      // Current application environment (development, production, etc.)
  port: number;         // Port number for the server to listen on
  mongoUri: string;     // MongoDB connection string
  gcpProjectId: string; // Google Cloud Platform project ID
  gcpBucketName: string; // GCP Storage bucket name for file storage
  fileExpiryDays: number; // Number of days after which uploaded files expire
  maxDownloads: number;   // Maximum number of downloads allowed per file
}

/**
 * Environment configuration object with default values
 * Uses process.env values if available, otherwise falls back to defaults
 */
const env: Environments = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/quicksend',
  gcpProjectId: process.env.GCP_PROJECT_ID || '',
  gcpBucketName: process.env.GCP_BUCKET_NAME || '',
  fileExpiryDays: parseInt(process.env.FILE_EXPIRY_DAYS || '7', 10),
  maxDownloads: parseInt(process.env.MAX_DOWNLOADS || '100', 10),
};

export default env; 