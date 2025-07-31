"use client";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export default function EthereumWalletButton() {
  const [isClient, setIsClient] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { address, isConnected } = useAccount();

  useEffect(() => {
    setIsClient(true);
    
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!isClient || !isReady) {
    return (
      <div className="h-10 w-32 bg-muted animate-pulse rounded-lg" title="Loading wallet button..."></div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button 
                    onClick={openConnectModal} 
                    variant="outline" 
                    size="sm"
                    className="gap-2 min-w-32 h-10 bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border-blue-500/20 hover:border-blue-500/30 text-blue-600 hover:text-blue-700"
                  >
                    <Wallet className="w-4 h-4" />
                    Ethereum
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button 
                    onClick={openChainModal} 
                    variant="destructive" 
                    size="sm"
                    className="min-w-32 h-10"
                  >
                    Wrong network
                  </Button>
                );
              }

              return (
                <Button 
                  onClick={openAccountModal} 
                  variant="outline" 
                  size="sm"
                  className="gap-2 min-w-32 h-10 bg-gradient-to-r from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border-green-500/20 hover:border-green-500/30 text-green-600 hover:text-green-700"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {account.displayName}
                </Button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
