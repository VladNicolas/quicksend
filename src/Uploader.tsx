/**
 * Uploader component
 * Provides the main file upload functionality for the application
 * Allows users to select files via drag-and-drop or file browser
 * Displays upload progress and opens share dialog upon completion
 */
import { useState } from "react"
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

// Type definition for tracking the upload state
type UploadState = "idle" | "uploading" | "complete"

export function Uploader() {
  // State to store the selected files
  const [files, setFiles] = useState<FileList | null>(null)
  // State to track the current upload status
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  // State to track upload progress percentage
  const [uploadProgress, setUploadProgress] = useState(0)
  // State to control the visibility of the share dialog
  const [showShareDialog, setShowShareDialog] = useState(false)

  /**
   * Handles file selection from the file input
   * Triggers the upload simulation when files are selected
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(selectedFiles)
      simulateUpload()
    }
  }

  /**
   * Simulates the file upload process
   * Incrementally updates progress and shows share dialog when complete
   * Note: This is a mock implementation; real implementation would use API calls
   */
  const simulateUpload = () => {
    setUploadState("uploading")
    setUploadProgress(0)
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploadState("complete")
          setShowShareDialog(true)
          return 100
        }
        return prev + 10
      })
    }, 150)
  }

  return (
    <>
      <Card className="w-full max-w-3xl mx-auto border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Drop your files here</CardTitle>
          <CardDescription>Secure, fast, and free file sharing</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Upload area with drag-and-drop functionality */}
          <div className="border-2 border-dashed border-primary/25 rounded-lg bg-secondary/50 transition-colors hover:border-primary/50">
            <div className="flex flex-col items-center justify-center py-16 px-4">
              {uploadState === "uploading" ? (
                // Show progress indicator during upload
                <div className="w-full max-w-xs space-y-4">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Uploading {files?.length} file{files?.length !== 1 ? 's' : ''}...
                  </p>
                </div>
              ) : (
                // Show file selection UI when not uploading
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
      />
    </>
  )
}