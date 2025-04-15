import { fileOperations, userProfileOperations } from './utils/firestore';

async function testFirestore() {
  try {
    console.log('Testing Firestore operations...');

    // Test user profile creation
    const testUserId = 'test-user-123'; // This would come from Firebase Auth in real app
    await userProfileOperations.createUserProfile(testUserId, {
      storageQuota: 1000000000, // 1GB in bytes
      preferences: {
        defaultPrivacy: 'private',
        notifications: true,
      },
    });
    console.log('Created user profile for:', testUserId);

    // Test file metadata creation
    const fileId = await fileOperations.createFileMetadata({
      name: 'test.txt',
      size: 1024,
      type: 'text/plain',
      ownerId: testUserId,
      status: 'uploaded',
      storagePath: `users/${testUserId}/test.txt`,
    });
    console.log('Created file metadata:', fileId);

    // Test retrieving file metadata
    const fileMetadata = await fileOperations.getFileMetadata(fileId);
    console.log('Retrieved file metadata:', fileMetadata);

    // Test updating file metadata
    await fileOperations.updateFileMetadata(fileId, {
      downloadCount: 1,
      lastDownloaded: new Date(),
    });
    console.log('Updated file metadata');

    // Test retrieving updated file metadata
    const updatedFileMetadata = await fileOperations.getFileMetadata(fileId);
    console.log('Retrieved updated file metadata:', updatedFileMetadata);

    // Test updating user profile
    await userProfileOperations.updateUserProfile(testUserId, {
      usedStorage: 1024,
      preferences: {
        defaultPrivacy: 'public',
      },
    });
    console.log('Updated user profile');

    // Test retrieving user profile
    const userProfile = await userProfileOperations.getUserProfile(testUserId);
    console.log('Retrieved user profile:', userProfile);

    // Clean up test data
    await fileOperations.deleteFileMetadata(fileId);
    console.log('Deleted test file metadata');

    console.log('All Firestore tests completed successfully!');
  } catch (error) {
    console.error('Error testing Firestore:', error);
  }
}

testFirestore(); 