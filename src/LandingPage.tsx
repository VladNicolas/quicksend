import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/AuthModal"; // Use path alias

// Updated words list
const words = ["photos", "memories", "videos", "songs", "work", "documents", "projects", "ideas"];

export function LandingPage() {
  // State for controlling the authentication modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  // State for the typewriting effect
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Use useRef to hold mutable timeout reference
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const typingSpeed = 300;
    const deletingSpeed = 200;
    const endOfWordPause = 1000; // 1 second
    const betweenWordsDelay = 200;

    // Function to initiate deletion AFTER the pause
    const startDeleting = () => {
        setIsDeleting(true);
        // Clear any timeout potentially set during pause
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        // Schedule the first deletion step
        timeoutRef.current = window.setTimeout(handleTyping, deletingSpeed);
    }

    const handleTyping = () => {
      const currentWord = words[currentWordIndex];
      let nextText = "";
      let delay;

      if (isDeleting) {
        // --- Deleting ---
        nextText = currentWord.substring(0, displayedText.length - 1);
        delay = deletingSpeed;

        if (nextText === "") {
          // Finished deleting -> switch to typing next word
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
          delay = betweenWordsDelay;
        }
      } else {
        // --- Typing ---
        nextText = currentWord.substring(0, displayedText.length + 1);
        delay = typingSpeed;

        if (nextText === currentWord) {
          // Finished typing -> schedule the start of deletion after a pause
          setDisplayedText(nextText); // Ensure full word is displayed before pause
          // Schedule startDeleting after the pause
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = window.setTimeout(startDeleting, endOfWordPause);
          // Stop the immediate loop, wait for the pause timeout
          return;
        }
      }

      setDisplayedText(nextText);

      // Schedule the next regular step (typing or deleting)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(handleTyping, delay);
    };

    // Initial Kickoff
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(handleTyping, betweenWordsDelay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // isDeleting state is crucial here for the logic flow
  }, [currentWordIndex, isDeleting, displayedText]);

  // Determine if cursor should blink (only when paused AFTER typing)
  // Pause = NOT deleting AND text is the full current word
  const shouldBlink = !isDeleting && displayedText === words[currentWordIndex];

  // Functions to open the auth modal
  const handleOpenLoginModal = () => {
    setAuthView('login');
    setShowAuthModal(true);
  };

  const handleOpenSignupModal = () => {
    setAuthView('signup');
    setShowAuthModal(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      {/* Large Logo - Replicate styling from Header */}
      <h1 className="text-6xl md:text-8xl font-extrabold mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
        QuickSend
      </h1>

      {/* Typewriting Text */}
      <p className="text-xl md:text-2xl text-muted-foreground mb-8">
        share your{" "}
        <span className="font-semibold text-foreground min-h-[30px] inline-block">
          {displayedText || "\u200B"}
        </span>
        {/* Use the derived shouldBlink state */}
        <span className={shouldBlink ? "cursor-blink" : ""}>|</span>
      </p>

      {/* Auth Buttons */}
      <div className="flex space-x-4">
        <Button size="lg" onClick={handleOpenSignupModal}>Sign Up</Button>
        <Button size="lg" variant="outline" onClick={handleOpenLoginModal}>Log In</Button>
      </div>

      {/* Reusable Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        defaultView={authView}
      />
    </div>
  );
} 