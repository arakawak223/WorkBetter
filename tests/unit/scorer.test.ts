import { describe, it, expect } from 'vitest'
import { calculateMatchScore } from '@/lib/matching/scorer'
import type { ExtractedJobData } from '@/lib/scrapers/types'
import type { SearchFormValues } from '@/lib/schemas'

function makeJob(overrides: Partial<ExtractedJobData> = {}): ExtractedJobData {
  return {
    companyName: '株式会社テスト',
    title: 'フロントエンドエンジニア',
    location: '東京都渋谷区',
    remoteOk: true,
    description: 'React/Next.jsを用いたWebアプリケーション開発',
    salaryMin: 600,
    salaryMax: 900,
    employmentType: 'full_time',
    sourceType: 'direct',
    agentName: null,
    sourceUrl: 'https://example.com',
    sourceSite: 'example.com',
    expiresAt: null,
    ...overrides,
  }
}

function makeQuery(overrides: Partial<SearchFormValues> = {}): SearchFormValues {
  return {
    remoteOk: false,
    ...overrides,
  }
}

describe('calculateMatchScore', () => {
  it('should return a score between 0 and 100', () => {
    const score = calculateMatchScore(makeJob(), makeQuery())
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should give high score when salary range overlaps perfectly', () => {
    const job = makeJob({ salaryMin: 600, salaryMax: 900 })
    const query = makeQuery({ salaryMin: 600, salaryMax: 900 })
    const score = calculateMatchScore(job, query)
    expect(score).toBeGreaterThanOrEqual(70)
  })

  it('should give lower score when salary ranges do not overlap', () => {
    const job = makeJob({ salaryMin: 300, salaryMax: 400 })
    const query = makeQuery({ salaryMin: 800, salaryMax: 1000 })
    const scoreNoOverlap = calculateMatchScore(job, query)

    const job2 = makeJob({ salaryMin: 800, salaryMax: 1000 })
    const scoreOverlap = calculateMatchScore(job2, query)

    expect(scoreOverlap).toBeGreaterThan(scoreNoOverlap)
  })

  it('should boost score for occupation keyword match', () => {
    const job = makeJob({ title: 'フロントエンドエンジニア', description: 'React開発' })
    const withMatch = calculateMatchScore(job, makeQuery({ occupation: 'React エンジニア' }))
    const withoutMatch = calculateMatchScore(job, makeQuery({ occupation: 'Java 営業' }))
    expect(withMatch).toBeGreaterThan(withoutMatch)
  })

  it('should give 100 location score for exact match', () => {
    const job = makeJob({ location: '東京都渋谷区' })
    const query = makeQuery({ location: '東京都渋谷区' })
    const score = calculateMatchScore(job, query)
    expect(score).toBeGreaterThanOrEqual(50)
  })

  it('should give partial location score for same prefecture', () => {
    const job = makeJob({ location: '東京都新宿区' })
    const query = makeQuery({ location: '東京都' })
    const score = calculateMatchScore(job, query)
    expect(score).toBeGreaterThanOrEqual(30)
  })

  it('should handle remote preference with remote job', () => {
    const job = makeJob({ remoteOk: true, location: '大阪府大阪市' })
    const query = makeQuery({ location: '東京都', remoteOk: true })
    const score = calculateMatchScore(job, query)
    expect(score).toBeGreaterThanOrEqual(40)
  })

  it('should handle empty query gracefully', () => {
    const score = calculateMatchScore(makeJob(), makeQuery())
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
