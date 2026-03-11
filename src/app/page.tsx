'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          あなたに最適な求人を
          <br />
          瞬時に発見
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          年齢・職種・勤務地・年収を入力するだけで、ネット上の膨大な求人から最適なリストを自動生成。企業直接掲載かエージェント経由かも一目で分かります。
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/search"
            className={cn(buttonVariants({ size: 'lg' }))}
          >
            求人を検索する
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/40 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-2xl font-bold">
            WorkBetterの特徴
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">条件入力だけ</h3>
              <p className="text-sm text-muted-foreground">
                年齢・職種・勤務地・年収の4つの条件を入力するだけ。AIが最適な求人を自動で収集・整理します。
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">情報元を識別</h3>
              <p className="text-sm text-muted-foreground">
                企業の直接掲載か人材エージェント経由かをフラグで表示。応募戦略に合わせた求人選びが可能です。
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">マッチ度スコア</h3>
              <p className="text-sm text-muted-foreground">
                あなたの条件との適合度をスコアで表示。効率的に最適な求人を見つけられます。
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
