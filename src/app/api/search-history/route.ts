import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/helpers'

type SearchHistoryEntry = {
  id: string
  query: Record<string, string | number | boolean | undefined>
  createdAt: string
}

// In-memory store for MVP (Phase 5: replace with Prisma/DB)
const historyStore = new Map<string, SearchHistoryEntry[]>()

export function addSearchHistory(
  userId: string,
  query: Record<string, string | number | boolean | undefined>
) {
  if (!historyStore.has(userId)) {
    historyStore.set(userId, [])
  }
  const entries = historyStore.get(userId)!
  entries.unshift({
    id: crypto.randomUUID(),
    query,
    createdAt: new Date().toISOString(),
  })
  // Keep last 50 entries
  if (entries.length > 50) {
    entries.length = 50
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const entries = historyStore.get(user.id) ?? []
  return NextResponse.json({ history: entries })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  historyStore.delete(user.id)
  return NextResponse.json({ success: true })
}
