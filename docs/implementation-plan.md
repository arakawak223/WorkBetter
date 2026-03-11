# WorkBetter - 実装プロセス

## 技術スタック

| レイヤー | 技術 | 理由 |
|---------|------|------|
| フロントエンド | Next.js (App Router) + TypeScript | SSR/SSG対応、日本語SEO対策 |
| UIライブラリ | Tailwind CSS + shadcn/ui | 高速開発、一貫したデザイン |
| バックエンドAPI | Next.js API Routes | フロントと統合、デプロイ簡素化 |
| データベース | PostgreSQL (Supabase) | 認証機能付き、無料枠あり |
| ORM | Prisma | 型安全なDB操作 |
| 認証 | Supabase Auth | Google OAuth + メール認証 |
| スクレイピング | Playwright + Cheerio | 動的/静的サイト両対応 |
| データ加工 | Claude API (Haiku) | 求人テキストの構造化抽出 |
| ジョブキュー | BullMQ + Redis | バッチクロール管理 |
| デプロイ | Vercel (Web) + Railway (Worker) | 低コスト運用 |
| キャッシュ | Redis | 検索結果キャッシュ |

---

## フェーズ別実装計画

### Phase 1: MVP基盤（Week 1-2）

**目標:** 静的な検索フォームとDB設計、基本UIの構築

#### タスク:

1. **プロジェクト初期化**
   - Next.js + TypeScript セットアップ
   - Tailwind CSS + shadcn/ui 導入
   - Prisma + Supabase 接続設定
   - ESLint / Prettier 設定

2. **データベーススキーマ作成**
   ```
   prisma/schema.prisma
   - User モデル
   - Job モデル
   - SearchCondition モデル
   - Favorite モデル
   ```

3. **基本UI実装**
   ```
   app/
     page.tsx                  # ランディングページ
     search/page.tsx           # 検索入力画面
     results/page.tsx          # 検索結果一覧
     jobs/[id]/page.tsx        # 求人詳細
   components/
     SearchForm.tsx            # 検索フォーム（4条件入力）
     JobCard.tsx               # 求人カード（情報元バッジ表示付き）
     JobList.tsx               # 求人一覧
     SourceBadge.tsx           # 「企業直接」「エージェント経由」バッジ
   ```

4. **検索フォームの実装**
   - 年齢: 数値入力
   - 職種: コンボボックス（フリーワード + カテゴリ）
   - 勤務地: 都道府県ドロップダウン + リモート可チェック
   - 年収: デュアルレンジスライダー

---

### Phase 2: データ収集エンジン（Week 3-4）

**目標:** 求人データの収集・保存パイプラインの構築

#### タスク:

1. **求人API連携**
   ```
   lib/scrapers/
     base.ts                  # 共通インターフェース
     indeed.ts                # Indeed API連携
     standby.ts               # スタンバイ連携
   ```

2. **スクレイピングエンジン**
   ```
   lib/scrapers/
     playwright-scraper.ts    # 動的サイト用
     cheerio-scraper.ts       # 静的サイト用
   lib/robots.ts              # robots.txt パーサー・遵守チェック
   ```

3. **データクレンジング**
   ```
   lib/processing/
     dedup.ts                 # 重複排除（ハッシュベース）
     normalizer.ts            # 表記ゆれ統一
     extractor.ts             # Claude APIで構造化抽出
     source-classifier.ts     # 情報元区分の判定（企業直接 / エージェント経由）
   ```

   **情報元区分の判定ロジック（source-classifier.ts）:**
   - ドメインベース判定: 既知のエージェントサイト（リクルートエージェント、doda等）のドメインリストとマッチング
   - 文面ベース判定: 求人テキストに「紹介元」「エージェント」「人材紹介」等のキーワードが含まれるか
   - LLM補助判定: 上記で判定困難な場合、Claude APIで文面から推定
   - 結果を `source_type` ('direct' | 'agent') + `agent_name` としてDBに格納

4. **バッチ処理**
   ```
   workers/
     crawl-worker.ts          # 日次クロールジョブ
     cleanup-worker.ts        # 期限切れ案件の非表示化
   ```

---

### Phase 3: 検索・マッチング（Week 5-6）

**目標:** 検索ロジックとマッチングスコア算出の実装

#### タスク:

1. **検索API実装**
   ```
   app/api/
     search/route.ts          # 検索エンドポイント
     jobs/[id]/route.ts       # 求人詳細
   ```

2. **マッチングエンジン**
   ```
   lib/matching/
     scorer.ts                # マッチ度スコア算出
     ranker.ts                # 結果のランキング
   ```
   - 職種キーワード一致度（部分一致 / 類義語）
   - 勤務地マッチ
   - 年収範囲の重複度
   - 年齢制限の適合性

3. **キャッシュ層**
   - 同一条件の検索結果をRedisにキャッシュ（TTL: 1時間）
   - キャッシュヒット時は即時返却

4. **結果一覧の完成**
   - ソート機能（年収順 / マッチ度順 / 期限順 / 新着順）
   - ページネーション
   - 解析中のローディングUI

---

### Phase 4: ユーザー機能（Week 7-8）

**目標:** 認証、お気に入り、検索履歴の実装

#### タスク:

1. **認証実装**
   ```
   app/
     login/page.tsx           # ログイン
     register/page.tsx        # 新規登録
   lib/auth/
     supabase-client.ts       # Supabase Auth設定
   middleware.ts              # 認証ミドルウェア
   ```

2. **お気に入り機能**
   ```
   app/api/favorites/route.ts
   app/favorites/page.tsx
   components/FavoriteButton.tsx
   ```

3. **検索履歴**
   ```
   app/api/search-history/route.ts
   app/mypage/page.tsx
   ```

4. **マイページ**
   - プロフィール編集
   - デフォルト検索条件の設定
   - お気に入り一覧
   - 検索履歴

---

### Phase 5: 品質向上・デプロイ（Week 9-10）

**目標:** テスト、最適化、本番デプロイ

#### タスク:

1. **テスト**
   - 単体テスト: Vitest（検索ロジック、マッチング、データ加工）
   - E2Eテスト: Playwright（主要ユーザーフロー）

2. **パフォーマンス最適化**
   - 検索結果のストリーミングレスポンス
   - 画像の最適化（企業ロゴ等）
   - Core Web Vitals 対応

3. **セキュリティ対策**
   - 入力バリデーション（zod）
   - CSRFトークン
   - レートリミット
   - SQLインジェクション対策（Prisma使用で対応済み）

4. **デプロイ**
   - Vercel: フロントエンド + API Routes
   - Railway: バッチワーカー + Redis
   - Supabase: PostgreSQL + Auth
   - 環境変数の設定
   - CI/CD パイプライン（GitHub Actions）

5. **監視・ログ**
   - エラートラッキング（Sentry）
   - アクセスログ
   - クロール成功率のモニタリング

---

## ディレクトリ構成（最終形）

```
WorkBetter/
  app/
    page.tsx                    # ランディング
    layout.tsx                  # 共通レイアウト
    search/page.tsx             # 検索入力
    results/page.tsx            # 検索結果
    jobs/[id]/page.tsx          # 求人詳細
    favorites/page.tsx          # お気に入り
    login/page.tsx              # ログイン
    register/page.tsx           # 新規登録
    mypage/page.tsx             # マイページ
    api/
      search/route.ts           # 検索API
      jobs/[id]/route.ts        # 求人詳細API
      favorites/route.ts        # お気に入りAPI
      search-history/route.ts   # 検索履歴API
  components/
    ui/                         # shadcn/ui コンポーネント
    SearchForm.tsx
    JobCard.tsx
    JobList.tsx
    FavoriteButton.tsx
    Header.tsx
    Footer.tsx
  lib/
    scrapers/                   # データ収集
    processing/                 # データ加工
    matching/                   # マッチングエンジン
    auth/                       # 認証
    db.ts                       # Prismaクライアント
  workers/                      # バッチ処理
  prisma/
    schema.prisma               # DBスキーマ
    migrations/                 # マイグレーション
  public/                       # 静的ファイル
  tests/                        # テスト
```

---

## リスク・課題

| リスク | 対策 |
|--------|------|
| スクレイピング対象サイトの利用規約違反 | 公開APIを優先、robots.txt遵守、法務確認 |
| 求人データの鮮度（既に終了した案件の表示） | 日次クロールで生存確認、期限切れ自動非表示 |
| LLMによる構造化抽出の精度 | プロンプトチューニング、抽出結果のサンプル検証 |
| 対象サイトのHTML構造変更 | アラート設定、スクレイパーのモジュール化で迅速修正 |
| 初期データ量の不足 | Phase 2 で最低3サイトからの収集を確保 |
