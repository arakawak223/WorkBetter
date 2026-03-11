import * as cheerio from 'cheerio'
import type { JobScraper, RawJobData, ScraperQuery } from './types'
import { getRandomUserAgent, checkRobotsTxt } from './base'

const BASE_URL = 'https://xn--free-rl4cu83al60d.com' // 求人free.com
const PAGES_PER_KEYWORD = 10

const DEFAULT_KEYWORDS = [
  'エンジニア',
  '営業',
  '事務',
  '正社員',
  '介護',
  'ドライバー',
  '飲食',
  '販売',
  '看護',
  '保育',
  '建築',
  '工場',
  'IT',
  '経理',
  '清掃',
]

function buildSearchUrl(keyword: string, location: string | undefined, page: number): string {
  const params = new URLSearchParams()
  const q = location ? `${keyword} ${location}` : keyword
  params.set('q', q)
  if (page > 1) params.set('page', String(page))
  return `${BASE_URL}/search?${params.toString()}`
}

function parseJobCards($: cheerio.CheerioAPI): RawJobData[] {
  const jobs: RawJobData[] = []

  $('div.job-item, article.job, div.search-result-item, li.job-list-item').each((_i, el) => {
    const $el = $(el)

    const titleEl = $el.find('h2 a, h3 a, .job-title a, .title a').first()
    const title = titleEl.text().trim()
    const href = titleEl.attr('href') || ''

    const companyName = $el.find('.company-name, .company, .employer').first().text().trim()
    const location = $el.find('.location, .area, .place').first().text().trim()
    const description = $el.find('.description, .detail, .snippet, p').first().text().trim()
    const salaryText = $el.find('.salary, .pay, .wage').first().text().trim()

    if (!title) return

    const jobUrl = href.startsWith('http')
      ? href
      : href.startsWith('/')
        ? `${BASE_URL}${href}`
        : ''

    if (!jobUrl) return

    jobs.push({
      title,
      companyName: companyName || '非公開',
      location: location || '日本',
      description: description || title,
      salaryText: salaryText || undefined,
      employmentType: undefined,
      url: jobUrl,
      sourceSite: 'kyujin-free',
    })
  })

  return jobs
}

async function fetchPage(url: string, label: string): Promise<RawJobData[]> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en;q=0.9',
    },
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) {
    console.warn(`[KyujinFree] ${label}: HTTP ${res.status}`)
    return []
  }

  const html = await res.text()
  const $ = cheerio.load(html)
  return parseJobCards($)
}

export const kyujinFreeScraper: JobScraper = {
  name: 'kyujin-free',

  async scrape(query: ScraperQuery): Promise<RawJobData[]> {
    try {
      const allowed = await checkRobotsTxt(BASE_URL, '/search')
      if (!allowed) {
        console.warn('[KyujinFree] Blocked by robots.txt')
        return []
      }

      const keywords = query.occupation
        ? [query.occupation]
        : DEFAULT_KEYWORDS

      const pagesPerKw = query.occupation ? PAGES_PER_KEYWORD * 2 : PAGES_PER_KEYWORD

      const fetchTasks: { url: string; label: string }[] = []
      for (const kw of keywords) {
        for (let page = 1; page <= pagesPerKw; page++) {
          fetchTasks.push({
            url: buildSearchUrl(kw, query.location, page),
            label: `${kw} pg${page}`,
          })
        }
      }

      console.log(
        `[KyujinFree] Fetching ${fetchTasks.length} pages (${keywords.length} keywords × ${pagesPerKw} pages)`
      )

      const results = await Promise.allSettled(
        fetchTasks.map(({ url, label }) => fetchPage(url, label))
      )

      const allJobs: RawJobData[] = []
      let successCount = 0
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          successCount++
          allJobs.push(...result.value)
        }
      }

      console.log(
        `[KyujinFree] Total: ${allJobs.length} jobs from ${successCount}/${fetchTasks.length} successful pages`
      )
      return allJobs
    } catch (e) {
      console.warn(
        '[KyujinFree] Scrape failed:',
        e instanceof Error ? e.message : e
      )
      return []
    }
  },
}
