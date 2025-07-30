"use client";

import { useEffect, useState } from "react";
import EthereumWalletButton from "@/components/EthereumWalletButton";
import TezosWalletButton from "@/components/TezosWalletButton";

export default function WalletButtons() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-9 w-24 bg-muted animate-pulse rounded-md"></div>
        <div className="h-9 w-24 bg-muted animate-pulse rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <EthereumWalletButton />
      <TezosWalletButton />
    </div>
  );
}
