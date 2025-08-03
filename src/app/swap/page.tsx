"use client"

import { useState, useEffect } from "react"
import SwapForm from "../../components/SwapForm"
import TezosExplorerCard from "../../components/TezosExplorerCard"

export default function SwapPage() {
  const [currentOrderHash, setCurrentOrderHash] = useState<string | undefined>()
  const [orderStatus, setOrderStatus] = useState<any>(null)

  // Fetch order status when orderHash changes
  useEffect(() => {
    if (!currentOrderHash) return

    const fetchOrderStatus = async () => {
      try {
        const response = await fetch(`/api/fusion/orders/${currentOrderHash}`)
        
        if (response.ok) {
          const data = await response.json()
          setOrderStatus(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch order status:', error)
      }
    }

    fetchOrderStatus()
    const interval = setInterval(fetchOrderStatus, 2000)
    return () => clearInterval(interval)
  }, [currentOrderHash])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 py-4 px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 right-20 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header with Wallet Connections */}
        <div className="text-center mb-8">
          {/* <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm text-primary mb-4">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="font-medium">LIVE ON TESTNET</span>
          </div> */}
          
          <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent mb-4 tracking-tight">
            SwapTezos
          </h1>
                     <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 font-medium">
             The first truly atomic cross-chain swap protocol between Ethereum & Tezos
           </p>
           
           
          
          {/* <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-3 px-6 py-3 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg">
              <span className="text-sm font-medium text-muted-foreground">Connect:</span>
              <EthereumWalletButton />
              <div className="w-px h-6 bg-border"></div>
              <TezosWalletButton />
            </div>
          </div> */}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7">
            <SwapForm onOrderCreated={setCurrentOrderHash} />
          </div>

                     <div className="xl:col-span-5">
             {currentOrderHash ? (
               <TezosExplorerCard 
                 orderHash={currentOrderHash}
                 explorerData={orderStatus?.tezosExplorerData}
                 status={orderStatus?.status || 'created'}
               />
             ) : (
               <div className="w-full h-64 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg flex items-center justify-center">
                 <div className="text-center">
                   <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                     <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                     </svg>
                   </div>
                   <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Swap</h3>
                   <p className="text-sm text-muted-foreground">Create a cross-chain swap to see the Tezos explorer</p>
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  )
}
