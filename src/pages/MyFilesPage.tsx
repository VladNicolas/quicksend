import { useState, useEffect } from 'react';
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
  previewUrl?: string; // Add optional preview URL
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

  // --- MODIFIED: Implement actual delete handler ---
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    // Optional: Add a confirmation dialog here
    // if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
    //   return;
    // }

    if (!currentUser) {
      setError("Cannot delete file: User not authenticated.");
      return;
    }

    try {
      const idToken = await currentUser.getIdToken();
      await axios.delete(`/api/files/${fileId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      // Remove the file from the local state
      setFiles(currentFiles => currentFiles.filter(file => file.id !== fileId));
      
      // TODO: Optionally refresh storageInfo if needed, or rely on backend to have updated it
      // For now, we assume the change is small enough not to warrant immediate refresh

      console.log(`Successfully initiated deletion for file: ${fileName} (ID: ${fileId})`);
      // Optionally show a success notification

    } catch (err) {
      console.error(`Error deleting file ${fileId}:`, err);
      let message = "Failed to delete file.";
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        message = err.response.data.error;
      }
      setError(message); // Show error to the user
      // Optionally show an error notification
    }
  };
  // --- END MODIFICATION ---

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