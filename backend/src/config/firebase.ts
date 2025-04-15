import * as admin from 'firebase-admin';
import env from './environments';

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(env.gcpServiceAccountPath),
    storageBucket: env.gcpBucketName,
    databaseURL: `https://${env.gcpProjectId}.firebaseio.com`,
    projectId: env.gcpProjectId,
  });
}

// Get Firestore instance for the specific database
export const firestore = admin.firestore();
firestore.settings({ databaseId: 'quicksend-db' });

export default admin; 