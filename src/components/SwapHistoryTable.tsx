"use client"

import { useState, useEffect } from "react"
import { api, ApiError } from "@/lib/api"
import { RefreshCw, ExternalLink, Copy, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SwapHistoryItem {
  swapId: string
  orderHash?: string
  fusionOrderHash?: string
  sourceChain: string
  destChain: string
  sourceToken: string
  destToken: string
  sourceAmount: string
  destAmount: string
  status: 'created' | 'ethereum_locked' | 'tezos_locked' | 'both_locked' | 'completed' | 'failed' | 'expired'
  createdAt: string
  expirationTime?: string
  user: 'maker' | 'resolver'
}

export default function SwapHistoryTable() {
  const [swaps, setSwaps] = useState<SwapHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'user' | 'resolver'>('user')

  const fetchSwapHistory = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Try to fetch from cross-chain swaps API
      const crossChainResponse = await api.listCrossChainSwaps(50, 0)
      
      if (crossChainResponse.success && crossChainResponse.data) {
        const formattedSwaps = crossChainResponse.data.map((swap: any) => ({
          swapId: swap.swapId,
          orderHash: swap.fusionOrderHash,
          fusionOrderHash: swap.fusionOrderHash,
          sourceChain: swap.sourceChain || 'ethereum',
          destChain: swap.destChain || 'tezos',
          sourceToken: swap.sourceToken || 'ETH',
          destToken: swap.destToken || 'XTZ',
          sourceAmount: swap.sourceAmount || '0',
          destAmount: swap.destAmount || '0',
          status: swap.status,
          createdAt: swap.createdAt || new Date().toISOString(),
          expirationTime: swap.expirationTime,
          user: 'maker' as const
        }))
        setSwaps(formattedSwaps)
      } else {
        // Fallback to Fusion orders API
        const fusionResponse = await api.listOrders(50, 0)
        
        if (fusionResponse.success && fusionResponse.data) {
          const formattedSwaps = fusionResponse.data.map((order: any) => ({
            swapId: order.orderHash,
            orderHash: order.orderHash,
            fusionOrderHash: order.orderHash,
            sourceChain: order.sourceChain || 'ethereum',
            destChain: order.destChain || 'tezos',
            sourceToken: order.sourceToken || 'ETH',
            destToken: order.destToken || 'XTZ',
            sourceAmount: order.sourceAmount || '0',
            destAmount: order.destAmount || '0',
            status: order.status === 'created' ? 'created' : 'completed',
            createdAt: order.createdAt || new Date().toISOString(),
            user: 'maker' as const
          }))
          setSwaps(formattedSwaps)
        } else {
          setSwaps([])
        }
      }
    } catch (err) {
      console.error("Failed to fetch swap history:", err)
      setError(err instanceof ApiError ? err.message : "Failed to load swap history")
      
      setSwaps([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSwapHistory()
  }, [viewMode])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'failed':
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'created':
      case 'ethereum_locked':
      case 'tezos_locked': 
      case 'both_locked':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
      case 'expired':
        return 'text-red-600'
      case 'created':
      case 'ethereum_locked':
      case 'tezos_locked':
      case 'both_locked':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago` 
    if (diffMins > 0) return `${diffMins}m ago`
    return 'Just now'
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-card-foreground">Swap History</h1>
          <p className="text-muted-foreground">Track your cross-chain swap transactions</p>
        </div>
        <button
          onClick={fetchSwapHistory}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('user')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            viewMode === 'user'
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          As User
        </button>
        <button
          onClick={() => setViewMode('resolver')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            viewMode === 'resolver'
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          As Resolver
        </button>
      </div>

      {/* History Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-card-foreground">
            {viewMode === 'user' ? 'Your Swaps' : 'Resolved Swaps'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'user' 
              ? 'Cross-chain swaps you initiated' 
              : 'Swaps you resolved as a resolver'
            }
          </p>
        </div>

        {error && (
          <div className="mx-6 my-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Swap ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-muted-foreground">Loading history...</span>
                    </div>
                  </td>
                </tr>
              ) : swaps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No swap history found
                  </td>
                </tr>
              ) : (
                swaps.map((swap, index) => (
                  <tr key={index} className="hover:bg-muted/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-card-foreground">
                          {swap.swapId.slice(0, 8)}...{swap.swapId.slice(-4)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(swap.swapId)}
                          className="text-muted-foreground hover:text-card-foreground"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-card-foreground">
                          {swap.sourceChain} → {swap.destChain}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-card-foreground">
                          {swap.sourceAmount} {swap.sourceToken}
                        </div>
                        <div className="text-muted-foreground">
                          → {swap.destAmount} {swap.destToken}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(swap.status)}
                        <span className={cn("text-sm font-medium capitalize", getStatusColor(swap.status))}>
                          {swap.status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-muted-foreground">
                        {formatTimeAgo(swap.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {swap.orderHash && (
                          <button
                            onClick={() => copyToClipboard(swap.orderHash!)}
                            className="text-muted-foreground hover:text-card-foreground"
                            title="Copy order hash"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          className="text-muted-foreground hover:text-card-foreground"
                          title="View on explorer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}