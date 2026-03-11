'use client'

import Link from 'next/link'

export function Header() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          WorkBetter
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/search"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            求人検索
          </Link>
        </nav>
      </div>
    </header>
  )
}
