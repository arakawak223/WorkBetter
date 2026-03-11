import type { RawJobData, ExtractedJobData } from '@/lib/scrapers/types'
import type { SearchFormValues } from '@/lib/schemas'
import type { JobData } from '@/components/JobCard'
import { runScrapers } from '@/lib/scrapers/base'
import { mockScraper } from '@/lib/scrapers/mock-scraper'
import { extractJobDataBatch } from './extractor'
import { deduplicateJobs } from './dedup'
import { calculateMatchScore } from '@/lib/matching/scorer'

/**
 * 検索パイプライン全体フロー:
 * 1. スクレイパーで生データ収集
 * 2. Claude API (or フォールバック) で構造化抽出
 * 3. 重複排除
 * 4. マッチングスコア算出
 * 5. スコア順にソートして返却
 */
export async function searchJobs(
  query: SearchFormValues
): Promise<JobData[]> {
  // 1. データ収集
  const scrapers = [mockScraper] // Phase 2+: 実際のスクレイパーを追加
  const rawJobs: RawJobData[] = await runScrapers(scrapers, {
    occupation: query.occupation,
    location: query.location,
    salaryMin: query.salaryMin,
    salaryMax: query.salaryMax,
  })

  // 2. 構造化抽出
  const extracted: ExtractedJobData[] = await extractJobDataBatch(rawJobs)

  // 3. 重複排除
  const unique = deduplicateJobs(extracted)

  // 4. マッチングスコア算出 & フォーマット
  const results: JobData[] = unique.map(({ job, hash }) => ({
    id: hash.slice(0, 12),
    companyName: job.companyName,
    title: job.title,
    location: job.location,
    remoteOk: job.remoteOk,
    description: job.description,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    employmentType: job.employmentType,
    sourceType: job.sourceType,
    agentName: job.agentName,
    sourceUrl: job.sourceUrl,
    matchScore: calculateMatchScore(job, query),
  }))

  // 5. マッチ度順ソート
  results.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))

  return results
}
