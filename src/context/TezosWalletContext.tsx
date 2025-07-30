"use client";
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { TezosToolkit } from '@taquito/taquito';

interface TezosWalletContextType {
  Tezos: TezosToolkit | null;
  account: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isInitialized: boolean;
}

const TezosWalletContext = createContext<TezosWalletContextType | null>(null);

export const TezosWalletProvider = ({ children }: { children: ReactNode }) => {
  const [Tezos, setTezos] = useState<TezosToolkit | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initTezos = async () => {
      try {
        const { TezosToolkit } = await import('@taquito/taquito');
        const toolkit = new TezosToolkit('https://mainnet.api.tez.ie');
        setTezos(toolkit);
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize Tezos toolkit:", error);
      }
    };
    
    initTezos();
  }, []);

  const connect = async () => {
    if (!Tezos) {
      console.error("Tezos toolkit not initialized");
      return;
    }

    try {
      
      const { getDAppClientInstance } = await import('@airgap/beacon-sdk');
      
      const dAppClient = getDAppClientInstance({ 
        name: 'SwapTezos',
        iconUrl: 'https://tezostaquito.io/img/favicon.svg'
      });

      
      const permissions = await dAppClient.requestPermissions();
      console.log('Got permissions for wallet:', permissions.address);
      
      setAccount(permissions.address);
      
      const walletProvider = {
        getPKH: () => Promise.resolve(permissions.address),
        requestPermissions: () => Promise.resolve(),
        client: dAppClient
      };
      
      Tezos.setWalletProvider(walletProvider as any);
      
      console.log("Successfully connected to wallet:", permissions.address);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      setAccount(null);
    }
  };

  const disconnect = async () => {
    try {
      const { getDAppClientInstance } = await import('@airgap/beacon-sdk');
      const dAppClient = getDAppClientInstance({ name: 'SwapTezos' });
      
      await dAppClient.clearActiveAccount();
      setAccount(null);
      console.log("Wallet disconnected");
    } catch (err) {
      console.error("Failed to disconnect wallet:", err);
    }
  };

  return (
    <TezosWalletContext.Provider value={{ Tezos, account, connect, disconnect, isInitialized }}>
      {children}
    </TezosWalletContext.Provider>
  );
};

export const useTezosWallet = () => {
  const context = useContext(TezosWalletContext);
  if (!context) {
    throw new Error("useTezosWallet must be used within a TezosWalletProvider");
  }
  return context;
};
