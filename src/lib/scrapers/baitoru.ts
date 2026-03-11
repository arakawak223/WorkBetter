import * as cheerio from 'cheerio'
import type { JobScraper, RawJobData, ScraperQuery } from './types'
import { getRandomUserAgent, checkRobotsTxt } from './base'

const BASE_URL = 'https://www.baitoru.com'
const PAGES_PER_KEYWORD = 5

function buildSearchUrl(query: ScraperQuery, page: number): string {
  const keywords: string[] = []
  if (query.occupation) keywords.push(query.occupation)
  if (query.location) keywords.push(query.location)
  const kw = keywords.length > 0 ? keywords.join('+') : '正社員'
  const base = `${BASE_URL}/kw/${encodeURIComponent(kw)}/jlist/`
  if (page > 1) return `${base}?pg=${page}`
  return base
}

function parseJobCards($: cheerio.CheerioAPI): RawJobData[] {
  const jobs: RawJobData[] = []

  $('div.list-jobListDetail div.bg02').each((_i, el) => {
    const $el = $(el)

    // Title from h2 or h3 inside pt02b
    const title =
      $el.find('.pt02b h2 a span, .pt02b h3 a span').first().text().trim()
    if (!title) return

    // Company name from pt02b > p
    const companyName = $el.find('.pt02b > p').first().text().trim()

    // Location from ul02
    const locationRaw = $el.find('.pt02b .ul02 li').first().text().trim()
    const location = locationRaw
      .replace(/\[勤務地[・・面接地]*\]\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Employment type from ul01 > li
    const employmentType = $el
      .find('.pt01 .ul01 li:not(.li01):not(.li02)')
      .first()
      .text()
      .trim()

    // Salary from pt03
    const salaryText = $el.find('.pt03 dt:contains("給与") + dd em').first().text().trim()

    // Job URL
    const href =
      $el.find('a.link_job').attr('href') ||
      $el.find('.pt02b h2 a, .pt02b h3 a').first().attr('href') ||
      ''
    if (!href) return

    const jobUrl = href.startsWith('http')
      ? href
      : `${BASE_URL}${href}`

    // Description from occupation info
    const occupation = $el
      .find('.pt03 dt:contains("職種") + dd li')
      .first()
      .text()
      .trim()

    jobs.push({
      title,
      companyName: companyName || '非公開',
      location: location || '日本',
      description: occupation || title,
      salaryText: salaryText || undefined,
      employmentType: employmentType || undefined,
      url: jobUrl,
      sourceSite: 'baitoru',
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
    console.warn(`[Baitoru] ${label}: HTTP ${res.status}`)
    return []
  }

  const html = await res.text()
  const $ = cheerio.load(html)
  return parseJobCards($)
}

export const baitoruScraper: JobScraper = {
  name: 'baitoru',

  async scrape(query: ScraperQuery): Promise<RawJobData[]> {
    try {
      const allowed = await checkRobotsTxt(BASE_URL, '/kw/')
      if (!allowed) {
        console.warn('[Baitoru] Blocked by robots.txt')
        return []
      }

      const fetchTasks = Array.from(
        { length: PAGES_PER_KEYWORD },
        (_, i) => ({
          url: buildSearchUrl(query, i + 1),
          label: `pg${i + 1}`,
        })
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
        `[Baitoru] Total: ${allJobs.length} jobs from ${successCount}/${fetchTasks.length} pages`
      )
      return allJobs
    } catch (e) {
      console.warn(
        '[Baitoru] Scrape failed:',
        e instanceof Error ? e.message : e
      )
      return []
    }
  },
}
