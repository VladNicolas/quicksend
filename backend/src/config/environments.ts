import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Environments {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  gcpProjectId: string;
  gcpBucketName: string;
  fileExpiryDays: number;
  maxDownloads: number;
}

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