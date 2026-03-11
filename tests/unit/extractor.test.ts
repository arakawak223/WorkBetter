import { describe, it, expect } from 'vitest'
import { extractJobData } from '@/lib/processing/extractor'
import type { RawJobData } from '@/lib/scrapers/types'

function makeRawJob(overrides: Partial<RawJobData> = {}): RawJobData {
  return {
    companyName: '株式会社テスト',
    title: 'エンジニア',
    location: '東京都渋谷区',
    description: 'Webアプリケーション開発を担当。リモートワーク可能。',
    url: 'https://example.com/jobs/1',
    sourceSite: 'example.com',
    ...overrides,
  }
}

describe('extractJobData (fallback mode, no API key)', () => {
  it('should extract basic fields from raw data', async () => {
    const raw = makeRawJob()
    const result = await extractJobData(raw)
    expect(result.companyName).toBe('株式会社テスト')
    expect(result.title).toBe('エンジニア')
    expect(result.location).toBe('東京都渋谷区')
    expect(result.sourceUrl).toBe('https://example.com/jobs/1')
  })

  it('should detect remote work from description', async () => {
    const result = await extractJobData(
      makeRawJob({ description: 'リモートワーク可能な職場です' })
    )
    expect(result.remoteOk).toBe(true)
  })

  it('should not detect remote when not mentioned', async () => {
    const result = await extractJobData(
      makeRawJob({ description: 'オフィスでの勤務です' })
    )
    expect(result.remoteOk).toBe(false)
  })

  it('should parse yearly salary range', async () => {
    const result = await extractJobData(
      makeRawJob({ salaryText: '年収700万円〜1000万円' })
    )
    expect(result.salaryMin).toBe(700)
    expect(result.salaryMax).toBe(1000)
  })

  it('should parse salary with min only', async () => {
    const result = await extractJobData(
      makeRawJob({ salaryText: '年収500万円〜' })
    )
    expect(result.salaryMin).toBe(500)
    expect(result.salaryMax).toBeNull()
  })

  it('should parse monthly salary and convert to yearly', async () => {
    const result = await extractJobData(
      makeRawJob({ salaryText: '月給40万円〜60万円' })
    )
    expect(result.salaryMin).toBe(480) // 40 * 12
    expect(result.salaryMax).toBe(720) // 60 * 12
  })

  it('should account for bonus in monthly-to-yearly conversion', async () => {
    const result = await extractJobData(
      makeRawJob({ salaryText: '月給40万円〜60万円 賞与年2回' })
    )
    expect(result.salaryMin).toBe(640) // 40 * 16
    expect(result.salaryMax).toBe(960) // 60 * 16
  })

  it('should return null salary when no salary text', async () => {
    const result = await extractJobData(makeRawJob({ salaryText: undefined }))
    expect(result.salaryMin).toBeNull()
    expect(result.salaryMax).toBeNull()
  })

  it('should map employment types correctly', async () => {
    const fullTime = await extractJobData(makeRawJob({ employmentType: '正社員' }))
    expect(fullTime.employmentType).toBe('full_time')

    const contract = await extractJobData(makeRawJob({ employmentType: '契約社員' }))
    expect(contract.employmentType).toBe('contract')

    const freelance = await extractJobData(makeRawJob({ employmentType: '業務委託' }))
    expect(freelance.employmentType).toBe('freelance')
  })

  it('should truncate long descriptions to 100 chars', async () => {
    const longDesc = 'あ'.repeat(200)
    const result = await extractJobData(makeRawJob({ description: longDesc }))
    expect(result.description.length).toBeLessThanOrEqual(103) // 100 + '...'
  })

  it('should classify source from URL', async () => {
    const result = await extractJobData(
      makeRawJob({ url: 'https://doda.jp/detail/123', sourceSite: 'doda' })
    )
    expect(result.sourceType).toBe('agent')
    expect(result.agentName).toBe('doda')
  })
})
