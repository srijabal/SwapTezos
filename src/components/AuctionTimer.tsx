"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Bid {
  bidder: string
  amount: number
  timestamp: string
}

export default function AuctionTimer() {
  const [timeLeft, setTimeLeft] = useState({ minutes: 2, seconds: 59 })
  const [bids] = useState<Bid[]>([
    { bidder: "Bidder A", amount: 100, timestamp: "2 min ago" },
    { bidder: "Bidder B", amount: 95, timestamp: "5 min ago" },
    { bidder: "Bidder C", amount: 90, timestamp: "8 min ago" },
  ])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 }
        } else if (prev.minutes > 0) {
          return { minutes: prev.minutes - 1, seconds: 59 }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const progress = ((3 * 60 - (timeLeft.minutes * 60 + timeLeft.seconds)) / (3 * 60)) * 100

  return (
    <div className="w-full">
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/30 overflow-hidden relative group">

        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Auction Status</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">Live bidding session</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">LIVE</span>
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
              {bids.map((bid, index) => (
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
              ))}
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
