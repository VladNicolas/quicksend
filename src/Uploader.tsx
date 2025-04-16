/**
 * Uploader component
 * Provides the main file upload functionality for the application
 * Allows users to select files via drag-and-drop or file browser
 * Displays upload progress and opens share dialog upon completion
 */
import { useState, useEffect } from "react"
import axios, { AxiosProgressEvent } from "axios"
import { getAuth, onAuthStateChanged, User } from "firebase/auth"; // Import Firebase auth functions
import firebaseApp from "@/lib/firebase"; // Corrected import path and use default import
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
   * Handles file selection from the file input
   * Triggers the actual upload when files are selected
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      // Check if user is logged in before allowing selection/upload
      if (!currentUser) {
        setErrorMessage("Please log in to upload files.");
        setUploadState("error");
        return;
      }
      setFiles(selectedFiles)
      handleUpload(selectedFiles)
    }
  }

  /**
   * Handles the actual file upload process using Axios
   */
  const handleUpload = async (selectedFiles: FileList) => {
    if (!selectedFiles || selectedFiles.length === 0) return
    if (!currentUser) {
      setErrorMessage("Authentication error: No user logged in.");
      setUploadState("error");
      return; // Should not happen if checked in handleFileSelect, but good practice
    }

    // For simplicity, we'll upload the first file only.
    // TODO: Implement multi-file upload logic if needed.
    const fileToUpload = selectedFiles[0]

    // Reset state before starting upload
    setUploadState("uploading")
    setUploadProgress(0)
    setErrorMessage(null)
    setShareToken(null)

    const formData = new FormData()
    formData.append("file", fileToUpload)

    try {
      // Get the ID token
      const idToken = await currentUser.getIdToken();

      const response = await axios.post<UploadResponse>("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${idToken}` // Add Authorization header
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
        // Handle unexpected success response
        throw new Error(response.data.message || "Upload failed with unexpected status.")
      }
    } catch (error) {
      console.error("Upload error:", error)
      let message = "An unknown error occurred during upload."
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.error || error.message
      } else if (error instanceof Error) {
        message = error.message
      }
      setErrorMessage(message)
      setUploadState("error")
    }
  }

  // Helper function to reset the uploader state
  const resetUploader = () => {
    setFiles(null)
    setUploadState("idle")
    setUploadProgress(0)
    setErrorMessage(null)
    setShareToken(null)
    setShowShareDialog(false)
  }

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
          <div className="border-2 border-dashed border-primary/25 rounded-lg bg-secondary/50 transition-colors hover:border-primary/50">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              {uploadState === "uploading" ? (
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
                  {/* Upload icon */}
                  <div className="rounded-full bg-primary/10 p-4 mb-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-lg font-medium mb-2">
                    Drag and drop your files here
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    or click to select files from your computer
                  </p>
                  {/* File selection button with hidden input */}
                  <Button size="lg" className="relative">
                    Choose Files
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      multiple
                      onChange={handleFileSelect}
                    />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-4">
                    Maximum file size: 100MB
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