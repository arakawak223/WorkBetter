import { describe, it, expect } from 'vitest'
import { generateDedupHash, deduplicateJobs } from '@/lib/processing/dedup'
import type { ExtractedJobData } from '@/lib/scrapers/types'

function makeJob(overrides: Partial<ExtractedJobData> = {}): ExtractedJobData {
  return {
    companyName: '株式会社テスト',
    title: 'エンジニア',
    location: '東京都渋谷区',
    remoteOk: false,
    description: 'テスト求人',
    salaryMin: 500,
    salaryMax: 800,
    employmentType: 'full_time',
    sourceType: 'direct',
    agentName: null,
    sourceUrl: 'https://example.com/jobs/1',
    sourceSite: 'example.com',
    expiresAt: null,
    ...overrides,
  }
}

describe('generateDedupHash', () => {
  it('should generate consistent hash for same input', () => {
    const job = makeJob()
    expect(generateDedupHash(job)).toBe(generateDedupHash(job))
  })

  it('should generate same hash regardless of whitespace', () => {
    const job1 = makeJob({ companyName: '株式会社テスト' })
    const job2 = makeJob({ companyName: '株式会社 テスト' })
    expect(generateDedupHash(job1)).toBe(generateDedupHash(job2))
  })

  it('should generate same hash for full-width and half-width chars', () => {
    const job1 = makeJob({ title: 'ABC' })
    const job2 = makeJob({ title: 'ＡＢＣ' })
    expect(generateDedupHash(job1)).toBe(generateDedupHash(job2))
  })

  it('should generate different hash for different jobs', () => {
    const job1 = makeJob({ title: 'フロントエンドエンジニア' })
    const job2 = makeJob({ title: 'バックエンドエンジニア' })
    expect(generateDedupHash(job1)).not.toBe(generateDedupHash(job2))
  })

  it('should normalize location to city level', () => {
    const job1 = makeJob({ location: '東京都渋谷区恵比寿1-2-3' })
    const job2 = makeJob({ location: '東京都渋谷区' })
    expect(generateDedupHash(job1)).toBe(generateDedupHash(job2))
  })
})

describe('deduplicateJobs', () => {
  it('should remove exact duplicates', () => {
    const job = makeJob()
    const result = deduplicateJobs([job, job])
    expect(result).toHaveLength(1)
  })

  it('should keep first occurrence (higher priority source)', () => {
    const job1 = makeJob({ sourceUrl: 'https://source1.com' })
    const job2 = makeJob({ sourceUrl: 'https://source2.com' })
    const result = deduplicateJobs([job1, job2])
    expect(result).toHaveLength(1)
    expect(result[0].job.sourceUrl).toBe('https://source1.com')
  })

  it('should keep different jobs', () => {
    const job1 = makeJob({ title: 'フロントエンド' })
    const job2 = makeJob({ title: 'バックエンド' })
    const result = deduplicateJobs([job1, job2])
    expect(result).toHaveLength(2)
  })

  it('should return empty array for empty input', () => {
    expect(deduplicateJobs([])).toEqual([])
  })
})
