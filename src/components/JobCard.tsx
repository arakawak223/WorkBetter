import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SourceBadge } from '@/components/SourceBadge'

export type JobData = {
  id: string
  companyName: string
  title: string
  location: string
  remoteOk: boolean
  description: string
  salaryMin: number | null
  salaryMax: number | null
  employmentType: string
  sourceType: 'direct' | 'agent'
  agentName: string | null
  sourceUrl: string
  matchScore?: number
}

function formatSalary(min: number | null, max: number | null): string {
  if (min && max) return `${min}万円 〜 ${max}万円`
  if (min) return `${min}万円〜`
  if (max) return `〜${max}万円`
  return '応相談'
}

function formatEmploymentType(type: string): string {
  const map: Record<string, string> = {
    full_time: '正社員',
    part_time: 'パート',
    contract: '契約社員',
    freelance: '業務委託',
    internship: 'インターン',
    other: 'その他',
  }
  return map[type] ?? type
}

export function JobCard({ job }: { job: JobData }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-lg leading-snug">{job.title}</CardTitle>
            <CardDescription className="text-base font-medium">
              {job.companyName}
            </CardDescription>
          </div>
          {job.matchScore !== undefined && (
            <Badge variant="outline" className="shrink-0 text-sm">
              {job.matchScore}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {job.description}
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">{job.location}</Badge>
          {job.remoteOk && <Badge variant="outline">リモート可</Badge>}
          <Badge variant="outline">
            {formatEmploymentType(job.employmentType)}
          </Badge>
          <Badge variant="outline">
            {formatSalary(job.salaryMin, job.salaryMax)}
          </Badge>
          <SourceBadge
            sourceType={job.sourceType}
            agentName={job.agentName}
          />
        </div>
        <div className="pt-1">
          <Link
            href={`/jobs/${job.id}`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            詳細を見る
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
