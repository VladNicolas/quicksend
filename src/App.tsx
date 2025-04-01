/**
 * Main App component
 * Serves as the top-level component for the QuickSend application
 * Contains the header and main content area with the file uploader
 */
import './App.css'
import Header from './Header'
import { Uploader } from './Uploader'

function App() {

  return (
    <div className="min-h-screen pt-[4rem]">
      {/* Header component contains navigation and authentication UI */}
      <Header />
      
      {/* Main content area with file uploader component */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-gradient-to-b from-background to-secondary/20">
        <div className="max-w-4xl w-full space-y-16">
          {/* Hero section with app description */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent pb-2">
              Share your files quickly and easily
            </h1>
            <p className="text-lg text-muted-foreground">
              No account required. Files are available for 7 days and 100 downloads.
            </p>
          </div>
          
          {/* File upload component */}
          <Uploader />
        </div>
      </main>
    </div>
  )
}

export default App