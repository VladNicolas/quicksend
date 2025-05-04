import * as admin from 'firebase-admin';
import env from './environments';

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
  console.log('Initializing Firebase Admin SDK...');
  // When running in Cloud Run with an attached service account,
  // the SDK automatically uses Application Default Credentials.
  // Do NOT use admin.credential.cert() here.
  admin.initializeApp({
    // No 'credential' field needed when using ADC
    storageBucket: env.gcpBucketName, 
    projectId: env.gcpProjectId,
    // databaseURL is generally for Realtime Database, not Firestore
  });
  console.log('Firebase Admin SDK Initialized.');
}

// Get Firestore instance for the specific database
export const firestore = admin.firestore();
firestore.settings({ databaseId: 'quicksend-db' });

export default admin; 