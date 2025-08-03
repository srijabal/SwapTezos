"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

interface HTLCStep {
  id: number
  title: string
  description: string
  status: "completed" | "active" | "pending"
  timestamp?: string
}

interface SwapData {
  id: string
  status: string
  orderHash: string
  fusionSettlementHash?: string
  tezosHTLCAddress?: string
  tezosHTLCId?: number
  secretRevealed?: boolean
  createdAt: string
}

interface HTLCStatusProps {
  orderHash?: string
}

export default function HTLCStatus({ orderHash }: HTLCStatusProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [progress, setProgress] = useState(0)
  const [swapData, setSwapData] = useState<SwapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch swap data
  useEffect(() => {
    const fetchSwapData = async () => {
      if (!orderHash) {
        setLoading(false)
        setError("No order hash provided")
        return
      }

      try {
        setLoading(true)
        const response = await api.getCrossChainSwaps()
        
        if (response.success) {
          // Find swap for this order
          const swap = response.data.find((s: any) => s.orderHash === orderHash)
          
          if (swap) {
            setSwapData(swap)
            
            // Determine current step based on swap status
            switch (swap.status) {
              case 'created':
              case 'initiated':
                setCurrentStep(1)
                setProgress(20)
                break
              case 'deposited':
                setCurrentStep(3)
                setProgress(60)
                break
              case 'revealed':
                setCurrentStep(4)
                setProgress(80)
                break
              case 'claimed':
              case 'completed':
                setCurrentStep(5)
                setProgress(100)
                break
              default:
                setCurrentStep(1)
                setProgress(20)
            }
          } else {
            setError("No cross-chain swap found for this order")
          }
        } else {
          setError("Failed to fetch swap data")
        }
      } catch (err) {
        console.error("Error fetching swap data:", err)
        setError("Failed to load swap data")
      } finally {
        setLoading(false)
      }
    }

    fetchSwapData()
    
    // Refresh every 15 seconds
    const interval = setInterval(fetchSwapData, 15000)
    return () => clearInterval(interval)
  }, [orderHash])

  const getSteps = (): HTLCStep[] => {
    const baseSteps = [
      {
        id: 1,
        title: "Order Created",
        description: "Fusion+ order submitted to 1inch",
        status: "completed" as const,
        timestamp: swapData ? new Date(swapData.createdAt).toLocaleString() : undefined,
      },
      {
        id: 2,
        title: "Auction Active", 
        description: "Resolvers competing in Dutch auction",
        status: (currentStep >= 2 ? "completed" : currentStep === 2 ? "active" : "pending") as const,
      },
      {
        id: 3,
        title: "Funds Locked",
        description: "Resolver deposits funds on both chains",
        status: (currentStep >= 3 ? "completed" : currentStep === 3 ? "active" : "pending") as const,
        timestamp: swapData?.fusionSettlementHash ? "Locked" : undefined,
      },
      {
        id: 4,
        title: "Cross-chain Verification",
        description: "Verifying transactions on both chains", 
        status: (currentStep >= 4 ? "completed" : currentStep === 4 ? "active" : "pending") as const,
      },
      {
        id: 5,
        title: "Swap Complete",
        description: "Funds released to destination wallet",
        status: (currentStep >= 5 ? "completed" : currentStep === 5 ? "active" : "pending") as const,
        timestamp: swapData?.secretRevealed ? "Completed" : undefined,
      },
    ]

    return baseSteps
  }

  const steps = getSteps()

  // Loading state
  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/30 overflow-hidden relative group">
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading cross-chain swap data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full">
        <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/30 overflow-hidden relative group">
          <div className="p-8 text-center">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-lg">⚠</span>
            </div>
            <p className="text-red-600 dark:text-red-400 mb-2">Swap Data Unavailable</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const getStepIcon = (step: HTLCStep) => {
    switch (step.status) {
      case "completed":
        return <span className="text-green-500 text-xl">✓</span>
      case "active":
        return <span className="text-blue-500 text-xl animate-pulse">●</span>
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-slate-400 dark:border-slate-500"></div>
    }
  }

  return (
    <div className="w-full">
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/30 overflow-hidden relative group">

        <div className="relative p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">HTLC Cross-Chain Status</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">Hash Time Locked Contract Progress</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">ACTIVE</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-medium text-slate-600 dark:text-slate-400">Overall Progress</span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              >
              </div>
            </div>
          </div>

          <div className="relative mb-10">
            <div className="absolute top-8 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            <div 
              className="absolute top-8 left-0 h-1 bg-blue-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            ></div>
            
            <div className="flex justify-between relative">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center text-center" style={{ minWidth: '160px' }}>
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full border-4 bg-white dark:bg-slate-800 flex items-center justify-center mb-4 transition-all duration-300 relative z-10",
                      step.status === "completed"
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : step.status === "active"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 animate-pulse"
                          : "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700",
                    )}
                  >
                    {getStepIcon(step)}
                  </div>

                  <div className="space-y-2">
                    <h3 className={cn(
                      "text-sm font-semibold",
                      step.status === "completed" ? "text-green-600 dark:text-green-400" :
                      step.status === "active" ? "text-blue-600 dark:text-blue-400" :
                      "text-slate-600 dark:text-slate-400"
                    )}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-tight">
                      {step.description}
                    </p>
                    {step.timestamp && (
                      <span className="text-sm text-slate-500 dark:text-slate-500 block">
                        {step.timestamp}
                      </span>
                    )}
                    
                    {step.status === "active" && (
                      <div className="flex justify-center mt-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Transaction Details
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Order Hash</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-900 dark:text-slate-100">
                      {orderHash ? `${orderHash.slice(0, 6)}...${orderHash.slice(-4)}` : "N/A"}
                    </span>
                    <button 
                      onClick={() => orderHash && navigator.clipboard.writeText(orderHash)}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                {swapData?.tezosHTLCAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Tezos HTLC</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-900 dark:text-slate-100">
                        {`${swapData.tezosHTLCAddress.slice(0, 6)}...${swapData.tezosHTLCAddress.slice(-4)}`}
                      </span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(swapData.tezosHTLCAddress!)}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                {swapData?.fusionSettlementHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">ETH Settlement</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-900 dark:text-slate-100">
                        {`${swapData.fusionSettlementHash.slice(0, 6)}...${swapData.fusionSettlementHash.slice(-4)}`}
                      </span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(swapData.fusionSettlementHash!)}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Status</span>
                  <span className={cn(
                    "text-sm font-medium",
                    swapData?.status === 'completed' ? "text-green-600 dark:text-green-400" :
                    swapData?.status === 'deposited' ? "text-blue-600 dark:text-blue-400" :
                    "text-yellow-600 dark:text-yellow-400"
                  )}>
                    {swapData?.status || "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Actions</h4>
              <div className="flex flex-col gap-3">
                <button
                  disabled={currentStep < 4}
                  className={cn(
                    "py-3 px-4 rounded-xl font-medium transition-all duration-300",
                    currentStep >= 4
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed",
                  )}
                >
                  <span>Claim</span>
                </button>

                <button
                  disabled={currentStep >= 4}
                  className={cn(
                    "py-3 px-4 rounded-xl font-medium transition-all duration-300",
                    currentStep < 4
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                      : "bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed",
                  )}
                >
                  <span>Refund</span>
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">Explorer</h4>
              <button className="w-full py-3 px-4 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 rounded-xl transition-all duration-300">
                <span>View on Block Explorer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
