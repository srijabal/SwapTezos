"use client"

import { useState, useEffect } from 'react'
import { api, ApiError } from '@/lib/api'
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

export default function ApiStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [error, setError] = useState<string | null>(null)

  const checkApiHealth = async () => {
    setStatus('checking')
    setError(null)

    try {
      await api.getSystemHealth()
      setStatus('connected')
    } catch (err) {
      setStatus('error')
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Unable to connect to API')
      }
    }
  }

  useEffect(() => {
    checkApiHealth()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-background/80 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 text-sm">
          {status === 'checking' && (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span>Checking API...</span>
            </>
          )}
          {status === 'connected' && (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-green-600">API Connected</span>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="w-4 h-4 text-red-500" />
              <div>
                <div className="text-red-600">API Error</div>
                {error && <div className="text-xs text-red-500">{error}</div>}
                <button 
                  onClick={checkApiHealth}
                  className="text-xs text-blue-500 hover:text-blue-600 mt-1"
                >
                  Retry
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}