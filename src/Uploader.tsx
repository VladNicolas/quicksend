/**
 * Uploader component
 * Provides the main file upload functionality for the application
 * Allows users to select files via drag-and-drop or file browser
 * Displays upload progress and opens share dialog upon completion
 */
import { useState, useEffect, DragEvent } from "react"
import { AxiosProgressEvent, AxiosError } from "axios"
import { getAuth, onAuthStateChanged, User } from "firebase/auth"
import firebaseApp from "@/lib/firebase"
import api from "./lib/api" // Changed from @/lib/api to relative path
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Upload } from "lucide-react"
import { ShareDialog } from "./ShareDialog"
import { Progress } from "./components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils" // Import cn utility for conditional classes

// Type definition for tracking the upload state
type UploadState = "idle" | "uploading" | "complete" | "error"

// Define the expected API response structure
interface UploadResponse {
  message: string
  shareToken: string
  expiryDate: string
}

export function Uploader() {
  // State to store the selected files
  const [files, setFiles] = useState<FileList | null>(null)
  // State to track the current upload status
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  // State to track upload progress percentage
  const [uploadProgress, setUploadProgress] = useState(0)
  // State to control the visibility of the share dialog
  const [showShareDialog, setShowShareDialog] = useState(false)
  // State to store the share token after successful upload
  const [shareToken, setShareToken] = useState<string | null>(null)
  // State to store any upload error messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // State to store the current Firebase user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false); // State for drag feedback

  // Log state on every render for debugging
  console.log('Render - UploadState:', uploadState, 'ErrorMessage:', errorMessage);

  // Effect to listen for auth state changes
  useEffect(() => {
    const auth = getAuth(firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      // Optionally reset uploader if user logs out during interaction
      if (!user) {
         resetUploader();
      }
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  /**
   * Handles file selection from the file input OR drag-and-drop
   */
  const processSelectedFiles = (selectedFiles: FileList | null) => {
    console.log('processSelectedFiles called');
    // Clear previous error message on new attempt
    setErrorMessage(null);
    // Reset to idle if coming from error state
    if (uploadState === 'error') {
        console.log('Resetting state from error to idle');
        setUploadState('idle');
    }

    if (selectedFiles && selectedFiles.length > 0) {
      if (!currentUser) {
        console.error('Error: No user logged in for upload attempt');
        setErrorMessage("Please log in to upload files.");
        setUploadState("error");
        return;
      }
      // Client-side file size validation (10MB)
      const maxSize = 10 * 1024 * 1024;
      const fileToUpload = selectedFiles[0];
      if (fileToUpload.size > maxSize) {
          const errorMsg = `File size exceeds the 10MB limit. Yours is ${(fileToUpload.size / 1024 / 1024).toFixed(1)}MB.`;
          console.log('Setting file size error:', errorMsg);
          setErrorMessage(errorMsg);
          setUploadState("error");
          console.log('Exiting processSelectedFiles due to size error');
          return;
      }

      console.log('File validation passed, proceeding to upload');
      setFiles(selectedFiles);
      handleUpload(selectedFiles);
    }
  };

  // Update handleFileSelect to use the common processing function
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFiles(event.target.files);
  };

  /**
   * Handles the actual file upload process using our API client
   */
  const handleUpload = async (selectedFiles: FileList) => {
    if (!selectedFiles || selectedFiles.length === 0) return
    if (!currentUser) {
      setErrorMessage("Authentication error: No user logged in.")
      setUploadState("error")
      return
    }

    const fileToUpload = selectedFiles[0]

    // Reset state before starting upload
    setUploadState("uploading")
    setUploadProgress(0)
    setErrorMessage(null)
    setShareToken(null)

    const formData = new FormData()
    formData.append("file", fileToUpload)

    try {
      const response = await api.post<UploadResponse>("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total ?? 1)
          )
          setUploadProgress(percentCompleted)
        },
      })

      if (response.status === 201 && response.data.shareToken) {
        setShareToken(response.data.shareToken)
        setUploadState("complete")
        setShowShareDialog(true)
      } else {
        throw new Error(response.data.message || "Upload failed with unexpected status.")
      }
    } catch (error: unknown) {
      console.error("Upload error:", error)
      let message = "An unknown error occurred during upload."
      if (error instanceof AxiosError && error.response?.data?.error) {
        message = error.response.data.error
      } else if (error instanceof Error) {
        message = error.message
      }
      setErrorMessage(message)
      setUploadState("error")
    }
  }

  // Helper function to reset the uploader state
  const resetUploader = () => {
    console.log('resetUploader called!'); // Log when called
    setFiles(null)
    setUploadState("idle")
    setUploadProgress(0)
    setErrorMessage(null)
    setShareToken(null)
    setShowShareDialog(false)
  }

  // --- Drag and Drop Handlers --- START
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
    event.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('handleDragLeave fired'); // Log when fired
    // Check if the leave event target is outside the dropzone area
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
       console.log('handleDragLeave ignored (leaving to child)');
       return; // Ignore if leaving to a child element
    }
    console.log('handleDragLeave setting isDraggingOver = false');
    setIsDraggingOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('handleDrop fired');
    setIsDraggingOver(false);

    const droppedFiles = event.dataTransfer.files;
    processSelectedFiles(droppedFiles);
  };
  // --- Drag and Drop Handlers --- END

  // Determine if input should be disabled
  const isUploading = uploadState === 'uploading';

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Drop your files here</CardTitle>
          <CardDescription>Secure, fast, and free file sharing</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Upload Failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed border-primary/25 rounded-lg bg-secondary/50 transition-colors",
              isDraggingOver ? "border-primary bg-primary/10" : "hover:border-primary/50"
            )}
          >
            <div className="flex flex-col items-center justify-center py-16 px-4 pointer-events-none">
              {isUploading ? (
                // Show progress indicator during upload
                <div className="w-full max-w-xs space-y-4">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Uploading {files && files[0] ? `"${files[0].name}"` : 'file'}...
                  </p>
                </div>
              ) : uploadState === "complete" ? (
                // Show completion message and button to upload another
                <div className="text-center">
                  <p className="text-lg font-medium mb-4">Upload Complete!</p>
                  <Button onClick={resetUploader}>Upload Another File</Button>
                </div>
              ) : (
                // Show file selection UI (idle or error state)
                <>
                  <div className="rounded-full bg-primary/10 p-4 mb-4">
                    <Upload className={cn("h-8 w-8 text-primary", isDraggingOver && "text-primary-foreground")} />
                  </div>
                  <p className={cn("text-lg font-medium mb-2", isDraggingOver && "text-primary-foreground")}>
                    Drag and drop your files here
                  </p>
                  <p className={cn("text-sm text-muted-foreground mb-6", isDraggingOver && "text-primary-foreground/80")}>
                    or click to select files from your computer
                  </p>
                  {/* File selection button - wrap in div to prevent pointer-events issue */}
                  <div className="pointer-events-auto">
                    <Button size="lg" className="relative">
                      Choose Files
                      <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        multiple
                        onChange={handleFileSelect}
                        disabled={isUploading}
                      />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Maximum file size: 10MB
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share dialog shown after upload completion */}
      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        fileCount={files?.length ?? 0}
        shareToken={shareToken}
        onClose={resetUploader}
      />
    </>
  )
}