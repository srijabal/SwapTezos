"use client"

import { useState, useEffect } from "react"
import { Clock, TrendingUp, Users, Zap } from "lucide-react"
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
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/10 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        </div>

        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/20 rounded-xl relative overflow-hidden group/icon">
                <div className="absolute inset-0 bg-orange-500/30 scale-0 group-hover/icon:scale-100 transition-transform duration-300 rounded-xl"></div>
                <Clock className="w-5 h-5 text-orange-500 relative z-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-card-foreground">Auction Status</h2>
                <p className="text-xs text-muted-foreground">Live bidding session</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-full">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">LIVE</span>
            </div>
          </div>
        </div>

        <div className="relative px-6 pb-6">
          {/* Timer Display */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className="text-5xl font-mono font-bold text-card-foreground mb-2 relative">
                <span className="inline-block animate-pulse">{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span className="mx-2 animate-pulse">:</span>
                <span className="inline-block animate-pulse">{String(timeLeft.seconds).padStart(2, "0")}</span>
              </div>
              <p className="text-sm text-muted-foreground">Time remaining</p>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 w-full bg-muted/30 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Current Bids */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Current Bids
              </h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
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
                      ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20"
                      : "bg-muted/30 border-border/30 hover:border-primary/30",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                        index === 0
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">{bid.bidder}</p>
                      <p className="text-xs text-muted-foreground">{bid.timestamp}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-card-foreground">{bid.amount}</span>
                      <span className="text-sm text-muted-foreground">ETH</span>
                      {index === 0 && <Zap className="w-4 h-4 text-green-500 ml-1" />}
                    </div>
                    <p className="text-xs text-muted-foreground">≈ ${(bid.amount * 2340).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Place Bid Button */}
            <button className="w-full mt-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:ring-offset-2 focus:ring-offset-card transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl relative overflow-hidden group/button">
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-lg">Place Bid</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
