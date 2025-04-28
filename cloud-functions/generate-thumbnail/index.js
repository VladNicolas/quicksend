const { Storage } = require('@google-cloud/storage');
const { Firestore } = require('@google-cloud/firestore');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises; // Use promise-based fs
const os = require('os');

// Initialize clients (these will use default credentials in the Cloud Function environment)
const storage = new Storage();
const firestore = new Firestore();

// Constants for thumbnail settings
const THUMBNAIL_PREFIX = 'thumb_';
const THUMBNAIL_MAX_WIDTH = 200;
const THUMBNAIL_MAX_HEIGHT = 200;

/**
 * Triggered by a GCS event wrapped in an HTTP request.
 *
 * @param {object} req The HTTP request object containing the GCS event in its body.
 */
exports.generateThumbnail = async (req) => {
  // --- Remove previous logging ---
  // console.log('Received CloudEvent Keys:', Object.keys(req)); 
  // try { console.log('CloudEvent Data:', JSON.stringify(req.data, null, 2)); } catch (e) { ... }
  
  // --- MODIFICATION: Extract file data from request body ---
  console.log('Inspecting request body keys:', req.body ? Object.keys(req.body) : 'req.body is undefined');
  const fileData = req.body; 
  if (!fileData) {
    console.error('Error: No body data received in HTTP request.');
    // It's possible the actual data is nested further, e.g., req.body.message.data
    // If errors persist, add more logging for the structure of req.body
    return;
  }

  const bucketName = fileData.bucket;
  const filePath = fileData.name; // Full path of the uploaded file
  const contentType = fileData.contentType; // e.g., 'image/jpeg'
  const fileMetadata = fileData.metadata || {}; // GCS metadata

  console.log(`Processing file: ${filePath} in bucket ${bucketName}.`);

  // 1. Check if it's an image file
  if (!contentType || !contentType.startsWith('image/')) {
    console.log(`File ${filePath} is not an image (${contentType}), skipping thumbnail generation.`);
    return;
  }

  // 2. Check if it's already a thumbnail (prevent infinite loops)
  const fileName = path.basename(filePath);
  if (fileName.startsWith(THUMBNAIL_PREFIX)) {
    console.log(`File ${filePath} is already a thumbnail, skipping.`);
    return;
  }

  // 3. Check if Firestore ID metadata exists
  const firestoreId = fileMetadata.firestoreId;
  if (!firestoreId) {
    console.error(`Missing 'firestoreId' metadata for file ${filePath}. Cannot update Firestore.`);
    // Decide if you want to still generate the thumbnail or stop.
    // Let's stop for now to ensure data consistency.
    return; 
  }
   console.log(`Found Firestore ID: ${firestoreId} for file ${filePath}.`);

  // --- File processing ---
  const bucket = storage.bucket(bucketName);
  const originalFile = bucket.file(filePath);
  
  // Prepare temporary file paths
  const tempLocalDir = os.tmpdir();
  const tempLocalPath = path.join(tempLocalDir, fileName);
  const thumbFileName = `${THUMBNAIL_PREFIX}${fileName}`;
  const tempLocalThumbPath = path.join(tempLocalDir, thumbFileName);
  const thumbStoragePath = path.join(path.dirname(filePath), thumbFileName); // Place thumbnail in the same GCS directory

  try {
    // 4. Download original file to temporary location
    console.log(`Attempting to download: bucket='${bucketName}', path='${filePath}'`);
    console.log(`Downloading ${filePath} to ${tempLocalPath}...`);
    await originalFile.download({ destination: tempLocalPath });
    console.log(`Downloaded successfully.`);

    // 5. Resize image using sharp
    console.log(`Resizing image to max ${THUMBNAIL_MAX_WIDTH}x${THUMBNAIL_MAX_HEIGHT}...`);
    await sharp(tempLocalPath)
      .resize(THUMBNAIL_MAX_WIDTH, THUMBNAIL_MAX_HEIGHT, {
        fit: sharp.fit.inside, // Maintain aspect ratio, fit within bounds
        withoutEnlargement: true, // Don't enlarge small images
      })
      .toFile(tempLocalThumbPath);
    console.log(`Resized image saved to ${tempLocalThumbPath}.`);

    // 6. Upload the thumbnail back to GCS
    console.log(`Uploading thumbnail ${thumbFileName} to ${thumbStoragePath}...`);
    await bucket.upload(tempLocalThumbPath, {
      destination: thumbStoragePath,
      metadata: {
        contentType: contentType, // Preserve original image type (or force JPEG?)
        cacheControl: 'public, max-age=31536000', // Set cache control
        // Add metadata indicating this is a thumbnail if needed
        // metadata: { generatedBy: 'cloud-function-thumbnailer' } 
      },
    });
    console.log(`Thumbnail uploaded successfully.`);

    // 7. Update Firestore document with the thumbnail path
    console.log(`Updating Firestore document ${firestoreId} with thumbnail path: ${thumbStoragePath}`);
    const fileDocRef = firestore.collection('files').doc(firestoreId); 
    await fileDocRef.update({
      thumbnailPath: thumbStoragePath, // Add/update the thumbnail path field
    });
    console.log(`Firestore document updated.`);

  } catch (error) {
    console.error('Error during thumbnail generation:', error);
    // Depending on the error, you might want specific handling
    // For now, just log the error. Consider adding error reporting (e.g., Cloud Error Reporting)
  } finally {
    // 8. Clean up temporary files
    try {
      await fs.unlink(tempLocalPath);
      console.log(`Deleted temporary original: ${tempLocalPath}`);
    } catch (err) {
      console.warn(`Failed to delete temporary original ${tempLocalPath}:`, err);
    }
    try {
      await fs.unlink(tempLocalThumbPath);
      console.log(`Deleted temporary thumbnail: ${tempLocalThumbPath}`);
    } catch (err) {
      console.warn(`Failed to delete temporary thumbnail ${tempLocalThumbPath}:`, err);
    }
  }
}; 