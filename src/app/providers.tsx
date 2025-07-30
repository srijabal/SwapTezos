"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { TezosWalletProvider } from "@/context/TezosWalletContext";
import { ReactNode, useEffect, useState } from "react";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  const [wagmiConfig, setWagmiConfig] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initWagmi = async () => {
      try {
        const { getWagmiConfig } = await import("@/lib/wagmi");
        const config = getWagmiConfig();
        setWagmiConfig(config);
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize wagmi config:", error);
      }
    };
    
    initWagmi();
  }, []);

  if (!wagmiConfig || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing wallet providers...</p>
        </div>
      </div>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={
            darkTheme({
              accentColor: "hsl(var(--primary))",
              accentColorForeground: "hsl(var(--primary-foreground))",
              borderRadius: "small",
              fontStack: "system",
              overlayBlur: "small",
            })
          }
        >
          <TezosWalletProvider>{children}</TezosWalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
