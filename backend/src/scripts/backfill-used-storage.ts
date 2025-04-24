/**
 * One-time script to backfill the 'usedStorage' field in userProfiles.
 * 
 * Reads all user profiles, calculates the total size of files owned by each user
 * from the 'files' collection, and updates the 'usedStorage' field.
 * 
 * WARNING: Run this script carefully, preferably during a maintenance window
 * or when system load is low, especially if you have many users/files.
 * Ensure you have backups before running.
 */
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables (needed for Firebase Admin initialization)
dotenv.config({ path: path.join(__dirname, '../../.env') }); // Adjust path relative to script location

// Import initialized Firestore instance and FieldValue
import { firestore } from '../config/firebase'; // Adjust path relative to script
import { COLLECTIONS, FileMetadata, UserProfile } from '../utils/firestore'; // Adjust path relative to script

async function backfillUsedStorage() {
  console.log("Starting backfill script for userProfiles.usedStorage...");

  const userProfilesRef = firestore.collection(COLLECTIONS.USER_PROFILES);
  const filesRef = firestore.collection(COLLECTIONS.FILES);

  let updatedProfiles = 0;
  let profilesProcessed = 0;

  try {
    // Get all user profiles
    const snapshot = await userProfilesRef.get();
    profilesProcessed = snapshot.size;
    console.log(`Found ${profilesProcessed} user profiles to process.`);

    // Process each user profile
    for (const userDoc of snapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data() as UserProfile;
      let totalSize = 0;

      console.log(`Processing user: ${userId}`);

      // Find all files owned by this user
      const filesSnapshot = await filesRef.where('ownerId', '==', userId).get();

      if (!filesSnapshot.empty) {
        filesSnapshot.forEach(fileDoc => {
          const fileData = fileDoc.data() as FileMetadata;
          // Add file size, default to 0 if size is missing/invalid (shouldn't happen ideally)
          totalSize += fileData.size || 0;
        });
        console.log(`  Found ${filesSnapshot.size} files totaling ${totalSize} bytes.`);
      } else {
        console.log(`  No files found for this user.`);
      }

      // Update the user profile document if the calculated size is different
      // or if the usedStorage field doesn't exist yet.
      if (userData.usedStorage !== totalSize) {
        try {
          await userProfilesRef.doc(userId).update({ usedStorage: totalSize });
          console.log(`  Successfully updated usedStorage for ${userId} to ${totalSize}.`);
          updatedProfiles++;
        } catch (updateError) {
          console.error(`  Failed to update usedStorage for ${userId}:`, updateError);
        }
      } else {
          console.log(`  usedStorage for ${userId} is already correct (${totalSize}). Skipping update.`);
      }
    }

    console.log("-----------------------------------------");
    console.log("Backfill completed.");
    console.log(`Total profiles processed: ${profilesProcessed}`);
    console.log(`Profiles updated: ${updatedProfiles}`);
    console.log("-----------------------------------------");

  } catch (error) {
    console.error("An error occurred during the backfill process:", error);
  }
}

// Execute the function
backfillUsedStorage()
  .then(() => console.log("Script finished execution."))
  .catch(err => console.error("Script failed with error:", err)); 