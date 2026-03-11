import type { JobScraper, RawJobData, ScraperQuery } from './types'

export const MAJOR_REGIONS = [
  '東京都',
  '大阪府',
  '愛知県',
  '福岡県',
  '北海道',
  '宮城県',
  '神奈川県',
  '埼玉県',
  '千葉県',
  '京都府',
  '兵庫県',
  '広島県',
]

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

export async function checkRobotsTxt(
  baseUrl: string,
  path: string
): Promise<boolean> {
  try {
    const robotsUrl = new URL('/robots.txt', baseUrl).toString()
    const res = await fetch(robotsUrl, {
      headers: { 'User-Agent': getRandomUserAgent() },
    })
    if (!res.ok) return true // robots.txt がなければ許可と判断

    const text = await res.text()
    const lines = text.split('\n')
    let isRelevantAgent = false

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase()
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.replace('user-agent:', '').trim()
        isRelevantAgent = agent === '*'
      }
      if (isRelevantAgent && trimmed.startsWith('disallow:')) {
        const disallowed = trimmed.replace('disallow:', '').trim()
        if (disallowed && path.startsWith(disallowed)) {
          return false
        }
      }
    }
    return true
  } catch {
    return true
  }
}

export type ScraperResult = {
  jobs: RawJobData[]
  sources: { name: string; count: number; error?: string }[]
}

export async function runScrapers(
  scrapers: JobScraper[],
  query: ScraperQuery
): Promise<RawJobData[]> {
  const results = await Promise.allSettled(
    scrapers.map((s) => s.scrape(query))
  )

  const allJobs: RawJobData[] = []
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const name = scrapers[i].name
    if (result.status === 'fulfilled') {
      console.log(`[Scraper] ${name}: ${result.value.length} jobs`)
      allJobs.push(...result.value)
    } else {
      console.warn(`[Scraper] ${name}: FAILED -`, result.reason)
    }
  }
  return allJobs
}
