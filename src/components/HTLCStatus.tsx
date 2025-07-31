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
    <div className="w-full">
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/30 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/10 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl relative overflow-hidden group/icon">
                <div className="absolute inset-0 bg-blue-500/30 scale-0 group-hover/icon:scale-100 transition-transform duration-300 rounded-xl"></div>
                <Shield className="w-6 h-6 text-blue-500 relative z-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-card-foreground">HTLC Cross-Chain Status</h2>
                <p className="text-sm text-muted-foreground">Hash Time Locked Contract Progress</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 rounded-full">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">ACTIVE</span>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-medium text-muted-foreground">Overall Progress</span>
              <span className="text-lg font-bold text-card-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="relative mb-10">
            <div className="absolute top-8 left-0 right-0 h-1 bg-border/30 rounded-full"></div>
            <div 
              className="absolute top-8 left-0 h-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            ></div>
            
            <div className="flex justify-between relative">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center text-center" style={{ minWidth: '160px' }}>
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full border-4 bg-card flex items-center justify-center mb-4 transition-all duration-300 relative z-10",
                      step.status === "completed"
                        ? "border-green-500 bg-green-500/10"
                        : step.status === "active"
                          ? "border-blue-500 bg-blue-500/10 animate-pulse"
                          : "border-border/50 bg-muted/30",
                    )}
                  >
                    {getStepIcon(step)}
                  </div>

                  <div className="space-y-2">
                    <h3 className={cn(
                      "text-sm font-semibold",
                      step.status === "completed" ? "text-green-600 dark:text-green-400" :
                      step.status === "active" ? "text-blue-600 dark:text-blue-400" :
                      "text-muted-foreground"
                    )}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-tight">
                      {step.description}
                    </p>
                    {step.timestamp && (
                      <span className="text-sm text-muted-foreground/70 block">
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
            <div className="p-6 bg-muted/20 rounded-xl border border-border/30">
              <h4 className="font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Transaction Details
              </h4>
              <div className="space-y-3 text-sm">
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

            <div className="p-6 bg-muted/20 rounded-xl border border-border/30">
              <h4 className="font-semibold text-card-foreground mb-4">Actions</h4>
              <div className="flex flex-col gap-3">
                <button
                  disabled={currentStep < 4}
                  className={cn(
                    "py-3 px-4 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group/button",
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
                    "py-3 px-4 rounded-xl font-medium transition-all duration-300 relative overflow-hidden group/button",
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
            </div>

            <div className="p-6 bg-muted/20 rounded-xl border border-border/30">
              <h4 className="font-semibold text-card-foreground mb-4">Explorer</h4>
              <button className="w-full py-3 px-4 text-sm text-muted-foreground hover:text-card-foreground border border-border/30 hover:border-primary/30 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/explorer">
                <ExternalLink className="w-4 h-4 group-hover/explorer:scale-110 transition-transform" />
                <span>View on Block Explorer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
