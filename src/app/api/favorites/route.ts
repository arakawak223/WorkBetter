import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/helpers'
import { MOCK_JOBS } from '@/lib/mock-data'

// In-memory store for MVP (Phase 5: replace with Prisma/DB)
const favoritesStore = new Map<string, Set<string>>()

function getUserFavorites(userId: string): Set<string> {
  if (!favoritesStore.has(userId)) {
    favoritesStore.set(userId, new Set())
  }
  return favoritesStore.get(userId)!
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userFavs = getUserFavorites(user.id)
  const jobIds = Array.from(userFavs)
  const jobs = MOCK_JOBS.filter((j) => jobIds.includes(j.id))

  return NextResponse.json({ favorites: jobs, ids: jobIds })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const jobId = body.jobId as string
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const userFavs = getUserFavorites(user.id)
  userFavs.add(jobId)

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const jobId = searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const userFavs = getUserFavorites(user.id)
  userFavs.delete(jobId)

  return NextResponse.json({ success: true })
}
