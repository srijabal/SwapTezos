"use client"

import { useState, useEffect } from "react"
import { Shield, CheckCircle2, Clock, AlertCircle, Copy, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface HTLCStep {
  id: number
  title: string
  description: string
  status: "completed" | "active" | "pending"
  timestamp?: string
}

export default function HTLCStatus() {
  const [currentStep, setCurrentStep] = useState(2)
  const [progress, setProgress] = useState(50)

  const steps: HTLCStep[] = [
    {
      id: 1,
      title: "Initiate Swap",
      description: "Swap request created and validated",
      status: "completed",
      timestamp: "2 min ago",
    },
    {
      id: 2,
      title: "HTLC Deployed",
      description: "Hash Time Locked Contract deployed on both chains",
      status: "active",
      timestamp: "In progress",
    },
    {
      id: 3,
      title: "Funds Locked",
      description: "Funds secured in smart contracts",
      status: "pending",
    },
    {
      id: 4,
      title: "Cross-chain Verification",
      description: "Verifying transaction on destination chain",
      status: "pending",
    },
    {
      id: 5,
      title: "Swap Complete",
      description: "Funds released to destination wallet",
      status: "pending",
    },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 100) {
          return prev + 1
        }
        return prev
      })
    }, 200)

    return () => clearInterval(timer)
  }, [])

  const getStepIcon = (step: HTLCStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case "active":
        return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30"></div>
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto mt-8">
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/30 overflow-hidden relative group">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/10 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>

        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 rounded-xl relative overflow-hidden group/icon">
                <div className="absolute inset-0 bg-blue-500/30 scale-0 group-hover/icon:scale-100 transition-transform duration-300 rounded-xl"></div>
                <Shield className="w-5 h-5 text-blue-500 relative z-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-card-foreground">HTLC Status</h2>
                <p className="text-xs text-muted-foreground">Hash Time Locked Contract</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="relative px-6 pb-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
              <span className="text-sm font-bold text-card-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="relative">
                <div
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] group/step",
                    step.status === "completed"
                      ? "bg-green-500/10 border-green-500/20"
                      : step.status === "active"
                        ? "bg-blue-500/10 border-blue-500/20"
                        : "bg-muted/30 border-border/30",
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">{getStepIcon(step)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-card-foreground">{step.title}</h3>
                      {step.timestamp && <span className="text-xs text-muted-foreground">{step.timestamp}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>

                    {step.status === "active" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                        </div>
                        <span className="text-xs text-blue-600 dark:text-blue-400">Processing...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && <div className="absolute left-8 top-16 w-0.5 h-4 bg-border/30"></div>}
              </div>
            ))}
          </div>

          {/* Transaction Details */}
          <div className="mt-6 p-4 bg-muted/20 rounded-xl border border-border/30">
            <h4 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Transaction Details
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Contract Address</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-card-foreground">0x1234...5678</span>
                  <button className="text-muted-foreground hover:text-card-foreground transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Hash Lock</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-card-foreground">0xabcd...efgh</span>
                  <button className="text-muted-foreground hover:text-card-foreground transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time Lock</span>
                <span className="text-card-foreground">24 hours</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              disabled={currentStep < 4}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group/button",
                currentStep >= 4
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Claim</span>
              </div>
            </button>

            <button
              disabled={currentStep >= 4}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group/button",
                currentStep < 4
                  ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Refund</span>
              </div>
            </button>
          </div>

          {/* View on Explorer */}
          <button className="w-full mt-3 py-2 px-4 text-sm text-muted-foreground hover:text-card-foreground border border-border/30 hover:border-primary/30 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/explorer">
            <ExternalLink className="w-4 h-4 group-hover/explorer:scale-110 transition-transform" />
            <span>View on Block Explorer</span>
          </button>
        </div>
      </div>
    </div>
  )
}
