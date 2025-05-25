/**
 * Main App component
 * Serves as the top-level component for the QuickSend application
 * Contains the header and main content area with the file uploaderr
 */
import './App.css'
import Header from './Header'
import { Uploader } from './Uploader'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LandingPage } from './LandingPage'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MyFilesPage } from './pages/MyFilesPage'

function AppContent() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen pt-[4rem]">
      <Header />
      <main className="p-4 md:p-6">
        <Routes>
          <Route path="/" element={<UploaderPageContent />} />
          <Route path="/my-files" element={<MyFilesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function UploaderPageContent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-7rem)] bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-4xl w-full space-y-16">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent pb-2">
            Share your files quickly and easily
          </h1>
          <p className="text-lg text-muted-foreground">
            Files are available for 7 days and 100 downloads.
          </p>
        </div>
        <Uploader />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;