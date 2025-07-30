"use client";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';

export default function EthereumWalletButton() {
  const [isClient, setIsClient] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!isClient || !isReady) {
    return (
      <div className="h-9 w-24 bg-muted animate-pulse rounded-md" title="Loading wallet button..."></div>
    );
  }

  return (
    <ConnectButton 
      showBalance={false} 
      chainStatus="icon"
      label="Connect Ethereum"
    />
  );
}
