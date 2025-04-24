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

  // Effect to construct the share link when shareToken changes
  useEffect(() => {
    if (shareToken) {
      // Construct the full URL based on the current origin
      const baseUrl = window.location.origin
      setShareLink(`${baseUrl}/api/download/${shareToken}`)
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
    }
  }

  /**
   * Handles email form submission
   * TODO: Replace mock with actual API call to backend for sending email
   */
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!shareLink) return
    // Mock email sending
    console.log(`Simulating email send to: ${email} with link: ${shareLink}`)
    // In a real app, call backend API here:
    // await axios.post('/api/share/email', { recipient: email, shareToken });
    setEmail("")
    onOpenChange(false) // Close dialog after submission
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
              <Button type="submit" className="w-full">
                Send Link
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 