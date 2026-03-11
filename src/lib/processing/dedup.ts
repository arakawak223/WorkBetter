import { createHash } from 'crypto'
import type { ExtractedJobData } from '@/lib/scrapers/types'

/**
 * 重複排除用ハッシュを生成。
 * 「企業名 + 職種名 + 勤務地」を正規化して SHA-256 でハッシュ化。
 * 同一求人が複数媒体に掲載されていても統合される。
 */
export function generateDedupHash(job: ExtractedJobData): string {
  const normalized = [
    normalizeText(job.companyName),
    normalizeText(job.title),
    normalizeLocation(job.location),
  ].join('|')

  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * 重複を排除して一意な求人リストを返す。
 * 同一ハッシュの場合、先に来たもの（＝より高優先度のソースからのもの）を残す。
 */
export function deduplicateJobs(
  jobs: ExtractedJobData[]
): { job: ExtractedJobData; hash: string }[] {
  const seen = new Map<string, ExtractedJobData>()
  const result: { job: ExtractedJobData; hash: string }[] = []

  for (const job of jobs) {
    const hash = generateDedupHash(job)
    if (!seen.has(hash)) {
      seen.set(hash, job)
      result.push({ job, hash })
    }
  }

  return result
}

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0xfee0)
    )
    .toLowerCase()
}

function normalizeLocation(location: string): string {
  // 「東京都渋谷区恵比寿1-2-3」→「東京都渋谷区」のように市区町村レベルまで
  const match = location.match(
    /^(北海道|東京都|(?:京都|大阪)府|.+?県)(.+?[市区町村郡])?/
  )
  if (match) {
    return (match[1] + (match[2] || '')).replace(/\s+/g, '')
  }
  return normalizeText(location)
}
