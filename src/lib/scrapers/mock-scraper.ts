import type { JobScraper, RawJobData, ScraperQuery } from './types'

/**
 * MVP用のモックスクレイパー。
 * Phase 2以降で実際のAPI連携・スクレイピングに置き換え。
 */
export const mockScraper: JobScraper = {
  name: 'mock',

  async scrape(query: ScraperQuery): Promise<RawJobData[]> {
    // 実際のスクレイパーが完成するまでのモックデータ
    const mockRawJobs: RawJobData[] = [
      {
        title: 'シニアフロントエンドエンジニア',
        companyName: '株式会社テックイノベーション',
        location: '東京都渋谷区',
        description:
          'React/Next.jsを用いた大規模Webアプリケーションの開発をリードしていただきます。チーム5名のテックリードとして、設計・実装・コードレビューを担当。TypeScript必須、3年以上の実務経験。',
        salaryText: '年収700万円〜1000万円',
        employmentType: '正社員',
        url: 'https://example.com/careers/frontend-lead',
        sourceSite: 'corporate-site',
      },
      {
        title: 'バックエンドエンジニア（Go/Python）',
        companyName: '株式会社グローバルソリューションズ',
        location: '東京都港区',
        description:
          'マイクロサービスアーキテクチャを採用したSaaSプラットフォームの開発。Go言語でのAPI開発、Pythonでのデータパイプライン構築を担当。リモート相談可。',
        salaryText: '月給45万円〜65万円（賞与年2回）',
        employmentType: '正社員',
        url: 'https://recruit-agent.example.com/jobs/backend-go',
        sourceSite: 'recruit-agent',
      },
      {
        title: 'UIデザイナー',
        companyName: '合同会社デジタルクラフト',
        location: '大阪府大阪市',
        description:
          '自社プロダクトのUI/UXデザインを担当。Figmaを使用したデザインシステムの構築・運用、ユーザーリサーチに基づくデザイン改善。ポートフォリオ必須。',
        salaryText: '年収450万円〜650万円',
        employmentType: '正社員',
        url: 'https://example.com/careers/ui-designer',
        sourceSite: 'corporate-site',
      },
      {
        title: 'インフラエンジニア（AWS）',
        companyName: '株式会社クラウドベース',
        location: '東京都千代田区',
        description:
          'AWSを中心としたクラウドインフラの設計・構築・運用。Terraform/CDKによるIaC、CI/CDパイプラインの整備。フルリモート可。',
        salaryText: '想定年収550万〜850万',
        employmentType: '正社員',
        url: 'https://doda.example.com/detail/12345',
        sourceSite: 'doda',
      },
      {
        title: 'プロダクトマネージャー',
        companyName: '株式会社ヘルステック',
        location: '東京都新宿区',
        description:
          'ヘルスケア領域のBtoB SaaSプロダクトのPM。事業戦略に基づくロードマップ策定、開発チームとの連携、KPI設計・分析。PM経験3年以上。',
        salaryText: '年収650万円〜950万円',
        employmentType: '正社員',
        url: 'https://example.com/jobs/pm',
        sourceSite: 'corporate-site',
      },
      {
        title: 'データサイエンティスト',
        companyName: '株式会社フィンテックラボ',
        location: '福岡県福岡市',
        description:
          '金融データを活用した与信モデルの開発・改善。Python/SQLでの分析基盤構築、機械学習モデルの本番適用。週3リモート可。',
        salaryText: '月給40万〜60万円（業務委託）',
        employmentType: '業務委託',
        url: 'https://jac-recruitment.example.com/jobs/ds-fintech',
        sourceSite: 'jac-recruitment',
      },
    ]

    // クエリによる簡易フィルタ
    return mockRawJobs.filter((job) => {
      if (query.location && !job.location.includes(query.location)) {
        return false
      }
      if (
        query.occupation &&
        !job.title.includes(query.occupation) &&
        !job.description.includes(query.occupation)
      ) {
        return false
      }
      return true
    })
  },
}
