import * as cheerio from 'cheerio'
import type { JobScraper, RawJobData, ScraperQuery } from './types'
import { getRandomUserAgent, checkRobotsTxt } from './base'

const BASE_URL = 'https://jp.indeed.com'
const PAGES_TO_FETCH = 10 // 各キーワード最大10ページ（1ページ≒15件）

const DEFAULT_KEYWORDS = [
  '正社員',
  'エンジニア',
  '営業',
  '事務',
  '医療',
  'マーケティング',
  '製造',
  '物流',
  '建設',
  'IT',
  '介護',
  '飲食',
  '教育',
  '金融',
  '販売',
]

function buildSearchUrl(query: ScraperQuery, start: number): string {
  const params = new URLSearchParams()
  const keywords: string[] = []
  if (query.occupation) keywords.push(query.occupation)
  if (keywords.length > 0) params.set('q', keywords.join(' '))
  if (query.location) params.set('l', query.location)
  if (query.salaryMin) {
    params.set('salary', `${query.salaryMin}万円`)
  }
  params.set('fromage', '14') // 過去14日以内
  params.set('limit', '20')
  if (start > 0) params.set('start', String(start))
  return `${BASE_URL}/jobs?${params.toString()}`
}

function parseJobCards($: cheerio.CheerioAPI): RawJobData[] {
  const jobs: RawJobData[] = []

  // Indeed uses various selectors for job cards
  $('div.job_seen_beacon, div.resultContent, div[data-jk]').each((_i, el) => {
    const $el = $(el)

    const titleEl = $el.find('h2.jobTitle a, h2 a, a[data-jk]').first()
    const title = titleEl.text().trim()
    const href = titleEl.attr('href') || ''

    const companyName = $el
      .find('[data-testid="company-name"], span.companyName, .company')
      .first()
      .text()
      .trim()

    const location = $el
      .find('[data-testid="text-location"], div.companyLocation, .location')
      .first()
      .text()
      .trim()

    const description = $el
      .find('.job-snippet, .summary, [data-testid="jobDescriptionText"]')
      .first()
      .text()
      .trim()

    const salaryText = $el
      .find(
        '.salary-snippet-container, .salaryText, [data-testid="attribute_snippet_testid"]'
      )
      .first()
      .text()
      .trim()

    if (!title || !companyName) return

    const jobUrl = href.startsWith('http')
      ? href
      : href.startsWith('/')
        ? `${BASE_URL}${href}`
        : `${BASE_URL}/jobs?vjk=${href}`

    jobs.push({
      title,
      companyName,
      location: location || '日本',
      description: description || title,
      salaryText: salaryText || undefined,
      employmentType: undefined,
      url: jobUrl,
      sourceSite: 'indeed',
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
    console.warn(`[Indeed] ${label}: HTTP ${res.status}`)
    return []
  }

  const html = await res.text()
  const $ = cheerio.load(html)
  return parseJobCards($)
}

export const indeedScraper: JobScraper = {
  name: 'indeed',

  async scrape(query: ScraperQuery): Promise<RawJobData[]> {
    try {
      const allowed = await checkRobotsTxt(BASE_URL, '/jobs')
      if (!allowed) {
        console.warn('[Indeed] Blocked by robots.txt')
        return []
      }

      // 職種指定があればそのキーワードのみ、なければ複数キーワードで並列検索
      const keywords = query.occupation
        ? [query.occupation]
        : DEFAULT_KEYWORDS

      const pagesPerKw = query.occupation ? PAGES_TO_FETCH : 5

      const fetchTasks: { url: string; label: string }[] = []
      for (const kw of keywords) {
        const kwQuery = { ...query, occupation: kw }
        for (let page = 0; page < pagesPerKw; page++) {
          fetchTasks.push({
            url: buildSearchUrl(kwQuery, page * 20),
            label: `${kw} start=${page * 20}`,
          })
        }
      }

      console.log(
        `[Indeed] Fetching ${fetchTasks.length} pages (${keywords.length} keywords × ${pagesPerKw} pages)`
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
        `[Indeed] Total: ${allJobs.length} jobs from ${successCount}/${fetchTasks.length} successful pages`
      )
      return allJobs
    } catch (e) {
      console.warn('[Indeed] Scrape failed:', e instanceof Error ? e.message : e)
      return []
    }
  },
}
