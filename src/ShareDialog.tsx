/**
 * ShareDialog component
 * Modal dialog for sharing files after they've been uploaded
 * Provides options to share via link or email
 */
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Link, Mail, Check, Copy } from "lucide-react"
import { useState, useEffect, useRef } from "react"
// import { Textarea } from "@/components/ui/textarea"; // Import Textarea if needed for custom message later - REMOVED
import api from './lib/api'
import { getAuth } from "firebase/auth";
import firebaseApp from "./lib/firebase"; // Assuming this is the correct path to your firebase app instance

/**
 * Props interface for the ShareDialog component
 */
interface ShareDialogProps {
  open: boolean               // Controls dialog visibility
  onOpenChange: (open: boolean) => void  // Handler for dialog open state changes
  fileCount: number           // Number of files being shared
  shareToken: string | null    // Added shareToken prop
  onClose?: () => void         // Added optional onClose callback
}

export function ShareDialog({
  open,
  onOpenChange,
  fileCount,
  shareToken,
  onClose,
}: ShareDialogProps) {
  // State for the email recipient address
  const [email, setEmail] = useState("")
  // State to track whether link was successfully copied
  const [copySuccess, setCopySuccess] = useState(false)
  // State to hold the constructed share link
  const [shareLink, setShareLink] = useState("")
  // Ref to track if the dialog was previously open
  const wasOpenRef = useRef(false)
  // New state for email sending
  const [isSending, setIsSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Effect to construct the share link when shareToken changes
  useEffect(() => {
    if (shareToken) {
      // Construct the full URL using the backend service URL
      const backendBaseUrl = "https://quicksend-backend-service-627959729856.us-central1.run.app" // Use backend URL
      setShareLink(`${backendBaseUrl}/api/download/${shareToken}`)
    } else {
      setShareLink("") // Reset if no token
    }
  }, [shareToken])

  // Effect to call onClose ONLY when closing
  useEffect(() => {
    // Only call onClose if the dialog was open and is now closing
    if (wasOpenRef.current && !open && onClose) {
      const timer = setTimeout(() => {
        onClose()
      }, 150)
      wasOpenRef.current = false // Update ref after triggering close logic
      return () => clearTimeout(timer)
    }
    // Update the ref if the open state changes to true
    if (open) {
      wasOpenRef.current = true
    }
  }, [open, onClose])

  /**
   * Copies the share link to clipboard and shows success message
   */
  const handleCopyLink = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy link: ", err)
      // Optionally show an error message to the user
      // For example: setEmailStatus({ type: 'error', message: 'Failed to copy.' });
    }
  }

  /**
   * Handles email form submission
   * TODO: Replace mock with actual API call to backend for sending email
   */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shareLink || !email || !shareToken) { 
        setEmailStatus({ type: 'error', message: 'Cannot send email: share information is missing.' });
        return;
    }

    setIsSending(true);
    setEmailStatus(null);

    try {
      const auth = getAuth(firebaseApp);
      const user = auth.currentUser;

      if (!user) {
        setEmailStatus({ type: 'error', message: 'Authentication error: User not signed in.' });
        setIsSending(false);
        return;
      }

      let idToken;
      try {
        idToken = await user.getIdToken();
      } catch (tokenError) {
        console.error("Error getting ID token for share email:", tokenError);
        setEmailStatus({ type: 'error', message: 'Authentication error: Could not get user credentials.' });
        setIsSending(false);
        return;
      }

      if (!idToken) { // Should be caught by the try/catch, but as an extra safeguard
        setEmailStatus({ type: 'error', message: 'Authentication error: Failed to obtain user credentials.' });
        setIsSending(false);
        return;
      }
      
      await api.post('/api/share/email', { 
        recipientEmail: email, 
        shareToken: shareToken 
      }, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          // Content-Type is likely application/json by default for this api.post, so might not be needed to set explicitly
          // If backend expects a different Content-Type for this specific endpoint, set it here.
        }
      });

      setEmailStatus({ type: 'success', message: 'Email sent successfully!' });
      setEmail(""); // Clear email input on success
      // Optional: Close dialog after a delay
      // setTimeout(() => {
      //   if (open) onOpenChange(false);
      // }, 2000);

    } catch (error: any) {
      console.error("Email sending error:", error);
      let message = "Failed to send email. Please try again.";
      if (error.response && error.response.data && error.response.data.error) {
        message = error.response.data.error;
      } else if (error.message) {
        message = error.message;
      }
      setEmailStatus({ type: 'error', message });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {fileCount} file{fileCount !== 1 ? 's' : ''}</DialogTitle>
        </DialogHeader>
        
        {/* Tabs for different sharing methods */}
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2">
            {/* Link sharing tab */}
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Get Link
            </TabsTrigger>
            
            {/* Email sharing tab */}
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Email
            </TabsTrigger>
          </TabsList>
          
          {/* Link sharing content */}
          <TabsContent value="link" className="mt-4">
            <div className="flex flex-col space-y-4">
              <p className="text-sm text-muted-foreground">
                Anyone with the link can download the file{fileCount !== 1 ? 's' : ''}.
              </p>
              <div className="flex space-x-2">
                <Input
                  id="link"
                  readOnly
                  value={shareLink || "Generating link..."}
                  aria-label="Shareable link"
                />
                <Button variant="outline" size="icon" onClick={handleCopyLink} disabled={!shareLink}>
                  {copySuccess ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="sr-only">{copySuccess ? "Copied" : "Copy link"}</span>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Link expires in 7 days or after 100 downloads.
              </p>
            </div>
          </TabsContent>
          
          {/* Email sharing content */}
          <TabsContent value="email" className="mt-4">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter recipient's email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSending || !email}>
                {isSending ? "Sending..." : "Send Link"}
              </Button>
              {emailStatus && (
                <p className={`text-sm mt-2 ${emailStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {emailStatus.message}
                </p>
              )}
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 