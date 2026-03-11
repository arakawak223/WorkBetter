import * as cheerio from 'cheerio'
import type { JobScraper, RawJobData, ScraperQuery } from './types'
import { getRandomUserAgent, checkRobotsTxt } from './base'

const BASE_URL = 'https://xn--pckua2a7gp15o89zb.com' // 求人ボックス
const PAGES_PER_KEYWORD = 5 // 各キーワードから取得するページ数

// 職種未指定時に複数キーワードで並列検索して結果を増やす
const DEFAULT_KEYWORDS = [
  '正社員',
  'パート アルバイト',
  '契約社員',
  '派遣',
  'エンジニア',
  '営業',
  '事務',
  '医療 介護',
]

function buildSearchUrl(
  keyword: string,
  location: string | undefined,
  page: number
): string {
  const parts: string[] = [keyword, 'の仕事']
  if (location) parts.push(`-${location}`)
  const base = `${BASE_URL}/${encodeURIComponent(parts.join(''))}`
  if (page > 1) return `${base}?pg=${page}`
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
  label: string
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
    console.warn(`[KyujinBox] ${label}: HTTP ${res.status}`)
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

      // 職種指定があればそのキーワードのみ、なければ複数キーワードで並列検索
      const keywords = query.occupation
        ? [query.occupation]
        : DEFAULT_KEYWORDS

      // ページ数: 指定キーワード時は多め、デフォルト時はキーワード数が多いので少なめ
      const pagesPerKw = query.occupation
        ? 20 // 特定職種: 20ページ ≒ 500件
        : PAGES_PER_KEYWORD // 全カテゴリ: 5ページ × 8キーワード ≒ 1000件

      // 全キーワード×全ページのフェッチタスクを生成
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
        `[KyujinBox] Fetching ${fetchTasks.length} pages (${keywords.length} keywords × ${pagesPerKw} pages)`
      )

      // 並列実行（Promise.allSettledで失敗を許容）
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
        `[KyujinBox] Total: ${allJobs.length} jobs from ${successCount}/${fetchTasks.length} successful pages`
      )
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
