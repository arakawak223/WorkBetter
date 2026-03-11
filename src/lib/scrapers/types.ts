export type RawJobData = {
  title: string
  companyName: string
  location: string
  description: string
  salaryText?: string
  employmentType?: string
  url: string
  sourceSite: string
  rawHtml?: string
}

export type ExtractedJobData = {
  companyName: string
  title: string
  location: string
  remoteOk: boolean
  description: string
  salaryMin: number | null
  salaryMax: number | null
  employmentType: string
  sourceType: 'direct' | 'agent'
  agentName: string | null
  sourceUrl: string
  sourceSite: string
  expiresAt: string | null
}

export interface JobScraper {
  name: string
  scrape(query: ScraperQuery): Promise<RawJobData[]>
}

export type ScraperQuery = {
  occupation?: string
  location?: string
  salaryMin?: number
  salaryMax?: number
}
