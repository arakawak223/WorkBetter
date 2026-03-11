import { Suspense } from 'react'
import { ResultsContent } from './ResultsContent'

export const metadata = {
  title: '検索結果 - WorkBetter',
}

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">検索結果</h1>
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-muted-foreground">
              AIが最新の求人を収集中です...
            </p>
          </div>
        }
      >
        <ResultsContent />
      </Suspense>
    </div>
  )
}
