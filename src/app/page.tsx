import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Cross-chain swaps between Ethereum and Tezos
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Seamlessly swap assets across different blockchain networks, powered by 1inch Fusion+
          </p>
          <div className="mt-10">
            <Button size="lg" className="text-lg px-8 py-3">
              Start Swap
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
