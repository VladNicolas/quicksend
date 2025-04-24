import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { FileCard } from '@/components/files/FileCard';
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { StorageInfoSkeleton } from "@/components/skeletons/StorageInfoSkeleton";
import { FileCardSkeleton } from "@/components/skeletons/FileCardSkeleton";

// Define interfaces for the expected API response structure
interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string; // Dates will likely be ISO strings
  expiryTimestamp: string;
  downloadCount: number;
  shareToken: string;
}

interface StorageInfo {
  usedStorage: number;
  storageQuota: number;
}

interface MyFilesResponse {
  files: FileData[];
  storage: StorageInfo;
}

export function MyFilesPage() {
  const { currentUser } = useAuth();
  const [files, setFiles] = useState<FileData[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyFiles = async () => {
      if (!currentUser) {
        setIsLoading(false);
        setError("User not authenticated.");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const idToken = await currentUser.getIdToken();
        const response = await axios.get<MyFilesResponse>('/api/my-files', {
          headers: { Authorization: `Bearer ${idToken}` },
        });

        setFiles(response.data.files);
        setStorageInfo(response.data.storage);
      } catch (err) {
        console.error("Error fetching files:", err);
        let message = "Failed to load files.";
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          message = err.response.data.error;
        }
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyFiles();
  }, [currentUser]);

  // Placeholder delete handler
  const handleDeleteFile = (fileId: string, fileName: string) => {
    console.log(`TODO: Implement deletion for file: ${fileName} (ID: ${fileId})`);
    // Later (Step 5) this will call the DELETE /api/files/{fileId} endpoint
    // and update the local 'files' state on success
    // alert(`Deletion for ${fileName} not implemented yet.`);
  };

  if (isLoading) {
    // Render Skeleton Layout
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <h1 className="text-3xl font-bold">My Files</h1>
        <StorageInfoSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Render multiple file card skeletons */}
          {Array.from({ length: 8 }).map((_, index) => (
            <FileCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto p-6 text-red-500">Error: {error}</div>;
  }

  // Calculate storage percentage
  const storagePercentage = storageInfo && storageInfo.storageQuota > 0
    ? Math.round((storageInfo.usedStorage / storageInfo.storageQuota) * 100)
    : 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold">My Files</h1>

      {/* Storage Info Section */}
      {storageInfo && (
        <div className="p-4 border rounded-lg bg-card text-card-foreground">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Storage Usage</span>
            <span className="text-sm text-muted-foreground">
              {formatBytes(storageInfo.usedStorage)} / {formatBytes(storageInfo.storageQuota)}
            </span>
          </div>
          <Progress value={storagePercentage} aria-label={`${storagePercentage}% storage used`} />
        </div>
      )}

      {/* Files Grid Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-8">
            You haven't uploaded any files yet.
          </div>
        ) : (
          files.map(file => (
            <FileCard key={file.id} file={file} onDelete={handleDeleteFile} />
          ))
        )}
      </div>
    </div>
  );
} 