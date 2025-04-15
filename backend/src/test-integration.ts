import { uploadFile, getFileUrl, deleteFile } from './utils/storage';
import { fileOperations, userProfileOperations } from './utils/firestore';
import * as fs from 'fs';
import * as path from 'path';
import './config/firebase'; // This will initialize Firebase Admin
import env from './config/environments';

async function testIntegration() {
  try {
    console.log('Testing Storage and Firestore integration...');

    // Create test user profile
    const testUserId = 'test-user-123';
    await userProfileOperations.createUserProfile(testUserId, {
      storageQuota: 1000000000, // 1GB in bytes
      preferences: {
        defaultPrivacy: 'private',
        notifications: true,
      },
    });
    console.log('Created user profile for:', testUserId);

    // Create a test file
    const testFileName = 'test-file.txt';
    const testFilePath = path.join(process.cwd(), testFileName);
    fs.writeFileSync(testFilePath, 'This is a test file for integration testing');
    const fileStats = fs.statSync(testFilePath);

    // Upload file to storage
    const storagePath = `users/${testUserId}/${testFileName}`;
    await uploadFile(testFilePath, storagePath);
    console.log('Uploaded file to storage:', storagePath);

    // Create file metadata in Firestore
    const fileId = await fileOperations.createFileMetadata({
      name: testFileName,
      size: fileStats.size,
      type: 'text/plain',
      ownerId: testUserId,
      status: 'uploaded',
      storagePath: storagePath,
    });
    console.log('Created file metadata with ID:', fileId);

    // Get file metadata
    const fileMetadata = await fileOperations.getFileMetadata(fileId);
    console.log('Retrieved file metadata:', fileMetadata);
    console.log('File expires on:', fileMetadata?.expiryTimestamp.toDate());
    console.log('Share token:', fileMetadata?.shareToken);

    // Get file URL
    const fileUrl = getFileUrl(storagePath);
    console.log('File URL:', fileUrl);

    // Commenting out cleanup to allow inspection of resources in GCP console
    // // Clean up
    // await deleteFile(storagePath);
    // await fileOperations.deleteFileMetadata(fileId);
    // console.log('Cleaned up test resources');

    console.log('All integration tests completed successfully!');
    console.log('Resources are kept for inspection:');
    console.log('- Storage path:', storagePath);
    console.log('- Firestore document ID:', fileId);
  } catch (error) {
    console.error('Error testing integration:', error);
  }
}

testIntegration(); 