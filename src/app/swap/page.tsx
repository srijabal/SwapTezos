import SwapForm from "../../components/SwapForm"
import AuctionTimer from "../../components/AuctionTimer"
import HTLCStatus from "../../components/HTLCStatus"

export default function SwapPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent mb-4">
            Cross-Chain Swap
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Seamlessly swap between Ethereum and Tezos using our advanced cross-chain protocol
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Swap Form - Main Column */}
          <div className="lg:col-span-2 order-1 lg:order-1">
            <SwapForm />
          </div>

          {/* Side Components */}
          <div className="space-y-8 order-2 lg:order-2">
            <AuctionTimer />
            <HTLCStatus />
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  )
}
