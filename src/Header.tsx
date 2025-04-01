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
  const { currentUser, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const handleOpenLoginModal = () => {
    setAuthView('login');
    setShowAuthModal(true);
  };

  const handleOpenSignupModal = () => {
    setAuthView('signup');
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 py-4 px-5 flex items-center justify-between shadow-lg bg-background">
      <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">QuickSend</h2>
      <div className="flex space-x-4">
        <Button variant={"ghost"}>Features</Button>
        <Button variant={"ghost"}>Pricing</Button>
        <Button variant={"ghost"}>Resources</Button>
        
        {currentUser ? (
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
          <>
            <Button variant={"default"} onClick={handleOpenSignupModal}>Sign Up</Button>
            <Button variant={"link"} onClick={handleOpenLoginModal}>Log In</Button>
          </>
        )}
      </div>

      <AuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal}
        defaultView={authView}
      />
    </nav>
  );
}

export default Header;