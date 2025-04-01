/**
 * Authentication Context Provider
 * Manages user authentication state and provides authentication methods
 * Uses Firebase Authentication for user management
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

/**
 * Auth context type definition
 * Defines the shape of the authentication context value
 */
interface AuthContextType {
  currentUser: User | null;        // Current authenticated user
  loading: boolean;                // Loading state while determining auth status
  signup: (email: string, password: string) => Promise<void>;  // User registration
  login: (email: string, password: string) => Promise<void>;   // Email/password login
  loginWithGoogle: () => Promise<void>;   // Google OAuth login
  logout: () => Promise<void>;            // User logout
  resetPassword: (email: string) => Promise<void>;  // Password reset
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Custom hook to access the auth context
 * @returns The authentication context value
 * @throws Error if used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Authentication Provider Component
 * Wraps the application to provide authentication context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State to track the current authenticated user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // State to track if we're still determining the auth state
  const [loading, setLoading] = useState(true);

  /**
   * Register a new user with email and password
   */
  function signup(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password)
      .then(() => {});
  }

  /**
   * Log in an existing user with email and password
   */
  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password)
      .then(() => {});
  }

  /**
   * Sign in using Google OAuth provider
   */
  function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    return signInWithPopup(auth, provider)
      .then(() => {});
  }

  /**
   * Log out the current user
   */
  function logout() {
    return signOut(auth);
  }

  /**
   * Send a password reset email
   */
  function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  // Set up auth state listener on component mount
  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Unsubscribe from auth state changes when component unmounts
    return unsubscribe;
  }, []);

  // Create context value with all auth methods and state
  const value = {
    currentUser,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Only render children once initial auth state is determined */}
      {!loading && children}
    </AuthContext.Provider>
  );
} 