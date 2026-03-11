'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type SearchHistoryEntry = {
  id: string
  query: Record<string, string | number | boolean | undefined>
  createdAt: string
}

function formatQuery(query: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = []
  if (query.occupation) parts.push(`職種: ${query.occupation}`)
  if (query.location) parts.push(`勤務地: ${query.location}`)
  if (query.salaryMin || query.salaryMax) {
    const min = query.salaryMin ?? '?'
    const max = query.salaryMax ?? '?'
    parts.push(`年収: ${min}〜${max}万円`)
  }
  if (query.age) parts.push(`年齢: ${query.age}歳`)
  if (query.remoteOk) parts.push('リモート可')
  return parts.length > 0 ? parts.join(' / ') : '条件なし'
}

export default function MyPage() {
  const { user, session, loading, signOut } = useAuth()
  const router = useRouter()
  const [history, setHistory] = useState<SearchHistoryEntry[]>([])
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')

  useEffect(() => {
    if (loading || !user || !session) return

    setName(user.user_metadata?.name ?? '')

    const headers = { Authorization: `Bearer ${session.access_token}` }

    fetch('/api/search-history', { headers })
      .then((res) => res.json())
      .then((data) => setHistory(data.history ?? []))
      .catch(() => {})

    fetch('/api/favorites', { headers })
      .then((res) => res.json())
      .then((data) => setFavoriteCount(data.ids?.length ?? 0))
      .catch(() => {})
  }, [user, session, loading])

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  function replaySearch(query: Record<string, string | number | boolean | undefined>) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value))
      }
    }
    router.push(`/results?${params.toString()}`)
  }

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="mb-4 text-2xl font-bold">ログインが必要です</h1>
        <p className="mb-6 text-muted-foreground">
          マイページを利用するにはログインしてください。
        </p>
        <Link href="/login" className={cn(buttonVariants())}>
          ログイン
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="h-8 w-32 mx-auto animate-pulse rounded bg-muted" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <h1 className="text-2xl font-bold">マイページ</h1>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>プロフィール</CardTitle>
          <CardDescription>アカウント情報</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>メールアドレス</Label>
            <Input value={user?.email ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">お名前</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="お名前"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">年齢</Label>
            <Input
              id="age"
              type="number"
              min={18}
              max={70}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="30"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">お気に入り</p>
              <p className="text-2xl font-bold">{favoriteCount}件</p>
            </div>
            <Link
              href="/favorites"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              一覧を見る
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">検索履歴</p>
              <p className="text-2xl font-bold">{history.length}件</p>
            </div>
            <Link
              href="/search"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              新規検索
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Search History */}
      <Card>
        <CardHeader>
          <CardTitle>検索履歴</CardTitle>
          <CardDescription>過去の検索条件をクリックで再検索</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              検索履歴はまだありません
            </p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((entry, i) => (
                <div key={entry.id}>
                  {i > 0 && <Separator className="my-2" />}
                  <button
                    onClick={() => replaySearch(entry.query)}
                    className="w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <p className="font-medium">{formatQuery(entry.query)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Button variant="outline" onClick={handleSignOut} className="w-full">
        ログアウト
      </Button>
    </div>
  )
}
