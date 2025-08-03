'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, CheckCircle, Clock, ArrowRight } from 'lucide-react'

interface TezosExplorerData {
  operationHash: string
  contractAddress?: string
  contractExplorer?: string
  operationExplorer: string
  storageExplorer?: string
  network: string
}

interface TezosExplorerCardProps {
  orderHash: string
  explorerData?: TezosExplorerData
  status: string
}

export default function TezosExplorerCard({ orderHash, explorerData, status }: TezosExplorerCardProps) {
  if (!explorerData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Tezos Cross-Chain Status
          </CardTitle>
          <CardDescription>
            Cross-chain swap processing...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">
              Deploying Tezos HTLC contract...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'matched':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'filled':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <ArrowRight className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'matched':
        return 'HTLC Deployed - Waiting for ETH'
      case 'filled':
        return 'Swap Completed - XTZ Transferred'
      default:
        return 'Processing'
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Tezos Cross-Chain Status
        </CardTitle>
        <CardDescription>
          {getStatusText()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Contract Information</h4>
            <div className="text-xs text-muted-foreground">
              <p>Network: {explorerData.network}</p>
              {explorerData.contractAddress && (
                <p className="truncate">Address: {explorerData.contractAddress}</p>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Transaction Info</h4>
            <div className="text-xs text-muted-foreground">
              <p className="truncate">Operation: {explorerData.operationHash}</p>
              <p>Status: Active</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Tezos Explorer Links</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {explorerData.contractExplorer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(explorerData.contractExplorer, '_blank')}
                className="w-full"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Contract
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(explorerData.operationExplorer, '_blank')}
              className="w-full"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Operation
            </Button>
            
            {explorerData.storageExplorer && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(explorerData.storageExplorer, '_blank')}
                className="w-full"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Storage
              </Button>
            )}
          </div>
        </div>

        {status === 'matched' && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              🔄 HTLC contract deployed! Waiting for ETH confirmation to reveal secret and transfer XTZ.
            </p>
          </div>
        )}

        {status === 'filled' && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              ✅ Swap completed! XTZ has been transferred to the recipient address.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}