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
  const [isLoading, setIsLoading] = useState(true); // Manages loading for initial fetch and subsequent refreshes
  const [error, setError] = useState<string | null>(null);

  // Extracted data fetching logic
  const fetchMyFilesData = async () => {
    if (!currentUser) {
      // Set loading to false here because we are not actually fetching if no user.
      // Error state will be handled by UI based on currentUser presence in other parts.
      setIsLoading(false); 
      setFiles([]); // Clear files if user logs out or is not present
      setStorageInfo(null); // Clear storage info
      // setError("User not authenticated."); // Can be set, or rely on UI to show login prompt
      return;
    }

    // For initial load or full refresh, set loading true.
    // If we wanted a softer loading for refetches (e.g. after delete), 
    // we could have a separate isLoadingRefetch state.
    setIsLoading(true); 
    setError(null);

    try {
      const idToken = await currentUser.getIdToken();
      const backendBaseUrl = import.meta.env.VITE_BACKEND_PUBLIC_URL || "https://quicksend-backend-service-627959729856.us-central1.run.app";
      const response = await axios.get<MyFilesResponse>(`${backendBaseUrl}/api/my-files`, {
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
      setFiles([]); // Clear files on error to avoid showing stale data
      setStorageInfo(null); // Clear storage info on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyFilesData(); // Call on initial mount and when currentUser changes
  }, [currentUser]);

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!currentUser) {
      setError("Cannot delete file: User not authenticated.");
      return;
    }

    // Consider adding a loading state specific to the delete operation if it feels slow
    // For example, by disabling the delete button or showing a spinner on the card.

    try {
      const idToken = await currentUser.getIdToken();
      const backendBaseUrl = import.meta.env.VITE_BACKEND_PUBLIC_URL || "https://quicksend-backend-service-627959729856.us-central1.run.app";
      await axios.delete(`${backendBaseUrl}/api/files/${fileId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      console.log(`Successfully deleted file: ${fileName} (ID: ${fileId})`);
      // Re-fetch all data to update file list and storage info
      await fetchMyFilesData(); 
      // Optionally show a success notification (e.g., toast)

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

  if (isLoading && files.length === 0 && !error) { // Show full page skeleton only on initial load without data
    // Render Skeleton Layout
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <h1 className="text-3xl font-bold">My Files</h1>
        <StorageInfoSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <FileCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error && files.length === 0) { // Show error prominently if it prevents loading any files
    return <div className="container mx-auto p-6 text-red-500">Error: {error}</div>;
  }
  
  // If loading is true but we have some files (e.g. during a refetch after delete), 
  // we might want a less intrusive loading indicator, or just let the content update.
  // The current setup will show the full skeleton if isLoading is true & no files, 
  // otherwise it proceeds to render the content which will update once isLoading is false.

  // Calculate storage percentage
  const storagePercentage = storageInfo && storageInfo.storageQuota > 0
    ? Math.round((storageInfo.usedStorage / storageInfo.storageQuota) * 100)
    : 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold">My Files</h1>

      {/* Display error inline if it occurs during a refetch and we already have some data */}
      {error && files.length > 0 && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Storage Info Section */}
      {(storageInfo || isLoading) && ( // Show skeleton if loading and no storageInfo yet
        isLoading && !storageInfo ? <StorageInfoSkeleton /> : storageInfo && (
          <div className="p-4 border rounded-lg bg-card text-card-foreground">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Storage Usage</span>
              <span className="text-sm text-muted-foreground">
                {formatBytes(storageInfo.usedStorage)} / {formatBytes(storageInfo.storageQuota)}
              </span>
            </div>
            <Progress value={storagePercentage} aria-label={`${storagePercentage}% storage used`} />
          </div>
        )
      )}

      {/* Files Grid Section */}
      {isLoading && files.length === 0 ? (
        // This case is handled by the full page skeleton above
        null 
      ) : files.length === 0 && !isLoading ? (
          <div className="col-span-full text-center text-muted-foreground py-8">
            You haven't uploaded any files yet.
          </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map(file => (
            <FileCard key={file.id} file={file} onDelete={handleDeleteFile} />
          ))}
        </div>
      )}
    </div>
  );
} 