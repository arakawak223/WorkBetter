'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { JobList } from '@/components/JobList'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { JobData } from '@/components/JobCard'

type SortKey = 'matchScore' | 'salaryMax' | 'newest'

function sortJobs(jobs: JobData[], sortKey: SortKey): JobData[] {
  const sorted = [...jobs]
  switch (sortKey) {
    case 'matchScore':
      return sorted.sort(
        (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)
      )
    case 'salaryMax':
      return sorted.sort(
        (a, b) => (b.salaryMax ?? 0) - (a.salaryMax ?? 0)
      )
    case 'newest':
    default:
      return sorted
  }
}

export function ResultsContent() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [jobs, setJobs] = useState<JobData[]>([])
  const [sortKey, setSortKey] = useState<SortKey>('matchScore')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchResults() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?${searchParams.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setJobs(data.jobs)
        }
      } catch {
        // エラー時は空リスト
        setJobs([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchResults()
  }, [searchParams])

  const filteredJobs =
    sourceFilter === 'all'
      ? jobs
      : jobs.filter((j) => j.sourceType === sourceFilter)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/search"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          条件を変更
        </Link>
        <div className="flex gap-2">
          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v ?? 'all')}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て</SelectItem>
              <SelectItem value="direct">企業直接</SelectItem>
              <SelectItem value="agent">エージェント</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey((v ?? 'matchScore') as SortKey)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="matchScore">マッチ度順</SelectItem>
              <SelectItem value="salaryMax">年収順</SelectItem>
              <SelectItem value="newest">新着順</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <JobList
        jobs={sortJobs(filteredJobs, sortKey)}
        isLoading={isLoading}
      />
    </div>
  )
}
