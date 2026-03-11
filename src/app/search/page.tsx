import { SearchForm } from '@/components/SearchForm'

export const metadata = {
  title: '求人検索 - WorkBetter',
}

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">求人検索</h1>
      <p className="mb-8 text-muted-foreground">
        条件を入力して、あなたに最適な求人を見つけましょう
      </p>
      <SearchForm />
    </div>
  )
}
