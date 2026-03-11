import type { RawJobData, ExtractedJobData, JobScraper } from '@/lib/scrapers/types'
import type { SearchFormValues } from '@/lib/schemas'
import type { JobData } from '@/components/JobCard'
import { runScrapers, MAJOR_REGIONS } from '@/lib/scrapers/base'
import { mockScraper } from '@/lib/scrapers/mock-scraper'
import { indeedScraper } from '@/lib/scrapers/indeed'
import { kyujinBoxScraper } from '@/lib/scrapers/kyujin-box'
import { baitoruScraper } from '@/lib/scrapers/baitoru'
import { standbyScraper } from '@/lib/scrapers/standby'
import { careerjetScraper } from '@/lib/scrapers/careerjet'
import { kyujinFreeScraper } from '@/lib/scrapers/kyujin-free'
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
 *    - 地域未指定時は主要地域で並列検索して結果をマージ
 * 2. Claude API (or フォールバック) で構造化抽出
 * 3. 重複排除
 * 4. マッチングスコア算出
 * 5. スコア順にソートして返却
 */
export async function searchJobs(
  query: SearchFormValues
): Promise<SearchResult> {
  // 1. データ収集（全スクレイパーを並列実行、失敗しても他は続行）
  const scrapers: JobScraper[] = [
    kyujinBoxScraper,
    baitoruScraper,
    indeedScraper,
    standbyScraper,
    careerjetScraper,
    kyujinFreeScraper,
    mockScraper,
  ]

  let rawJobs: RawJobData[]

  if (query.location) {
    // 地域指定あり: 通常実行
    rawJobs = await runScrapers(scrapers, {
      occupation: query.occupation,
      location: query.location,
      salaryMin: query.salaryMin,
      salaryMax: query.salaryMax,
    })
  } else {
    // 地域未指定: 主要地域で並列検索して結果をマージ
    const regions = MAJOR_REGIONS.slice(0, 6)
    console.log(`[Pipeline] Regional search across ${regions.length} regions`)

    const regionResults = await Promise.allSettled(
      regions.map((region) =>
        runScrapers(scrapers, {
          occupation: query.occupation,
          location: region,
          salaryMin: query.salaryMin,
          salaryMax: query.salaryMax,
        })
      )
    )

    rawJobs = []
    for (const result of regionResults) {
      if (result.status === 'fulfilled') {
        rawJobs.push(...result.value)
      }
    }

    // 地域なしでも一度実行（全国求人も拾う）
    const nationalJobs = await runScrapers(scrapers, {
      occupation: query.occupation,
      salaryMin: query.salaryMin,
      salaryMax: query.salaryMax,
    })
    rawJobs.push(...nationalJobs)

    console.log(`[Pipeline] Regional search total: ${rawJobs.length} raw jobs`)
  }

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
