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
import { Link, Mail } from "lucide-react"
import { useState } from "react"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileCount: number
}

export function ShareDialog({ open, onOpenChange, fileCount }: ShareDialogProps) {
  const [email, setEmail] = useState("")
  const [copySuccess, setCopySuccess] = useState(false)
  
  // Mock function to simulate link generation
  const shareLink = "https://quicksend.example/f/abc123"

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock email sending
    console.log("Sending email to:", email)
    setEmail("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {fileCount} file{fileCount !== 1 ? 's' : ''}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2">
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Get Link
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Email
            </TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="mt-4">
            <div className="flex flex-col space-y-4">
              <div className="flex space-x-2">
                <Input
                  readOnly
                  value={shareLink}
                  className="flex-1"
                />
                <Button onClick={handleCopyLink}>
                  {copySuccess ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Anyone with this link can download these files for the next 7 days
              </p>
            </div>
          </TabsContent>
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