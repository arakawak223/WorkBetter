import { describe, it, expect } from 'vitest'
import { classifySource } from '@/lib/processing/source-classifier'

describe('classifySource', () => {
  describe('domain-based classification', () => {
    it('should detect Recruit Agent by URL', () => {
      const result = classifySource(
        'https://r-agent.com/jobs/123',
        'リクルートエージェント',
        ''
      )
      expect(result.sourceType).toBe('agent')
      expect(result.agentName).toBe('リクルートエージェント')
    })

    it('should detect doda by domain', () => {
      const result = classifySource('https://doda.jp/detail/123', 'doda', '')
      expect(result.sourceType).toBe('agent')
      expect(result.agentName).toBe('doda')
    })

    it('should detect BizReach', () => {
      const result = classifySource(
        'https://bizreach.jp/jobs/123',
        'BizReach',
        ''
      )
      expect(result.sourceType).toBe('agent')
      expect(result.agentName).toBe('ビズリーチ')
    })
  })

  describe('corporate site detection', () => {
    it('should detect corporate career pages as direct', () => {
      const result = classifySource(
        'https://company.co.jp/careers/123',
        '自社採用',
        'エンジニア募集'
      )
      expect(result.sourceType).toBe('direct')
      expect(result.agentName).toBeNull()
    })

    it('should detect recruit subdomain as direct', () => {
      const result = classifySource(
        'https://recruit.company.co.jp/jobs',
        'Company',
        ''
      )
      expect(result.sourceType).toBe('direct')
      expect(result.agentName).toBeNull()
    })
  })

  describe('text-based classification', () => {
    it('should detect agent keywords in description', () => {
      const result = classifySource(
        'https://unknown-site.com/jobs/1',
        'Unknown',
        'この求人は人材紹介会社を通じての募集です'
      )
      expect(result.sourceType).toBe('agent')
    })

    it('should detect non-public job keyword', () => {
      const result = classifySource(
        'https://example.com/jobs/1',
        'Example',
        '非公開求人です。キャリアアドバイザーが詳細をご案内します。'
      )
      expect(result.sourceType).toBe('agent')
    })
  })

  describe('fallback', () => {
    it('should default to direct when no patterns match', () => {
      const result = classifySource(
        'https://example.com/jobs/1',
        'Example Corp',
        'Webエンジニアを募集しています'
      )
      expect(result.sourceType).toBe('direct')
      expect(result.agentName).toBeNull()
    })
  })
})
