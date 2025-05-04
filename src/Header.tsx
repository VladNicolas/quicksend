/**
 * Header component
 * Displays the application navigation bar with branding, nav links, and auth controls
 * Handles user authentication state and provides login/signup/logout functionality
 */
import { useState } from "react";
import { Button } from "./components/ui/button";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate, Link } from 'react-router-dom';
// Removed AuthModal import as login/signup buttons are removed
import {
  Dialog, // Import Dialog components
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./components/ui/dropdown-menu";
import { User, LogOut, Files } from "lucide-react"; // Added Files, Star, Info icons

function Header() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  // State for dialogs
  const [showFeaturesDialog, setShowFeaturesDialog] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);

  // Removed modal state and handlers

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 py-4 px-6 flex items-center justify-between shadow-md bg-background border-b border-border">
      {/* Application logo/title - Wrapped in Link */}
      <Link to="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
        <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          QuickSend
        </h2>
      </Link>

      <div className="flex items-center space-x-3 md:space-x-4">
        {/* Dialog Trigger for Features - Using link variant */}
        <Dialog open={showFeaturesDialog} onOpenChange={setShowFeaturesDialog}>
          <DialogTrigger asChild>
            <Button variant={"link"} className="text-muted-foreground hover:text-foreground">Features</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              {/* Logo inside Dialog */}
              <DialogTitle className="text-center text-2xl font-extrabold mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                QuickSend Features
              </DialogTitle>
              {/* Rewritten Features Description */}
              <DialogDescription className="text-sm text-muted-foreground space-y-4 px-2">
                <p>
                  QuickSend is designed for seamless and secure file sharing. Effortlessly upload files (up to 100MB each) with our intuitive drag-and-drop interface.
                </p>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Core Functionality:</h4>
                  <ul className="list-disc list-outside pl-5 space-y-1">
                    <li>Your files are stored securely in your personal cloud space (up to 1GB).</li>
                    <li>Generate unique sharing links instantly, valid for 7 days or 100 downloads.</li>
                    <li>Robust user accounts with Email/Password or Google Sign-In options.</li>
                    <li>Easily manage your uploads and monitor storage usage in the "My Files" section.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Coming Soon:</h4>
                  <ul className="list-disc list-outside pl-5 space-y-1">
                    <li>Enhanced Security: Optional password protection for share links.</li>
                    <li>Direct Sharing: Send files directly via email to recipients.</li>
                    <li>AI Assistance: Get quick insights with AI-powered document summaries.</li>
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Dialog Trigger for Pricing - Using link variant */}
        <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
          <DialogTrigger asChild>
            <Button variant={"link"} className="text-muted-foreground hover:text-foreground">Pricing</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Simple, Transparent Pricing</DialogTitle>
              {/* Rewritten Pricing Description */}
              <DialogDescription className="text-sm text-muted-foreground pt-2">
                Enjoy the full power of QuickSend today, completely free! All currently available features,
                including secure storage and easy sharing, are provided at no cost as we build and refine the platform.
                <br/><br/>
                While we plan to introduce advanced, premium features in the future to support QuickSend's growth,
                our core commitment is to provide a generous and valuable free experience.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Removed Resources Button */}

        {/* Conditional rendering for logged-in users */}
        {currentUser ? (
          <>
            {/* My Files Button - Navigate onClick */}
            <Button
              variant="outline"
              className="flex items-center gap-2 text-primary border-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => navigate('/my-files')}
            >
              <Files className="h-4 w-4" />
              My Files
            </Button>

            {/* User Dropdown Menu - Using ghost variant for trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 focus-visible:ring-0 focus-visible:ring-offset-0">
                  <User className="h-4 w-4" />
                  {/* Display user email prefix or placeholder */}
                  {currentUser.email?.split('@')[0] || 'User'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Add user email label */}
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground truncate">
                  {currentUser.email || 'No email available'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:bg-red-100 focus:text-red-700">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          // No buttons shown when logged out, handled by LandingPage
          null
        )}
      </div>

      {/* Removed AuthModal as it's now on LandingPage */}
    </nav>
  );
}

export default Header;