'use client'

import { use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SourceBadge } from '@/components/SourceBadge'
import { FavoriteButton } from '@/components/FavoriteButton'
import { MOCK_JOBS } from '@/lib/mock-data'

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

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  // MVP: モックデータから取得。Phase 2以降でDB連携に置き換え
  const job = MOCK_JOBS.find((j) => j.id === id)

  if (!job) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/results"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-6')}
      >
        &larr; 検索結果に戻る
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{job.title}</CardTitle>
              <p className="text-lg text-muted-foreground">
                {job.companyName}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {job.matchScore !== undefined && (
                <Badge variant="outline" className="text-lg px-3 py-1">
                  マッチ度 {job.matchScore}%
                </Badge>
              )}
              <FavoriteButton jobId={job.id} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{job.location}</Badge>
            {job.remoteOk && <Badge variant="outline">リモート可</Badge>}
            <Badge variant="outline">
              {formatEmploymentType(job.employmentType)}
            </Badge>
            <SourceBadge
              sourceType={job.sourceType}
              agentName={job.agentName}
            />
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 font-semibold">給与条件</h3>
            <p className="text-muted-foreground">
              {job.salaryMin && job.salaryMax
                ? `${job.salaryMin}万円 〜 ${job.salaryMax}万円`
                : job.salaryMin
                  ? `${job.salaryMin}万円〜`
                  : job.salaryMax
                    ? `〜${job.salaryMax}万円`
                    : '応相談'}
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 font-semibold">仕事内容</h3>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {job.description}
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 font-semibold">情報元</h3>
            <div className="flex items-center gap-2">
              <SourceBadge
                sourceType={job.sourceType}
                agentName={job.agentName}
              />
              <span className="text-sm text-muted-foreground">
                {job.sourceType === 'direct'
                  ? '企業が直接掲載した求人です'
                  : `人材エージェント${job.agentName ? `（${job.agentName}）` : ''}経由の求人です`}
              </span>
            </div>
          </div>

          <Separator />

          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
          >
            元サイトで詳細を確認
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
