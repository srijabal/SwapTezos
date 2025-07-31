import SwapForm from "../../components/SwapForm"
import AuctionTimer from "../../components/AuctionTimer"
import HTLCStatus from "../../components/HTLCStatus"
import EthereumWalletButton from "../../components/EthereumWalletButton"
import TezosWalletButton from "../../components/TezosWalletButton"

export default function SwapPage() {
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm text-primary mb-4">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span className="font-medium">LIVE ON TESTNET</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent mb-4 tracking-tight">
            SwapTezos
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 font-medium">
            The first truly atomic cross-chain swap protocol between Ethereum & Tezos
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-3 px-6 py-3 bg-card/80 backdrop-blur-xl rounded-2xl border border-border/30 shadow-lg">
              <span className="text-sm font-medium text-muted-foreground">Connect:</span>
              <EthereumWalletButton />
              <div className="w-px h-6 bg-border"></div>
              <TezosWalletButton />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7">
            <SwapForm />
          </div>

          <div className="xl:col-span-5">
            <AuctionTimer />
          </div>
        </div>

        <div className="mt-6">
          <HTLCStatus />
        </div>

        {/* Stats Bar */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border/30 p-6 text-center">
            <div className="text-2xl font-bold text-primary mb-1">$2.1M</div>
            <div className="text-sm text-muted-foreground">Total Volume</div>
          </div>
          <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border/30 p-6 text-center">
            <div className="text-2xl font-bold text-green-500 mb-1">1,247</div>
            <div className="text-sm text-muted-foreground">Successful Swaps</div>
          </div>
          <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border/30 p-6 text-center">
            <div className="text-2xl font-bold text-blue-500 mb-1">~2.3s</div>
            <div className="text-sm text-muted-foreground">Avg Settlement</div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-500/10 border border-green-500/20 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-600 dark:text-green-400 font-medium">All systems operational</span>
            <div className="w-px h-4 bg-green-500/30"></div>
            <span className="text-muted-foreground">99.9% uptime</span>
          </div>
        </div>
      </div>
    </div>
  )
}
