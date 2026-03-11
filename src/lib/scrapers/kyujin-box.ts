import * as cheerio from 'cheerio'
import type { JobScraper, RawJobData, ScraperQuery } from './types'
import { getRandomUserAgent, checkRobotsTxt } from './base'

const BASE_URL = 'https://xn--pckua2a7gp15o89zb.com' // 求人ボックス
const MAX_PAGES = 8 // 並列取得ページ数（1ページ≒25件、最大200件）

function buildSearchUrl(query: ScraperQuery, page?: number): string {
  const keyword = query.occupation || '正社員'
  const parts: string[] = [keyword, 'の仕事']
  if (query.location) parts.push(`-${query.location}`)
  const base = `${BASE_URL}/${encodeURIComponent(parts.join(''))}`
  if (page && page > 1) return `${base}?pg=${page}`
  return base
}

function parseJobCards($: cheerio.CheerioAPI): RawJobData[] {
  const jobs: RawJobData[] = []

  // 求人ボックスはonClick内のuserHistoryStore.addDetailHistoryValuesに求人データを持つ
  $('h2.p-result_title--ver2').each((_i, el) => {
    const $el = $(el)
    const linkEl = $el.find('a.p-result_title_link').first()
    const onclick = linkEl.attr('onclick') || ''

    // addDetailHistoryValues('uid','title','company','','area','salary','employType','sourceName',...)
    const match = onclick.match(
      /addDetailHistoryValues\('([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)','([^']*)'/
    )

    const title =
      $el.find('span.p-result_name').text().trim() || match?.[2] || ''
    const companyName = match?.[3] || ''
    const location = match?.[5] || ''
    const salaryText = match?.[6] || ''
    const employmentType = match?.[7] || ''

    if (!title) return

    // Build redirect URL using the href
    const href = linkEl.attr('href') || ''
    const jobUrl = href.startsWith('http')
      ? href
      : href.startsWith('/')
        ? `${BASE_URL}${href}`
        : ''

    if (!jobUrl) return

    // Get description from the sibling content area
    const parentCard = $el.closest('div').parent()
    const description =
      parentCard
        .find('.p-result_lines, .p-result_info')
        .first()
        .text()
        .trim()
        .slice(0, 300) || title

    jobs.push({
      title: title.replace(/／/g, ' / '),
      companyName: companyName || '非公開',
      location: location || '日本',
      description,
      salaryText: salaryText || undefined,
      employmentType: employmentType || undefined,
      url: jobUrl,
      sourceSite: 'kyujin-box',
    })
  })

  return jobs
}

async function fetchPage(
  url: string,
  page: number
): Promise<RawJobData[]> {
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
    console.warn(`[KyujinBox] Page ${page}: HTTP ${res.status}`)
    return []
  }

  const html = await res.text()
  const $ = cheerio.load(html)
  return parseJobCards($)
}

export const kyujinBoxScraper: JobScraper = {
  name: 'kyujin-box',

  async scrape(query: ScraperQuery): Promise<RawJobData[]> {
    try {
      const allowed = await checkRobotsTxt(BASE_URL, '/')
      if (!allowed) {
        console.warn('[KyujinBox] Blocked by robots.txt')
        return []
      }

      // 全ページのURLを生成して並列取得
      const pageUrls = Array.from({ length: MAX_PAGES }, (_, i) => ({
        url: buildSearchUrl(query, i + 1),
        page: i + 1,
      }))

      const results = await Promise.allSettled(
        pageUrls.map(({ url, page }) => fetchPage(url, page))
      )

      const allJobs: RawJobData[] = []
      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        if (result.status === 'fulfilled') {
          console.log(
            `[KyujinBox] Page ${i + 1}: ${result.value.length} jobs`
          )
          allJobs.push(...result.value)
        } else {
          console.warn(
            `[KyujinBox] Page ${i + 1}: FAILED -`,
            result.reason
          )
        }
      }

      console.log(`[KyujinBox] Total: ${allJobs.length} jobs from ${MAX_PAGES} pages`)
      return allJobs
    } catch (e) {
      console.warn(
        '[KyujinBox] Scrape failed:',
        e instanceof Error ? e.message : e
      )
      return []
    }
  },
}
