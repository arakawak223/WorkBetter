'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { JobCard, type JobData } from '@/components/JobCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function FavoritesPage() {
  const { user, session, loading } = useAuth()
  const [jobs, setJobs] = useState<JobData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!user || !session) {
      queueMicrotask(() => setIsLoading(false))
      return
    }

    fetch('/api/favorites', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => res.json())
      .then((data) => setJobs(data.favorites ?? []))
      .catch(() => setJobs([]))
      .finally(() => setIsLoading(false))
  }, [user, session, loading])

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="mb-4 text-2xl font-bold">ログインが必要です</h1>
        <p className="mb-6 text-muted-foreground">
          お気に入り機能を利用するにはログインしてください。
        </p>
        <Link href="/login" className={cn(buttonVariants())}>
          ログイン
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-8 text-2xl font-bold">お気に入り求人</h1>
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="mb-4 text-muted-foreground">
            お気に入りの求人はまだありません。
          </p>
          <Link href="/search" className={cn(buttonVariants({ variant: 'outline' }))}>
            求人を検索する
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
