import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Login } from './Login';
import { Signup } from './Signup';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultView?: 'login' | 'signup';
}

export function AuthModal({ open, onOpenChange, defaultView = 'login' }: AuthModalProps) {
  const [view, setView] = useState<'login' | 'signup'>(defaultView);

  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  const toggleView = () => {
    setView(view === 'login' ? 'signup' : 'login');
  };

  const handleAuthSuccess = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {view === 'login' ? (
          <Login onToggleForm={toggleView} onSuccess={handleAuthSuccess} />
        ) : (
          <Signup onToggleForm={toggleView} onSuccess={handleAuthSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
} 