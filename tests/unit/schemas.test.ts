import { describe, it, expect } from 'vitest'
import { searchSchema } from '@/lib/schemas'

describe('searchSchema', () => {
  it('should accept valid search params', () => {
    const result = searchSchema.safeParse({
      age: 30,
      occupation: 'エンジニア',
      location: '東京都',
      remoteOk: true,
      salaryMin: 500,
      salaryMax: 1000,
    })
    expect(result.success).toBe(true)
  })

  it('should accept empty query with defaults', () => {
    const result = searchSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.remoteOk).toBe(false)
    }
  })

  it('should reject age below 18', () => {
    const result = searchSchema.safeParse({ age: 15 })
    expect(result.success).toBe(false)
  })

  it('should reject age above 70', () => {
    const result = searchSchema.safeParse({ age: 71 })
    expect(result.success).toBe(false)
  })

  it('should reject negative salary', () => {
    const result = searchSchema.safeParse({ salaryMin: -100 })
    expect(result.success).toBe(false)
  })

  it('should reject non-integer age', () => {
    const result = searchSchema.safeParse({ age: 25.5 })
    expect(result.success).toBe(false)
  })

  it('should reject overly long occupation string', () => {
    const result = searchSchema.safeParse({ occupation: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('should accept occupation at max length', () => {
    const result = searchSchema.safeParse({ occupation: 'a'.repeat(200) })
    expect(result.success).toBe(true)
  })
})
