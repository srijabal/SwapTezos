"use client";
import { Button } from "@/components/ui/button";
import { useTezosWallet } from "@/context/TezosWalletContext";
import { useEffect, useState } from 'react';
import { Wallet } from "lucide-react";

export default function TezosWalletButton() {
  const { account, connect, disconnect, isInitialized } = useTezosWallet();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !isInitialized) {
    return (
      <div className="h-10 w-32 bg-muted animate-pulse rounded-lg" title="Initializing wallet..."></div>
    );
  }

  if (account) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={disconnect} 
        className="gap-2 min-w-32 h-10 bg-gradient-to-r from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border-green-500/20 hover:border-green-500/30 text-green-600 hover:text-green-700"
        title="Click to disconnect"
      >
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        {account.slice(0, 6)}...{account.slice(-4)}
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={connect} 
      className="gap-2 min-w-32 h-10 bg-gradient-to-r from-blue-400/10 to-blue-500/10 hover:from-blue-400/20 hover:to-blue-500/20 border-blue-400/20 hover:border-blue-400/30 text-blue-500 hover:text-blue-600"
      title="Connect your Tezos wallet"
    >
      <Wallet className="w-4 h-4" />
      Tezos
    </Button>
  );
}
