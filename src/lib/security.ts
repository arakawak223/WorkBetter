import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getRateLimitKey } from './rate-limit'

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

export function withRateLimit(
  request: NextRequest,
  route: string,
  maxRequests: number = 30
): NextResponse | null {
  const ip = getClientIp(request)
  const key = getRateLimitKey(ip, route)
  const result = checkRateLimit(key, maxRequests)

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  return null
}

export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}
