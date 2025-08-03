"use client"

import { useState, useEffect } from "react"
import { api, ApiError } from "@/lib/api"
import { RefreshCw, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResolverOpportunity {
  orderHash: string
  sourceChain: string
  destChain: string
  sourceToken: string
  destToken: string
  sourceAmount: string
  destAmount: string
  timelock: string
  expectedProfit: string
  risk: 'low' | 'medium' | 'high'
}

export default function ResolverDashboard() {
  const [opportunities, setOpportunities] = useState<ResolverOpportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalResolved: 0,
    totalProfit: '0.00',
    activeOpportunities: 0
  })

  const fetchOpportunities = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch resolver opportunities from backend
      const response = await api.getResolverOpportunities()
      
      if (response.success && response.data) {
        setOpportunities(response.data)
        setStats(prev => ({ ...prev, activeOpportunities: response.data.length }))
      } else {
        setOpportunities([])
      }
    } catch (err) {
      console.error("Failed to fetch resolver opportunities:", err)
      setError(err instanceof ApiError ? err.message : "Failed to load opportunities")
      
      setOpportunities([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOpportunities()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOpportunities, 30000)
    return () => clearInterval(interval)
  }, [])

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'high': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const handleResolveOpportunity = async (orderHash: string) => {
    // This would integrate with the resolver service
    console.log("Resolving opportunity:", orderHash)
    // TODO: Implement actual resolution logic
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-card-foreground">Resolver Dashboard</h1>
          <p className="text-muted-foreground">Monitor and resolve cross-chain swap opportunities</p>
        </div>
        <button
          onClick={fetchOpportunities}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Resolved</p>
              <p className="text-2xl font-bold text-card-foreground">{stats.totalResolved}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Profit</p>
              <p className="text-2xl font-bold text-card-foreground">{stats.totalProfit} ETH</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active Opportunities</p>
              <p className="text-2xl font-bold text-card-foreground">{stats.activeOpportunities}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-card-foreground">Active Opportunities</h2>
          <p className="text-sm text-muted-foreground">Cross-chain swaps ready for resolution</p>
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
                  Order Hash
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Route
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Expected Profit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Time Left
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-muted-foreground">Loading opportunities...</span>
                    </div>
                  </td>
                </tr>
              ) : opportunities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No active opportunities found
                  </td>
                </tr>
              ) : (
                opportunities.map((opportunity, index) => (
                  <tr key={index} className="hover:bg-muted/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-card-foreground">
                        {opportunity.orderHash}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-card-foreground">
                          {opportunity.sourceChain} → {opportunity.destChain}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-card-foreground">
                          {opportunity.sourceAmount} {opportunity.sourceToken}
                        </div>
                        <div className="text-muted-foreground">
                          → {opportunity.destAmount} {opportunity.destToken}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-green-600">
                        {opportunity.expectedProfit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-card-foreground">{opportunity.timelock}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("text-sm font-medium capitalize", getRiskColor(opportunity.risk))}>
                        {opportunity.risk}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleResolveOpportunity(opportunity.orderHash)}
                        className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90"
                      >
                        Resolve
                      </button>
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