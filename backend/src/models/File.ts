import mongoose, { Document } from 'mongoose';
import crypto from 'crypto';
import env from '../config/environments';

// File document interface
export interface IFile {
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  size: number;
  shareToken: string;
  downloadCount: number;
  uploadTimestamp: Date;
  expiryTimestamp: Date;
}

// File document methods interface
export interface IFileMethods {
  isExpired(): boolean;
  isDownloadLimitReached(): boolean;
}

// Combined document type
export type FileDocument = Document & IFile & IFileMethods;

// File schema
const fileSchema = new mongoose.Schema<IFile, mongoose.Model<IFile, {}, IFileMethods>>({
  originalFilename: {
    type: String,
    required: true
  },
  storagePath: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  shareToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  uploadTimestamp: {
    type: Date,
    default: Date.now
  },
  expiryTimestamp: {
    type: Date,
    required: true
  }
});

// Generate a unique share token
fileSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next();
  }
  
  this.shareToken = crypto.randomBytes(16).toString('hex');
  
  // Set expiry timestamp
  const now = new Date();
  this.expiryTimestamp = new Date(now.setDate(now.getDate() + env.fileExpiryDays));
  
  next();
});

// Check if file is expired
fileSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiryTimestamp;
};

// Check if download limit is reached
fileSchema.methods.isDownloadLimitReached = function(): boolean {
  return this.downloadCount >= env.maxDownloads;
};

const File = mongoose.model<IFile, mongoose.Model<IFile, {}, IFileMethods>>('File', fileSchema);

export default File; 