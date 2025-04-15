import { Firestore } from '@google-cloud/firestore';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firestore
const firestore = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: path.resolve(process.env.GCP_SERVICE_ACCOUNT_PATH || './gcp-service-account.json'),
  databaseId: 'quicksend-db',
});

export default firestore; 