import { NextRequest, NextResponse } from 'next/server'
import { searchSchema } from '@/lib/schemas'
import { searchJobs } from '@/lib/processing/pipeline'
import { withRateLimit } from '@/lib/security'

// Proプラン以上で60秒まで利用可能（Hobbyは10秒制限）
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const rateLimitResponse = withRateLimit(request, '/api/search', 30)
  if (rateLimitResponse) return rateLimitResponse

  const { searchParams } = request.nextUrl

  const rawQuery = {
    age: searchParams.get('age')
      ? Number(searchParams.get('age'))
      : undefined,
    occupation: searchParams.get('occupation') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    location: searchParams.get('location') ?? undefined,
    remoteOk: searchParams.get('remoteOk') === 'true',
    salaryMin: searchParams.get('salaryMin')
      ? Number(searchParams.get('salaryMin'))
      : undefined,
    salaryMax: searchParams.get('salaryMax')
      ? Number(searchParams.get('salaryMax'))
      : undefined,
  }

  const parsed = searchSchema.safeParse(rawQuery)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid search parameters', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { jobs, debug } = await searchJobs(parsed.data)

  return NextResponse.json({ jobs, total: jobs.length, debug })
}
