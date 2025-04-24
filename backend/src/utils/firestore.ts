import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import { firestore } from '../config/firebase';

// Collection names
export const COLLECTIONS = {
  FILES: 'files',
  USER_PROFILES: 'userProfiles',
} as const;

// File metadata interface
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  uploadDate: Timestamp;
  ownerId: string;
  status: 'uploading' | 'uploaded' | 'error';
  downloadCount: number;
  expiryTimestamp: Timestamp;
  shareToken: string;
  lastDownloaded?: Date;
  storagePath: string;
  metadata?: Record<string, any>;
}

// User profile interface - only application-specific data
export interface UserProfile {
  storageQuota: number;
  usedStorage: number;
  createdAt: Date;
  lastLogin: Date;
  email?: string;
  preferences?: {
    defaultPrivacy?: 'public' | 'private';
    notifications?: boolean;
    // Add other preferences as needed
  };
}

// File operations
export const fileOperations = {
  // Create a new file metadata entry
  async createFileMetadata(data: Omit<FileMetadata, 'uploadDate' | 'downloadCount' | 'expiryTimestamp' | 'shareToken'>): Promise<{ id: string; shareToken: string; expiryTimestamp: Timestamp }> {
    const fileRef = firestore.collection(COLLECTIONS.FILES).doc();
    const now = Timestamp.fromDate(new Date());
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now
    const shareToken = generateShareToken();

    const fileData: FileMetadata = {
      ...data,
      uploadDate: now,
      downloadCount: 0,
      expiryTimestamp: Timestamp.fromDate(expiryDate),
      shareToken: shareToken,
    };

    await fileRef.set(fileData);
    return { id: fileRef.id, shareToken: shareToken, expiryTimestamp: fileData.expiryTimestamp };
  },

  // Get file metadata by ID
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    const doc = await firestore.collection(COLLECTIONS.FILES).doc(fileId).get();
    return doc.exists ? (doc.data() as FileMetadata) : null;
  },

  // Get file metadata by share token
  async getFileMetadataByToken(shareToken: string): Promise<{ id: string; data: FileMetadata } | null> {
    const snapshot = await firestore.collection(COLLECTIONS.FILES)
      .where('shareToken', '==', shareToken)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, data: doc.data() as FileMetadata };
  },

  // Increment download count
  async incrementDownloadCount(fileId: string): Promise<void> {
    await firestore.collection(COLLECTIONS.FILES).doc(fileId).update({
      downloadCount: FieldValue.increment(1),
      lastDownloaded: new Date(),
    });
  },

  // Update file metadata
  async updateFileMetadata(fileId: string, data: Partial<FileMetadata>): Promise<void> {
    await firestore.collection(COLLECTIONS.FILES).doc(fileId).update(data);
  },

  // Delete file metadata
  async deleteFileMetadata(fileId: string): Promise<void> {
    await firestore.collection(COLLECTIONS.FILES).doc(fileId).delete();
  },
};

// Helper function to generate a secure share token
function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// User profile operations
export const userProfileOperations = {
  // Create a new user profile
  async createUserProfile(userId: string, data: Omit<UserProfile, 'createdAt' | 'lastLogin' | 'usedStorage'>): Promise<void> {
    const { email, ...restData } = data;
    await firestore.collection(COLLECTIONS.USER_PROFILES).doc(userId).set({
      ...restData,
      email: email,
      createdAt: new Date(),
      lastLogin: new Date(),
      usedStorage: 0,
    });
  },

  // Get user profile by ID (Firebase Auth uid)
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const doc = await firestore.collection(COLLECTIONS.USER_PROFILES).doc(userId).get();
    return doc.exists ? (doc.data() as UserProfile) : null;
  },

  // Update user profile
  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    await firestore.collection(COLLECTIONS.USER_PROFILES).doc(userId).update(data);
  },

  // Update last login timestamp
  async updateLastLogin(userId: string): Promise<void> {
    await firestore.collection(COLLECTIONS.USER_PROFILES).doc(userId).update({
      lastLogin: new Date(),
    });
  },

  // Atomically update used storage
  async updateUsedStorage(userId: string, sizeChange: number): Promise<void> {
    await firestore.collection(COLLECTIONS.USER_PROFILES).doc(userId).update({
      usedStorage: FieldValue.increment(sizeChange)
    });
  },
}; 