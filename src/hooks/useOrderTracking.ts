import { useState, useEffect } from 'react'
import { api, OrderStatus, ApiError } from '@/lib/api'

export const useOrderTracking = (orderHash: string | null, skip: boolean = false) => {
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderHash || skip) {
      setOrderStatus(null)
      setError(null)
      return
    }

    const fetchOrderStatus = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const status = await api.getOrderStatus(orderHash)
        setOrderStatus(status)
      } catch (err) {
        console.error('Failed to fetch order status:', err)
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Failed to fetch order status')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrderStatus()

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchOrderStatus, 30000)
    return () => clearInterval(interval)
  }, [orderHash])

  return { orderStatus, isLoading, error }
}