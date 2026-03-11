import type { RawJobData, ExtractedJobData, JobScraper } from '@/lib/scrapers/types'
import type { SearchFormValues } from '@/lib/schemas'
import type { JobData } from '@/components/JobCard'
import { runScrapers } from '@/lib/scrapers/base'
import { mockScraper } from '@/lib/scrapers/mock-scraper'
import { indeedScraper } from '@/lib/scrapers/indeed'
import { kyujinBoxScraper } from '@/lib/scrapers/kyujin-box'
import { baitoruScraper } from '@/lib/scrapers/baitoru'
import { extractJobDataBatch } from './extractor'
import { deduplicateJobs } from './dedup'
import { calculateMatchScore } from '@/lib/matching/scorer'

export type SearchResult = {
  jobs: JobData[]
  debug?: {
    rawCount: number
    extractedCount: number
    uniqueCount: number
  }
}

/**
 * 検索パイプライン全体フロー:
 * 1. 実スクレイパー + モックで生データ収集（並列実行）
 * 2. Claude API (or フォールバック) で構造化抽出
 * 3. 重複排除
 * 4. マッチングスコア算出
 * 5. スコア順にソートして返却
 */
export async function searchJobs(
  query: SearchFormValues
): Promise<SearchResult> {
  // 1. データ収集（全スクレイパーを並列実行、失敗しても他は続行）
  const scrapers: JobScraper[] = [kyujinBoxScraper, baitoruScraper, indeedScraper, mockScraper]
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

  return {
    jobs: results,
    debug: {
      rawCount: rawJobs.length,
      extractedCount: extracted.length,
      uniqueCount: unique.length,
    },
  }
}
