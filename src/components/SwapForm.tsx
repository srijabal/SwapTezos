"use client"

import { useState, useEffect } from "react"
import { useAccount, useBalance } from "wagmi"
import { useTezosWallet } from "@/context/TezosWalletContext"
import {
  ArrowUpDown,
  RefreshCw,
  Settings,
  TrendingUp,
  Zap,
  ChevronDown,
  Info,
  Wallet,
  Clock,
  Shield,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Token {
  symbol: string
  name: string
  icon: string
  balance: string
  price: number
  color: string
}

const tokens: Record<string, Token> = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    icon: "E",
    balance: "12.5847",
    price: 2340,
    color: "from-blue-500 to-blue-600",
  },
  XTZ: {
    symbol: "XTZ",
    name: "Tezos",
    icon: "T",
    balance: "0.0000",
    price: 1.2,
    color: "from-blue-400 to-blue-500",
  },
}

export default function SwapForm() {
  const [isSwapping, setIsSwapping] = useState(false)
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [fromToken, setFromToken] = useState("ETH")
  const [toToken, setToToken] = useState("XTZ")
  const [isLoading, setIsLoading] = useState(false)
  const [swapPhase, setSwapPhase] = useState<"idle" | "confirming" | "processing" | "success" | "error">("idle")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [slippage, setSlippage] = useState("0.5")
  const [timeDelay, setTimeDelay] = useState("")
  const [priceImpact, setPriceImpact] = useState(0)
  const [tezosBalance, setTezosBalance] = useState("0.0000")

  const { address: ethAddress, isConnected: isEthConnected } = useAccount()
  const { data: ethBalance } = useBalance({
    address: ethAddress,
  })

  const { Tezos, account: tezosAccount } = useTezosWallet()

  const exchangeRate = 1.85
  const networkFee = 2.5

  useEffect(() => {
    const fetchTezosBalance = async () => {
      if (Tezos && tezosAccount) {
        try {
          const balance = await Tezos.tz.getBalance(tezosAccount)
          const balanceInTez = balance.dividedBy(1000000).toFixed(4) 
          setTezosBalance(balanceInTez)
        } catch (error) {
          console.error("Error fetching Tezos balance:", error)
          setTezosBalance("0.0000")
        }
      } else {
        setTezosBalance("0.0000")
      }
    }

    fetchTezosBalance()
  }, [Tezos, tezosAccount])

  useEffect(() => {
    if (fromAmount) {
      const converted = (Number.parseFloat(fromAmount) * exchangeRate).toFixed(6)
      setToAmount(converted)

      // Calculate price impact (mock calculation)
      const impact = Math.min(Number.parseFloat(fromAmount) * 0.1, 5)
      setPriceImpact(impact)
    } else {
      setToAmount("")
      setPriceImpact(0)
    }
  }, [fromAmount])

  const getTokenBalance = (tokenSymbol: string) => {
    if (tokenSymbol === "ETH") {
      if (!isEthConnected || !ethBalance) return "0.0000"
      return parseFloat(ethBalance.formatted).toFixed(4)
    } else if (tokenSymbol === "XTZ") {
      return tezosBalance
    }
    return "0.0000"
  }

  const isWalletConnected = (tokenSymbol: string) => {
    if (tokenSymbol === "ETH") return isEthConnected
    if (tokenSymbol === "XTZ") return !!tezosAccount
    return false
  }

  const handleSwapDirection = () => {
    setIsSwapping(true)
    setTimeout(() => {
      const tempToken = fromToken
      setFromToken(toToken)
      setToToken(tempToken)

      const tempAmount = fromAmount
      setFromAmount(toAmount)
      setToAmount(tempAmount ? (Number.parseFloat(tempAmount) / exchangeRate).toFixed(6) : "")

      setIsSwapping(false)
    }, 400)
  }

  const handleSwap = async () => {
    if (!fromAmount || Number.parseFloat(fromAmount) <= 0) return

    setSwapPhase("confirming")
    setIsLoading(true)

    // Simulate swap process
    setTimeout(() => setSwapPhase("processing"), 1500)
    setTimeout(() => {
      setSwapPhase("success")
      setIsLoading(false)
    }, 4000)
  }

  const resetSwap = () => {
    setSwapPhase("idle")
    setFromAmount("")
    setToAmount("")
  }

  const getSwapButtonContent = () => {
    if (!isWalletConnected(fromToken) || !isWalletConnected(toToken)) {
      return (
        <>
          <Wallet className="w-5 h-5" />
          <span>Connect Wallets to Swap</span>
        </>
      )
    }

    switch (swapPhase) {
      case "confirming":
        return (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Confirm in Wallet</span>
          </>
        )
      case "processing":
        return (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Processing Swap</span>
          </>
        )
      case "success":
        return (
          <>
            <CheckCircle2 className="w-5 h-5" />
            <span>Swap Successful</span>
          </>
        )
      default:
        return (
          <>
            <Zap className="w-5 h-5" />
            <span>Initiate Swap</span>
          </>
        )
    }
  }

  const isSwapDisabled = !fromAmount || Number.parseFloat(fromAmount) <= 0 || isLoading || !isWalletConnected(fromToken) || !isWalletConnected(toToken)

  return (
    <div className="w-full">
      {/* Main Swap Card */}
      <div className="bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/30 overflow-hidden relative group">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>

        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-xl relative overflow-hidden group/icon">
                <div className="absolute inset-0 bg-primary/30 scale-0 group-hover/icon:scale-100 transition-transform duration-300 rounded-xl"></div>
                <Zap className="w-5 h-5 text-primary relative z-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-card-foreground">Swap Tokens</h2>
                <p className="text-xs text-muted-foreground">Cross-chain bridge</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300 relative overflow-hidden group/settings",
                  showAdvanced ? "bg-primary/20 text-primary" : "hover:bg-muted/50 text-muted-foreground",
                )}
              >
                <div className="absolute inset-0 bg-primary/30 scale-0 group-hover/settings:scale-100 transition-transform duration-300 rounded-xl"></div>
                <Settings
                  className={cn("w-5 h-5 relative z-10 transition-transform duration-300", showAdvanced && "rotate-90")}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Swap Container */}
        <div className="relative px-6 pb-6">
          {/* From Token */}
          <div
            className={cn(
              "bg-background/80 backdrop-blur-sm rounded-2xl p-5 border relative overflow-hidden group/from transition-all duration-500",
              swapPhase === "idle" ? "border-border/50 hover:border-primary/30" : "border-primary/50",
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/from:opacity-100 transition-opacity duration-300"></div>

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">From</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="w-3 h-3" />
                  <span>
                    Balance: {isWalletConnected(fromToken) ? getTokenBalance(fromToken) : "0.0000"} {fromToken}
                  </span>
                  {isWalletConnected(fromToken) && (
                    <button
                      onClick={() => setFromAmount(getTokenBalance(fromToken))}
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      MAX
                    </button>
                  )}
                  {!isWalletConnected(fromToken) && (
                    <span className="text-xs text-amber-500">Connect wallet</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full text-3xl font-bold bg-transparent text-card-foreground placeholder-muted-foreground/50 border-none outline-none transition-all duration-300 focus:scale-105"
                    disabled={isLoading}
                  />
                  <div className="text-sm text-muted-foreground mt-1 transition-all duration-300">
                    {fromAmount && `≈ $${(Number.parseFloat(fromAmount) * tokens[fromToken].price).toLocaleString()}`}
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-muted/50 hover:bg-muted/70 rounded-xl px-4 py-3 cursor-pointer transition-all duration-300 hover:scale-105 group/token">
                  <div
                    className={cn(
                      "w-8 h-8 bg-gradient-to-br rounded-full flex items-center justify-center shadow-lg",
                      tokens[fromToken].color,
                    )}
                  >
                    <span className="text-white text-sm font-bold">{tokens[fromToken].icon}</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-card-foreground">{fromToken}</div>
                    <div className="text-xs text-muted-foreground">{tokens[fromToken].name}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover/token:text-card-foreground transition-all duration-300 group-hover/token:rotate-180" />
                </div>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center my-4 relative z-10">
            <button
              onClick={handleSwapDirection}
              disabled={isLoading}
              className={cn(
                "p-3 bg-card border-4 border-background rounded-2xl shadow-lg transition-all duration-500 relative overflow-hidden group/swap",
                isLoading ? "cursor-not-allowed opacity-50" : "hover:shadow-xl hover:scale-110 active:scale-95",
                isSwapping && "animate-spin",
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover/swap:opacity-100 transition-opacity duration-300 rounded-xl"></div>
              <ArrowUpDown className="w-6 h-6 text-primary relative z-10" />
            </button>
          </div>

          {/* To Token */}
          <div
            className={cn(
              "bg-background/80 backdrop-blur-sm rounded-2xl p-5 border relative overflow-hidden group/to transition-all duration-500",
              swapPhase === "idle" ? "border-border/50 hover:border-primary/30" : "border-primary/50",
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/to:opacity-100 transition-opacity duration-300"></div>

            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">To</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="w-3 h-3" />
                  <span>
                    Balance: {isWalletConnected(toToken) ? getTokenBalance(toToken) : "0.0000"} {toToken}
                  </span>
                  {!isWalletConnected(toToken) && (
                    <span className="text-xs text-amber-500">Connect wallet</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="number"
                    value={toAmount}
                    readOnly
                    placeholder="0.0"
                    className="w-full text-3xl font-bold bg-transparent text-card-foreground placeholder-muted-foreground/50 border-none outline-none cursor-not-allowed"
                  />
                  <div className="text-sm text-muted-foreground mt-1">
                    {toAmount && `≈ $${(Number.parseFloat(toAmount) * tokens[toToken].price).toLocaleString()}`}
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-muted/50 hover:bg-muted/70 rounded-xl px-4 py-3 cursor-pointer transition-all duration-300 hover:scale-105 group/token">
                  <div
                    className={cn(
                      "w-8 h-8 bg-gradient-to-br rounded-full flex items-center justify-center shadow-lg",
                      tokens[toToken].color,
                    )}
                  >
                    <span className="text-white text-sm font-bold">{tokens[toToken].icon}</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-card-foreground">{toToken}</div>
                    <div className="text-xs text-muted-foreground">{tokens[toToken].name}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-hover/token:text-card-foreground transition-all duration-300 group-hover/token:rotate-180" />
                </div>
              </div>
            </div>
          </div>

          {/* Exchange Rate Info */}
          {fromAmount && (
            <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border/30 backdrop-blur-sm animate-in slide-in-from-top-2 duration-500">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span>Exchange Rate</span>
                  </div>
                  <span className="font-medium text-card-foreground">
                    1 {fromToken} = {exchangeRate} {toToken}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="text-card-foreground">~${networkFee}</span>
                </div>

                {priceImpact > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Price Impact</span>
                    <span
                      className={cn(
                        "font-medium",
                        priceImpact > 3 ? "text-red-500" : priceImpact > 1 ? "text-yellow-500" : "text-green-500",
                      )}
                    >
                      {priceImpact.toFixed(2)}%
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Minimum Received</span>
                  <span className="text-card-foreground">
                    {toAmount
                      ? (Number.parseFloat(toAmount) * (1 - Number.parseFloat(slippage) / 100)).toFixed(6)
                      : "0"}{" "}
                    {toToken}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="mt-4 animate-in slide-in-from-top-2 duration-500">
              <div className="p-4 bg-muted/20 rounded-xl border border-border/30 backdrop-blur-sm">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Slippage Tolerance</label>
                    <div className="flex gap-2">
                      {["0.1", "0.5", "1.0"].map((percentage) => (
                        <button
                          key={percentage}
                          onClick={() => setSlippage(percentage)}
                          className={cn(
                            "px-3 py-2 text-sm border rounded-lg transition-all duration-300",
                            slippage === percentage
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background hover:bg-muted/50 border-input",
                          )}
                        >
                          {percentage}%
                        </button>
                      ))}
                      <input
                        type="number"
                        value={slippage}
                        onChange={(e) => setSlippage(e.target.value)}
                        placeholder="Custom"
                        className="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Time Delay (minutes)</label>
                    <input
                      type="number"
                      value={timeDelay}
                      onChange={(e) => setTimeDelay(e.target.value)}
                      placeholder="e.g., 30"
                      className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder-muted-foreground/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={swapPhase === "success" ? resetSwap : handleSwap}
            disabled={isSwapDisabled && swapPhase !== "success"}
            className={cn(
              "w-full mt-6 font-bold py-4 px-6 rounded-2xl transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-card relative overflow-hidden group/button",
              swapPhase === "success"
                ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                : isSwapDisabled
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]",
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center gap-2">{getSwapButtonContent()}</div>
          </button>

          {/* Status Messages */}
          {swapPhase !== "idle" && (
            <div className="mt-4 animate-in slide-in-from-bottom-2 duration-500">
              {swapPhase === "confirming" && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-yellow-600 dark:text-yellow-400 font-medium">Waiting for confirmation</p>
                      <p className="text-yellow-600/80 dark:text-yellow-400/80 text-xs mt-1">
                        Please confirm the transaction in your wallet
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {swapPhase === "processing" && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="text-blue-600 dark:text-blue-400 font-medium">Processing cross-chain swap</p>
                      <p className="text-blue-600/80 dark:text-blue-400/80 text-xs mt-1">
                        Your transaction is being processed securely across networks
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {swapPhase === "success" && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm flex-1">
                      <p className="text-green-600 dark:text-green-400 font-medium">Swap completed successfully!</p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-green-600/80 dark:text-green-400/80 text-xs">Transaction: 0x1234...5678</p>
                        <button className="text-green-500 hover:text-green-600 transition-colors">
                          <Copy className="w-3 h-3" />
                        </button>
                        <button className="text-green-500 hover:text-green-600 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info Banner */}
          {swapPhase === "idle" && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    Cross-chain swap powered by advanced protocols
                  </p>
                  <p className="text-blue-600/80 dark:text-blue-400/80 text-xs mt-1">
                    Your transaction will be processed securely across networks
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
