import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SignupProps {
  onToggleForm: () => void;
  onSuccess: () => void;
}

export function Signup({ onToggleForm, onSuccess }: SignupProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup, loginWithGoogle } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    if (password.length < 6) {
      return setError('Password should be at least 6 characters');
    }
    
    try {
      setError('');
      setLoading(true);
      await signup(email, password);
      onSuccess();
    } catch (err: any) {
      setError(`Failed to create an account: ${err.message || 'Unknown error'}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      setError(`Failed to sign up with Google: ${err.message || 'Unknown error'}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Sign Up</CardTitle>
        <CardDescription>Create a new account to use QuickSend</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </div>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input 
              id="confirm-password" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            Sign Up
          </Button>
        </form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleGoogleSignUp}
          disabled={loading}
        >
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2" aria-hidden="true">
              <path
                d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0353 3.12C17.9503 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70998C6.21528 6.86 8.87028 4.75 12.0003 4.75Z"
                fill="#EA4335"
              />
              <path
                d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                fill="#4285F4"
              />
              <path
                d="M5.26498 14.2899C5.02498 13.5699 4.88498 12.7999 4.88498 11.9999C4.88498 11.1999 5.01998 10.4299 5.26498 9.70993L1.27498 6.60992C0.45998 8.22992 0.00497954 10.0599 0.00497954 11.9999C0.00497954 13.9399 0.45998 15.7699 1.27498 17.3899L5.26498 14.2899Z"
                fill="#FBBC05"
              />
              <path
                d="M12.0004 24C15.2404 24 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.2154 17.135 5.2704 14.285L1.2804 17.385C3.2554 21.305 7.3104 24 12.0004 24Z"
                fill="#34A853"
              />
            </svg>
            <span className="inline-block leading-none">Google</span>
          </div>
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="link" onClick={onToggleForm}>
          Already have an account? Log In
        </Button>
      </CardFooter>
    </Card>
  );
} 