import { fileOperations } from './utils/firestore';
import { getFileStream } from './utils/storage';
import { Timestamp } from 'firebase-admin/firestore';
import './config/firebase';

async function testDownload(shareToken: string) {
  try {
    console.log('Testing file download with share token:', shareToken);

    // Find the file by share token
    const filesSnapshot = await fileOperations.findFileByShareToken(shareToken);
    if (!filesSnapshot || filesSnapshot.empty) {
      console.log('No file found with this share token');
      return;
    }

    const fileDoc = filesSnapshot.docs[0];
    const fileData = fileDoc.data();
    console.log('Found file:', fileData);

    // Check if file is expired
    if (fileData.expiryTimestamp.toDate() < new Date()) {
      console.log('File has expired');
      return;
    }

    // Check download count
    if (fileData.downloadCount >= 100) { // Using the maxDownloads from env
      console.log('Maximum download count reached');
      return;
    }

    // Get the file stream
    const fileStream = getFileStream(fileData.storagePath);
    console.log('File stream created successfully');

    // Update download count
    await fileOperations.updateFileMetadata(fileDoc.id, {
      downloadCount: fileData.downloadCount + 1,
      lastDownloaded: Timestamp.now(),
    });
    console.log('Download count updated');

    // In a real application, we would pipe this stream to the response
    // For testing, we'll just log that we got the stream
    console.log('File download test completed successfully!');
    console.log('In a real application, this file would be downloaded now');
  } catch (error) {
    console.error('Error testing download:', error);
  }
}

// Get the share token from command line arguments
const shareToken = process.argv[2];
if (!shareToken) {
  console.log('Please provide a share token as an argument');
  console.log('Usage: npm run test:download <share-token>');
  process.exit(1);
}

testDownload(shareToken); 