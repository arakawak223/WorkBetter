import Anthropic from '@anthropic-ai/sdk'
import type { RawJobData, ExtractedJobData } from '@/lib/scrapers/types'
import { classifySource } from './source-classifier'

const EXTRACTION_PROMPT = `以下の求人テキストから、指定のJSONフォーマットで情報を抽出してください。
不明な項目は null にしてください。
特に「年収」は、月給・賞与・手当を合算した推定年収（下限・上限）を万円単位の数値のみで抽出してください。
月給が記載されている場合は x12 + 賞与（記載があれば）で年収を推定してください。
リモートワーク可否は、テキスト中に「リモート」「在宅」「テレワーク」等の記述があれば true にしてください。

必ず以下のJSON形式のみを返してください。説明文は不要です。

{
  "company_name": string,
  "title": string,
  "location": string,
  "remote_ok": boolean,
  "description_summary": string (100文字以内の要約),
  "salary_min": number | null (万円単位),
  "salary_max": number | null (万円単位),
  "employment_type": "full_time" | "part_time" | "contract" | "freelance" | "internship" | "other",
  "expires_at": string | null (ISO 8601形式)
}`

type ExtractionResult = {
  company_name: string
  title: string
  location: string
  remote_ok: boolean
  description_summary: string
  salary_min: number | null
  salary_max: number | null
  employment_type: string
  expires_at: string | null
}

let anthropicClient: Anthropic | null = null

function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic()
  }
  return anthropicClient
}

export async function extractJobData(
  raw: RawJobData
): Promise<ExtractedJobData> {
  const sourceInfo = classifySource(raw.url, raw.sourceSite, raw.description)

  // Claude APIキーがない場合はフォールバック（ルールベース抽出）
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackExtract(raw, sourceInfo)
  }

  try {
    const client = getClient()
    const jobText = buildJobText(raw)

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\n--- 求人テキスト ---\n${jobText}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return fallbackExtract(raw, sourceInfo)
    }

    const parsed = JSON.parse(content.text) as ExtractionResult

    return {
      companyName: parsed.company_name || raw.companyName,
      title: parsed.title || raw.title,
      location: parsed.location || raw.location,
      remoteOk: parsed.remote_ok ?? false,
      description: parsed.description_summary || raw.description,
      salaryMin: parsed.salary_min,
      salaryMax: parsed.salary_max,
      employmentType: parsed.employment_type || 'other',
      sourceType: sourceInfo.sourceType,
      agentName: sourceInfo.agentName,
      sourceUrl: raw.url,
      sourceSite: raw.sourceSite,
      expiresAt: parsed.expires_at,
    }
  } catch {
    return fallbackExtract(raw, sourceInfo)
  }
}

export async function extractJobDataBatch(
  rawJobs: RawJobData[]
): Promise<ExtractedJobData[]> {
  // 並列実行（最大5件ずつ）
  const batchSize = 5
  const results: ExtractedJobData[] = []

  for (let i = 0; i < rawJobs.length; i += batchSize) {
    const batch = rawJobs.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(extractJobData))
    results.push(...batchResults)
  }

  return results
}

function buildJobText(raw: RawJobData): string {
  const parts = [
    `企業名: ${raw.companyName}`,
    `職種: ${raw.title}`,
    `勤務地: ${raw.location}`,
    `説明: ${raw.description}`,
  ]
  if (raw.salaryText) parts.push(`給与: ${raw.salaryText}`)
  if (raw.employmentType) parts.push(`雇用形態: ${raw.employmentType}`)
  return parts.join('\n')
}

function fallbackExtract(
  raw: RawJobData,
  sourceInfo: { sourceType: 'direct' | 'agent'; agentName: string | null }
): ExtractedJobData {
  const salary = parseSalaryText(raw.salaryText)
  const remoteOk = /リモート|在宅|テレワーク/.test(
    raw.description + (raw.title || '')
  )
  const employmentType = mapEmploymentType(raw.employmentType)

  return {
    companyName: raw.companyName,
    title: raw.title,
    location: raw.location,
    remoteOk,
    description:
      raw.description.length > 100
        ? raw.description.slice(0, 100) + '...'
        : raw.description,
    salaryMin: salary.min,
    salaryMax: salary.max,
    employmentType,
    sourceType: sourceInfo.sourceType,
    agentName: sourceInfo.agentName,
    sourceUrl: raw.url,
    sourceSite: raw.sourceSite,
    expiresAt: null,
  }
}

function parseSalaryText(
  text?: string
): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null }

  // 「月給45万円〜65万円」パターン → 年収に変換（年収パターンより先にチェック）
  const monthlyMatch = text.match(
    /月給?\s*(\d+)\s*万\s*円?\s*[〜~～\-ー−]\s*(\d+)\s*万/
  )
  if (monthlyMatch) {
    const hasBonus = /賞与/.test(text)
    const months = hasBonus ? 16 : 12
    return {
      min: parseInt(monthlyMatch[1]) * months,
      max: parseInt(monthlyMatch[2]) * months,
    }
  }

  // 「年収700万円〜1000万円」パターン
  const yearlyMatch = text.match(/(\d+)\s*万\s*円?\s*[〜~～\-ー−]\s*(\d+)\s*万/)
  if (yearlyMatch) {
    return { min: parseInt(yearlyMatch[1]), max: parseInt(yearlyMatch[2]) }
  }

  // 「年収700万〜」パターン
  const yearlyMinOnly = text.match(/(\d+)\s*万\s*円?\s*[〜~～\-ー−]/)
  if (yearlyMinOnly) {
    return { min: parseInt(yearlyMinOnly[1]), max: null }
  }

  return { min: null, max: null }
}

function mapEmploymentType(type?: string): string {
  if (!type) return 'other'
  if (/正社員/.test(type)) return 'full_time'
  if (/パート|アルバイト/.test(type)) return 'part_time'
  if (/契約/.test(type)) return 'contract'
  if (/業務委託|フリーランス/.test(type)) return 'freelance'
  if (/インターン/.test(type)) return 'internship'
  return 'other'
}
