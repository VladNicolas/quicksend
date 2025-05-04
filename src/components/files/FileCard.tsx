import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils"; // Import the helper
import {
  File as FileIcon, // Generic file
  FileImage, // Images
  FileText, // Text, potentially PDF/Word
  FileAudio, // Audio
  FileVideo, // Video
  Copy, // Copy link
  Trash2, // Delete
  CalendarClock, // Expiry
  DownloadCloud, // Downloads
} from "lucide-react";
import { cn } from "@/lib/utils"; // Import cn utility

// --- REMOVED react-pdf setup ---
// import { Document, Page, pdfjs } from 'react-pdf';
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
// import 'react-pdf/dist/esm/Page/TextLayer.css';
// pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
// --- end REMOVED react-pdf setup ---

// Interface matching the data structure from MyFilesPage
interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  expiryTimestamp: string;
  downloadCount: number;
  shareToken: string;
  previewUrl?: string; // Add optional preview URL
}

interface FileCardProps {
  file: FileData;
  onDelete: (fileId: string, fileName: string) => void; // Callback for delete
}

// Helper to get file type icon
const getFileIcon = (mimeType: string): React.ReactNode => {
  if (mimeType.startsWith('image/')) return <FileImage className="h-8 w-8 text-primary" />;
  if (mimeType.startsWith('video/')) return <FileVideo className="h-8 w-8 text-blue-500" />;
  if (mimeType.startsWith('audio/')) return <FileAudio className="h-8 w-8 text-green-500" />;
  if (mimeType === 'application/pdf') return <FileText className="h-8 w-8 text-gray-500" />;
  if (mimeType.includes('text')) return <FileText className="h-8 w-8 text-gray-500" />;
  // Add more specific types if needed (e.g., Word, Excel)
  return <FileIcon className="h-8 w-8 text-muted-foreground" />; // Default
};

// --- SIMPLIFIED Component: FilePreview ---
const FilePreview = ({ file }: { file: FileData }) => {
  // Check for preview URL and image type
  if (file.previewUrl && file.type.startsWith('image/')) {
    return (
      <img 
        src={file.previewUrl} 
        alt={`Preview of ${file.name}`}
        className="h-12 w-12 object-cover rounded-sm" // Style the image preview
        // Optional: Add onError fallback if needed, but less critical without PDF complexity
        // onError={(e) => { (e.target as HTMLImageElement).src = '/path/to/generic-image-icon.png'; }}
      />
    );
  }

  // Fallback to icon if no preview URL or not an image
  return getFileIcon(file.type);
};
// --- End FilePreview Component ---

export function FileCard({ file, onDelete }: FileCardProps) {

  const handleCopyLink = () => {
    const link = `${window.location.origin}/api/download/${file.shareToken}`;
    navigator.clipboard.writeText(link).then(() => {
      // TODO: Show copy success feedback (e.g., toast notification)
      console.log("Link copied:", link);
    }).catch(err => {
      console.error("Failed to copy link:", err);
      // TODO: Show error feedback
    });
  };

  const handleDeleteClick = () => {
    // Ask for confirmation before deleting
    if (window.confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
      onDelete(file.id, file.name); // Pass ID and name to parent for handling
    }
  };

  const expiryDate = new Date(file.expiryTimestamp);
  const isExpired = expiryDate < new Date();

  return (
    <Card className={cn(
        "flex flex-col justify-between transition-opacity",
        isExpired && "opacity-60" // Apply opacity if expired
      )}>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
        <div className="flex-shrink-0">
          {/* Use the new FilePreview component */}
          <FilePreview file={file} /> 
        </div>
        <div className="flex-1 overflow-hidden">
          <CardTitle className="text-base font-medium truncate" title={file.name}>
            {file.name}
          </CardTitle>
          <CardDescription className="text-xs">
            {formatBytes(file.size)}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-1 pt-0 pb-3">
        <div className="flex items-center gap-1.5" title={`Uploaded on: ${new Date(file.uploadDate).toLocaleString()}`}>
            <DownloadCloud className="h-3 w-3" /> 
            <span>{file.downloadCount} downloads</span>
        </div>
        <div className="flex items-center gap-1.5" title={expiryDate.toLocaleString()}>
            <CalendarClock className="h-3 w-3" /> 
            <span>{isExpired ? "Expired" : `Expires ${expiryDate.toLocaleDateString()}`}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-0 border-t pt-3">
        {/* TODO: Add Summary button conditionally later */}
        <Button
           variant="ghost"
           size="icon"
           onClick={handleCopyLink}
           title={isExpired ? "Link expired" : "Copy share link"}
           disabled={isExpired} // Disable copy button if expired
           aria-disabled={isExpired}
         >
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copy Link</span>
        </Button>
        <Button
           variant="ghost"
           size="icon"
           onClick={handleDeleteClick}
           title="Delete file"
           className="text-red-500 hover:bg-red-100 hover:text-red-600"
           // Delete button remains enabled even if expired
         >
          <Trash2 className="h-4 w-4" />
           <span className="sr-only">Delete File</span>
        </Button>
      </CardFooter>
    </Card>
  );
} 