import { Button } from "./components/ui/button";

function Header() {
  return (
    <nav className="fixed top-0 left-0 right-0 py-4 px-5 flex items-center justify-between shadow-lg bg-background">
      <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">QuickSend</h2>
      <div className="flex space-x-4">
        <Button variant={"ghost"}>Features</Button>
        <Button variant={"ghost"}>Pricing</Button>
        <Button variant={"ghost"}>Resources</Button>
        <Button variant={"default"}>Sign Up</Button>
        <Button variant={"link"}>Log In</Button>
      </div>
    </nav>
  );
}

export default Header;