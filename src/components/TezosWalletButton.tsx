"use client";
import { Button } from "@/components/ui/button";
import { useTezosWallet } from "@/context/TezosWalletContext";
import { useEffect, useState } from 'react';

export default function TezosWalletButton() {
  const { account, connect, disconnect, isInitialized } = useTezosWallet();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !isInitialized) {
    return (
      <div className="h-9 w-24 bg-muted animate-pulse rounded-md" title="Initializing wallet..."></div>
    );
  }

  if (account) {
    return (
      <Button variant="outline" size="sm" onClick={disconnect} title="Click to disconnect">
        {account.slice(0, 5)}...{account.slice(-4)}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={connect} title="Connect your Tezos wallet">
      Connect Tezos
    </Button>
  );
}
