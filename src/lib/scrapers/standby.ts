import * as cheerio from 'cheerio'
import type { JobScraper, RawJobData, ScraperQuery } from './types'
import { getRandomUserAgent, checkRobotsTxt } from './base'

const BASE_URL = 'https://jp.stanby.com'
const PAGES_PER_KEYWORD = 10

const DEFAULT_KEYWORDS = [
  '正社員',
  'エンジニア',
  '営業',
  '事務',
  '介護',
  'ドライバー',
  '製造',
  '建設',
  '飲食',
  '販売',
  'IT プログラマー',
  '医療 看護',
  '物流 配送',
  '教育 講師',
  '金融 保険',
]

function buildSearchUrl(keyword: string, location: string | undefined, page: number): string {
  const params = new URLSearchParams()
  const q = location ? `${keyword} ${location}` : keyword
  params.set('q', q)
  params.set('num', '25')
  if (page > 1) params.set('page', String(page))
  return `${BASE_URL}/search?${params.toString()}`
}

function parseJobCards($: cheerio.CheerioAPI): RawJobData[] {
  const jobs: RawJobData[] = []

  $('div.job-card, article.job-card, div.job-list-item').each((_i, el) => {
    const $el = $(el)

    const title = $el.find('.job-card-title, .title').first().text().trim()
    const companyName = $el.find('.company').first().text().trim()

    // attribution-items contain location, salary, employment type etc.
    const attributions = $el.find('.attribution-item, .attribution-items .text')
    const attributionTexts: string[] = []
    attributions.each((_j, attr) => {
      attributionTexts.push($(attr).text().trim())
    })

    // Try to extract location, salary from attributions
    let location = ''
    let salaryText = ''
    let employmentType = ''

    for (const text of attributionTexts) {
      if (
        text.match(/[都道府県市区町村]/) ||
        text.match(/駅/) ||
        text.match(/リモート|在宅/)
      ) {
        location = location || text
      } else if (text.match(/[万円給年月収時給]/) || text.match(/\d+,?\d*円/)) {
        salaryText = salaryText || text
      } else if (
        text.match(/正社員|パート|アルバイト|契約|派遣|業務委託|インターン/)
      ) {
        employmentType = employmentType || text
      }
    }

    const description =
      $el.find('.snippet, .snippet-single-line').first().text().trim() || title

    // Find link
    const href =
      $el.find('a.job-card-title, a').first().attr('href') || ''

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
      description,
      salaryText: salaryText || undefined,
      employmentType: employmentType || undefined,
      url: jobUrl,
      sourceSite: 'stanby',
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
    console.warn(`[Stanby] ${label}: HTTP ${res.status}`)
    return []
  }

  const html = await res.text()
  const $ = cheerio.load(html)
  return parseJobCards($)
}

export const standbyScraper: JobScraper = {
  name: 'stanby',

  async scrape(query: ScraperQuery): Promise<RawJobData[]> {
    try {
      const allowed = await checkRobotsTxt(BASE_URL, '/search')
      if (!allowed) {
        console.warn('[Stanby] Blocked by robots.txt')
        return []
      }

      // 職種指定があればそのキーワードのみ、なければ複数キーワードで並列検索
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
        `[Stanby] Fetching ${fetchTasks.length} pages (${keywords.length} keywords × ${pagesPerKw} pages)`
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
        `[Stanby] Total: ${allJobs.length} jobs from ${successCount}/${fetchTasks.length} successful pages`
      )
      return allJobs
    } catch (e) {
      console.warn(
        '[Stanby] Scrape failed:',
        e instanceof Error ? e.message : e
      )
      return []
    }
  },
}
