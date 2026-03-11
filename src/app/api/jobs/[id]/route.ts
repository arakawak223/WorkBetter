import { NextRequest, NextResponse } from 'next/server'
import { MOCK_JOBS } from '@/lib/mock-data'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // MVP: モックデータから検索。Phase 2以降でDB連携に置き換え
  const job = MOCK_JOBS.find((j) => j.id === id)

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({ job })
}
