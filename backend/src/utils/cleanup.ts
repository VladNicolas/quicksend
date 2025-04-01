import File from '../models/File';
import storage from './storage';
import env from '../config/environments';

/**
 * Delete expired files from both the database and Google Cloud Storage
 */
export const deleteExpiredFiles = async (): Promise<void> => {
  try {
    console.log('Running cleanup job for expired files...');
    
    // Find files that have expired
    const expiredFiles = await File.find({
      $or: [
        { expiryTimestamp: { $lt: new Date() } },
        { downloadCount: { $gte: env.maxDownloads } }
      ]
    });
    
    if (expiredFiles.length === 0) {
      console.log('No expired files found.');
      return;
    }
    
    console.log(`Found ${expiredFiles.length} expired files to delete.`);
    
    // Delete each file from storage and database
    const deletePromises = expiredFiles.map(async (file) => {
      try {
        // Delete from Google Cloud Storage
        await storage.deleteFile(file.storagePath);
        
        // Delete from database
        await file.deleteOne();
        
        console.log(`Deleted file: ${file.originalFilename} (${file.shareToken})`);
      } catch (error) {
        console.error(`Error deleting file ${file.shareToken}:`, error);
      }
    });
    
    await Promise.all(deletePromises);
    
    console.log('Cleanup job completed.');
  } catch (error) {
    console.error('Error running cleanup job:', error);
  }
};

export default {
  deleteExpiredFiles,
}; 