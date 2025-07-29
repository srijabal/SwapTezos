import Link from "next/link";
import WalletConnect from "../WalletConnect";
import ThemeToggle from "../ui/ThemeToggle";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            SwapTezos
          </Link>
          
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/swap">
              <Button variant="ghost">Swap</Button>
            </Link>
            <Link href="/resolver">
              <Button variant="ghost">Resolver</Button>
            </Link>
            <Link href="/history">
              <Button variant="ghost">History</Button>
            </Link>
            <Link href="/docs">
              <Button variant="ghost">Docs</Button>
            </Link>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              Connect Ethereum
            </Button>
            <Button variant="outline" size="sm">
              Connect Tezos
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
