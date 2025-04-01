/**
 * Header component
 * Displays the application navigation bar with branding, nav links, and auth controls
 * Handles user authentication state and provides login/signup/logout functionality
 */
import { useState } from "react";
import { Button } from "./components/ui/button";
import { useAuth } from "./contexts/AuthContext";
import { AuthModal } from "./components/auth/AuthModal";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";

function Header() {
  // Get authentication context for user state and auth functions
  const { currentUser, logout } = useAuth();
  // State for controlling the authentication modal visibility
  const [showAuthModal, setShowAuthModal] = useState(false);
  // State to determine which view to show in the auth modal (login or signup)
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  /**
   * Opens the authentication modal with the login view
   */
  const handleOpenLoginModal = () => {
    setAuthView('login');
    setShowAuthModal(true);
  };

  /**
   * Opens the authentication modal with the signup view
   */
  const handleOpenSignupModal = () => {
    setAuthView('signup');
    setShowAuthModal(true);
  };

  /**
   * Logs out the current user
   */
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 py-4 px-5 flex items-center justify-between shadow-lg bg-background">
      {/* Application logo/title */}
      <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">QuickSend</h2>
      
      <div className="flex space-x-4">
        {/* Navigation links */}
        <Button variant={"ghost"}>Features</Button>
        <Button variant={"ghost"}>Pricing</Button>
        <Button variant={"ghost"}>Resources</Button>
        
        {/* Conditional rendering based on authentication state */}
        {currentUser ? (
          // User is logged in - show user dropdown menu
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {currentUser.email?.split('@')[0]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>My Files</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // User is not logged in - show login/signup buttons
          <>
            <Button variant={"default"} onClick={handleOpenSignupModal}>Sign Up</Button>
            <Button variant={"link"} onClick={handleOpenLoginModal}>Log In</Button>
          </>
        )}
      </div>

      {/* Authentication modal component */}
      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
        defaultView={authView}
      />
    </nav>
  );
}

export default Header;