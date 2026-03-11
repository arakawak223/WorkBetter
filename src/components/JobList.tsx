'use client'

import { JobCard, type JobData } from '@/components/JobCard'

type JobListProps = {
  jobs: JobData[]
  isLoading?: boolean
}

export function JobList({ jobs, isLoading }: JobListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground">
          AIが最新の求人を収集中です...
        </p>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-muted-foreground">
          条件に一致する求人が見つかりませんでした
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          条件を変更して再度検索してみてください
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {jobs.length}件の求人が見つかりました
      </p>
      <div className="grid gap-4">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}
