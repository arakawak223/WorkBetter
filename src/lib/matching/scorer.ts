import type { ExtractedJobData } from '@/lib/scrapers/types'
import type { SearchFormValues } from '@/lib/schemas'

/**
 * マッチングスコア算出（加重平均方式）
 *
 * | 項目       | 重み | ロジック                                      |
 * |-----------|------|----------------------------------------------|
 * | 年収マッチ | 40%  | 希望年収と求人年収レンジの重複度                  |
 * | 職種マッチ | 30%  | 職種キーワードの一致度                           |
 * | 勤務地マッチ| 20% | 同一市区町村100%、同一都道府県50%               |
 * | 年齢適合   | 10%  | 求人に年齢制限がなければ100%                     |
 */

type MatchWeights = {
  salary: number
  occupation: number
  location: number
  age: number
}

const DEFAULT_WEIGHTS: MatchWeights = {
  salary: 0.4,
  occupation: 0.3,
  location: 0.2,
  age: 0.1,
}

export function calculateMatchScore(
  job: ExtractedJobData,
  query: SearchFormValues,
  weights: MatchWeights = DEFAULT_WEIGHTS
): number {
  const salaryScore = scoreSalary(job, query)
  const occupationScore = scoreOccupation(job, query)
  const locationScore = scoreLocation(job, query)
  const ageScore = scoreAge(query)

  const totalScore =
    salaryScore * weights.salary +
    occupationScore * weights.occupation +
    locationScore * weights.location +
    ageScore * weights.age

  return Math.round(Math.max(0, Math.min(100, totalScore)))
}

function scoreSalary(job: ExtractedJobData, query: SearchFormValues): number {
  if (!query.salaryMin && !query.salaryMax) return 80 // 年収未指定の場合はやや高め
  if (!job.salaryMin && !job.salaryMax) return 50 // 求人側の年収が不明

  const qMin = query.salaryMin ?? 0
  const qMax = query.salaryMax ?? 9999
  const jMin = job.salaryMin ?? 0
  const jMax = job.salaryMax ?? 9999

  // 年収レンジの重複度を計算
  const overlapStart = Math.max(qMin, jMin)
  const overlapEnd = Math.min(qMax, jMax)

  if (overlapStart > overlapEnd) {
    // 重複なし: 離れ具合に応じて減点
    const gap = overlapStart - overlapEnd
    return Math.max(0, 100 - gap * 0.2)
  }

  const overlapRange = overlapEnd - overlapStart
  const queryRange = qMax - qMin || 1
  const coverage = overlapRange / queryRange

  return Math.min(100, coverage * 100)
}

function scoreOccupation(
  job: ExtractedJobData,
  query: SearchFormValues
): number {
  if (!query.occupation && !query.category) return 70

  let score = 0
  const jobText = `${job.title} ${job.description}`.toLowerCase()

  // フリーワードマッチ
  if (query.occupation) {
    const keywords = query.occupation
      .toLowerCase()
      .split(/[\s　,、]+/)
      .filter(Boolean)
    if (keywords.length > 0) {
      const matched = keywords.filter((kw) => jobText.includes(kw)).length
      score = (matched / keywords.length) * 100
    }
  }

  // カテゴリマッチ（ボーナスポイント）
  if (query.category) {
    const categoryKeywords = getCategoryKeywords(query.category)
    const categoryMatched = categoryKeywords.filter((kw) =>
      jobText.includes(kw)
    ).length
    if (categoryMatched > 0) {
      score = Math.min(100, score + 20)
    }
  }

  return score
}

function scoreLocation(
  job: ExtractedJobData,
  query: SearchFormValues
): number {
  if (!query.location) return 70

  // リモートOK かつ ユーザーがリモート希望
  if (query.remoteOk && job.remoteOk) return 100

  const jobLocation = job.location

  // 完全一致（同一市区町村）
  if (jobLocation.includes(query.location)) return 100

  // 都道府県レベルの一致
  const queryPref = extractPrefecture(query.location)
  const jobPref = extractPrefecture(jobLocation)
  if (queryPref && jobPref && queryPref === jobPref) return 50

  // リモートOKなら部分評価
  if (job.remoteOk) return 40

  return 0
}

function scoreAge(query: SearchFormValues): number {
  // MVP: 年齢制限のある求人データがまだないため、常に高スコア
  // Phase 3 で求人の対象年齢情報を抽出した際にロジック追加
  if (!query.age) return 80
  return 90
}

function extractPrefecture(location: string): string | null {
  const match = location.match(
    /^(北海道|東京都|(?:京都|大阪)府|.+?県)/
  )
  return match ? match[1] : null
}

function getCategoryKeywords(category: string): string[] {
  const map: Record<string, string[]> = {
    'エンジニア・IT': [
      'エンジニア',
      'developer',
      'プログラマ',
      '開発',
      'システム',
      'IT',
      'インフラ',
      'SRE',
    ],
    '営業': ['営業', 'セールス', 'sales', 'アカウント'],
    '事務・管理': ['事務', '管理', 'アシスタント', '秘書'],
    'マーケティング': [
      'マーケティング',
      'marketing',
      'グロース',
      '広告',
      'PR',
    ],
    '企画': ['企画', 'プランナー', '戦略'],
    'デザイン・クリエイティブ': [
      'デザイナー',
      'デザイン',
      'UI',
      'UX',
      'クリエイティブ',
    ],
    '人事・総務': ['人事', 'HR', '総務', '採用'],
    '経理・財務': ['経理', '財務', '会計', 'ファイナンス'],
    '法務': ['法務', 'リーガル', 'コンプライアンス'],
    'コンサルタント': ['コンサルタント', 'コンサル', 'アドバイザー'],
    '医療・介護': ['医療', '看護', '介護', '薬剤'],
    '教育': ['教育', '講師', '教員', 'トレーナー'],
    '製造・技術': ['製造', '生産', '品質', '技術'],
    '建築・土木': ['建築', '土木', '施工', '設計'],
    '販売・サービス': ['販売', '接客', 'サービス', '店舗'],
    '物流・運輸': ['物流', '運輸', '配送', '倉庫'],
  }
  return map[category] ?? []
}
