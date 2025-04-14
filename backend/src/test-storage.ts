import storage from './utils/storage';
import fs from 'fs';
import path from 'path';

async function testStorage() {
  try {
    console.log('Testing GCP Storage connection...');
    
    // Create a test file
    const testFilePath = path.join(process.cwd(), 'test.txt');
    fs.writeFileSync(testFilePath, 'Hello, GCP Storage! This is a test file that will remain in the bucket.');
    
    // Try to upload the file
    const destinationPath = 'test-files/test-' + Date.now() + '.txt';
    console.log('Uploading test file...');
    const uploadedPath = await storage.uploadFile(testFilePath, destinationPath);
    console.log('File uploaded successfully:', uploadedPath);
    
    // Try to get the file stream
    console.log('Testing file stream...');
    const stream = storage.getFileStream(destinationPath);
    console.log('File stream created successfully');
    
    console.log('\nTest completed!');
    console.log('You can now check your GCP Console to see the file in the bucket.');
    console.log('File path in bucket:', destinationPath);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testStorage(); 