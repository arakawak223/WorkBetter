'use client'

import { useState, useEffect, useCallback } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'

export function FavoriteButton({ jobId }: { jobId: string }) {
  const { user, session } = useAuth()
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const authHeaders = useCallback((): Record<string, string> => {
    if (!session?.access_token) return {}
    return { Authorization: `Bearer ${session.access_token}` }
  }, [session])

  useEffect(() => {
    if (!user) return
    fetch('/api/favorites', { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.ids?.includes(jobId)) {
          setIsFavorite(true)
        }
      })
      .catch(() => {})
  }, [user, jobId, authHeaders])

  async function toggleFavorite() {
    if (!user) return
    setIsLoading(true)

    if (isFavorite) {
      await fetch(`/api/favorites?jobId=${jobId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      setIsFavorite(false)
    } else {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ jobId }),
      })
      setIsFavorite(true)
    }
    setIsLoading(false)
  }

  if (!user) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFavorite}
      disabled={isLoading}
      aria-label={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
    >
      <Heart
        className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
      />
    </Button>
  )
}
