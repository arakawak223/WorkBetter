/**
 * 情報元区分の判定ロジック
 *
 * 求人が「企業直接掲載」か「人材エージェント経由」かを判定する。
 * 判定優先順位:
 *   1. ドメインベース: 既知エージェントサイトのドメインリスト照合
 *   2. サイト名ベース: sourceSite の名前から判定
 *   3. 文面ベース: 求人テキスト中のキーワード検出
 *   4. フォールバック: 判定困難な場合は 'direct' とする
 */

type SourceClassification = {
  sourceType: 'direct' | 'agent'
  agentName: string | null
}

// 既知の人材エージェント・転職サイトのドメインと名称マッピング
const KNOWN_AGENTS: { pattern: RegExp; name: string }[] = [
  { pattern: /recruit-agent|r-agent\.com/i, name: 'リクルートエージェント' },
  { pattern: /doda\.jp|doda\./i, name: 'doda' },
  { pattern: /jac-recruitment/i, name: 'JACリクルートメント' },
  { pattern: /mynavi-agent|mynavi\.jp.*agent/i, name: 'マイナビエージェント' },
  { pattern: /bizreach/i, name: 'ビズリーチ' },
  { pattern: /pasona/i, name: 'パソナキャリア' },
  { pattern: /type\.jp.*agent|type-agent/i, name: 'type転職エージェント' },
  { pattern: /en-agent|en-japan.*agent/i, name: 'エン エージェント' },
  { pattern: /spring-agent|adecco/i, name: 'Spring転職エージェント' },
  { pattern: /workport/i, name: 'ワークポート' },
  { pattern: /geekly/i, name: 'Geekly' },
  { pattern: /levtech|leverages/i, name: 'レバテックキャリア' },
]

// 既知の求人アグリゲーター（直接・エージェント混在のため、文面で判断）
const AGGREGATOR_SITES = [
  /indeed/i,
  /求人ボックス|kyujin-box/i,
  /standby|スタンバイ/i,
  /linkedin/i,
]

// 文面中のエージェント関連キーワード
const AGENT_KEYWORDS = [
  '人材紹介',
  '紹介元',
  'エージェント',
  '転職支援',
  '非公開求人',
  'キャリアアドバイザー',
  'コンサルタントが',
  '紹介会社',
]

export function classifySource(
  url: string,
  sourceSite: string,
  description: string
): SourceClassification {
  // 1. ドメインベース判定
  for (const agent of KNOWN_AGENTS) {
    if (agent.pattern.test(url) || agent.pattern.test(sourceSite)) {
      return { sourceType: 'agent', agentName: agent.name }
    }
  }

  // 2. 企業サイト直接の明示的パターン
  if (
    /corporate|careers|recruit\.|採用/i.test(url) &&
    !AGGREGATOR_SITES.some((p) => p.test(url))
  ) {
    return { sourceType: 'direct', agentName: null }
  }

  // 3. 文面ベース判定
  for (const keyword of AGENT_KEYWORDS) {
    if (description.includes(keyword)) {
      return { sourceType: 'agent', agentName: null }
    }
  }

  // 4. sourceSite 名の直接的なパターン
  if (/corporate|自社|direct/i.test(sourceSite)) {
    return { sourceType: 'direct', agentName: null }
  }

  // 5. フォールバック: 不明な場合は direct
  return { sourceType: 'direct', agentName: null }
}
