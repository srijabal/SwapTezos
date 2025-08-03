import Link from "next/link";
import { Button } from "@/components/ui/button";
import WalletButtons from "@/components/WalletButtons";
import Image from "next/image";

export default function Navbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            <Image src="/SwapTezosLogo.png" alt="SwapTezos" width={150} height={150} />
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

          <WalletButtons />
        </div>
      </div>
    </nav>
  );
}
