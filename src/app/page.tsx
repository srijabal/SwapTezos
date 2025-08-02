import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }} />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 mb-8 bg-primary/10 rounded-full text-sm font-medium text-primary border border-primary/20">
              🚀 Powered by 1inch Fusion+ Technology
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
              Cross-Chain Swaps
              <span className="block text-primary">Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Bridge the gap between Ethereum and Tezos with lightning-fast, secure, and cost-effective cross-chain swaps
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link href="/swap">
                <Button size="lg" className="text-lg px-8 py-4 h-14 shadow-lg hover:shadow-xl transition-all duration-300">
                  Start Swapping →
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline" className="text-lg px-8 py-4 h-14">
                  Learn More
                </Button>
              </Link>
            </div>
            <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Secure Protocol</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Low Fees</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>Fast Settlement</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      
    </div>
  );
}
