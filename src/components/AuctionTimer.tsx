"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

interface Bid {
  bidder: string
  amount: number
  timestamp: string
}

interface OrderData {
  orderHash: string
  status: string
  fusionStatus?: {
    status: string
    data?: any
  }
  createdAt: string
  fusionAuctionStartTime?: string
  fusionAuctionDuration?: number
}

interface AuctionTimerProps {
  orderHash?: string
}

export default function AuctionTimer({ orderHash }: AuctionTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 })
  const [bids, setBids] = useState<Bid[]>([])
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch order data
  useEffect(() => {
    const fetchOrderData = async () => {
      if (!orderHash) {
        setLoading(false)
        setError("No order hash provided")
        return
      }

      try {
        setLoading(true)
        const response = await api.getOrderStatus(orderHash)
        
        if (response.success) {
          setOrderData(response.data)
          
          // Check if order is found in 1inch system
          if (response.data.fusionStatus?.status === 'not-found-in-1inch') {
            setError("Order not found in 1inch system")
          } else if (response.data.fusionStatus?.status === 'active-in-1inch') {
            // Try to extract bid/auction data if available
            const auctionData = response.data.fusionStatus.data
            if (auctionData?.bids) {
              setBids(auctionData.bids)
            }
          }
        } else {
          setError("Failed to fetch order data")
        }
      } catch (err) {
        console.error("Error fetching order data:", err)
        setError("Failed to load auction data")
      } finally {
        setLoading(false)
      }
    }

    fetchOrderData()
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchOrderData, 10000)
    return () => clearInterval(interval)
  }, [orderHash])

  // Timer logic
  useEffect(() => {
    if (!orderData) return

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const startTime = new Date(orderData.createdAt).getTime()
      const duration = (orderData.fusionAuctionDuration || 180) * 1000 // Convert to ms
      const endTime = startTime + duration
      const remaining = Math.max(0, endTime - now)
      
      const minutes = Math.floor(remaining / (1000 * 60))
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
      
      return { minutes, seconds }
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [orderData])

  const totalDuration = orderData?.fusionAuctionDuration || 180
  const progress = totalDuration > 0 ? ((totalDuration - (timeLeft.minutes * 60 + timeLeft.seconds)) / totalDuration) * 100 : 0

  // Loading state
  if (loading) {
    return (
      <div className="w-full">
        <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/30 overflow-hidden relative group">
          <div className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading auction data...</p>
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
          <div className="p-6 text-center">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-lg">⚠</span>
            </div>
            <p className="text-red-600 dark:text-red-400 mb-2">Auction Data Unavailable</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const getStatusDisplay = () => {
    if (!orderData) return { color: "gray", text: "UNKNOWN" }
    
    if (orderData.fusionStatus?.status === 'active-in-1inch') {
      return { color: "green", text: "LIVE" }
    } else if (orderData.fusionStatus?.status === 'not-found-in-1inch') {
      return { color: "yellow", text: "PENDING" }
    } else {
      return { color: "blue", text: "PROCESSING" }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="w-full">
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/30 overflow-hidden relative group">

        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Auction Status</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {orderData ? `Order: ${orderData.orderHash.slice(0, 10)}...` : "1inch Fusion+ Auction"}
              </p>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              statusDisplay.color === "green" ? "bg-green-50 dark:bg-green-900/20" :
              statusDisplay.color === "yellow" ? "bg-yellow-50 dark:bg-yellow-900/20" :
              statusDisplay.color === "blue" ? "bg-blue-50 dark:bg-blue-900/20" :
              "bg-gray-50 dark:bg-gray-900/20"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                statusDisplay.color === "green" ? "bg-green-500 animate-pulse" :
                statusDisplay.color === "yellow" ? "bg-yellow-500 animate-pulse" :
                statusDisplay.color === "blue" ? "bg-blue-500 animate-pulse" :
                "bg-gray-500"
              )}></div>
              <span className={cn(
                "text-xs font-medium",
                statusDisplay.color === "green" ? "text-green-600 dark:text-green-400" :
                statusDisplay.color === "yellow" ? "text-yellow-600 dark:text-yellow-400" :
                statusDisplay.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                "text-gray-600 dark:text-gray-400"
              )}>{statusDisplay.text}</span>
            </div>
          </div>
        </div>

        <div className="relative px-6 pb-6">
          {/* Timer Display */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className="text-5xl font-mono font-bold text-slate-900 dark:text-slate-100 mb-2 relative">
                <span className="inline-block animate-pulse">{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span className="mx-2 animate-pulse">:</span>
                <span className="inline-block animate-pulse">{String(timeLeft.seconds).padStart(2, "0")}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Time remaining</p>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              >
              </div>
            </div>
          </div>

          {/* Current Bids */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Current Bids
              </h3>
              <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                <span>{bids.length} bidders</span>
              </div>
            </div>

            <div className="space-y-2">
              {bids.length > 0 ? (
                bids.map((bid, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border transition-all duration-300 hover:scale-[1.02] group/bid",
                      index === 0
                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                          index === 0
                            ? "bg-green-500 text-white"
                            : "bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300",
                        )}
                      >
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{bid.bidder}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{bid.timestamp}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{bid.amount}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">ETH</span>
                        {index === 0 && <span className="text-green-500 ml-1 text-sm">⭐</span>}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">≈ ${(bid.amount * 2340).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-slate-400 text-xl">⏳</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {orderData?.fusionStatus?.status === 'active-in-1inch' 
                      ? "Waiting for resolver bids..." 
                      : "Order pending submission to 1inch"
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Place Bid Button */}
            <button className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:ring-offset-2 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl">
              <span className="text-lg">Place Bid</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
