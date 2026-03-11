'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { PREFECTURES, JOB_CATEGORIES, SALARY_RANGE } from '@/lib/constants'

export function SearchForm() {
  const router = useRouter()
  const [age, setAge] = useState('')
  const [occupation, setOccupation] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [remoteOk, setRemoteOk] = useState(false)
  const [salaryRange, setSalaryRange] = useState<number[]>([
    SALARY_RANGE.min,
    SALARY_RANGE.max,
  ])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (age) params.set('age', age)
    if (occupation) params.set('occupation', occupation)
    if (category) params.set('category', category)
    if (location) params.set('location', location)
    if (remoteOk) params.set('remoteOk', 'true')
    if (salaryRange[0] !== SALARY_RANGE.min)
      params.set('salaryMin', String(salaryRange[0]))
    if (salaryRange[1] !== SALARY_RANGE.max)
      params.set('salaryMax', String(salaryRange[1]))
    router.push(`/results?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Age */}
      <div className="space-y-2">
        <Label htmlFor="age">年齢</Label>
        <Input
          id="age"
          type="number"
          min={18}
          max={70}
          placeholder="例: 30"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
      </div>

      {/* Occupation */}
      <div className="space-y-2">
        <Label htmlFor="occupation">希望職種（フリーワード）</Label>
        <Input
          id="occupation"
          placeholder="例: フロントエンドエンジニア"
          value={occupation}
          onChange={(e) => setOccupation(e.target.value)}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>職種カテゴリ</Label>
        <Select value={category} onValueChange={(v) => setCategory(v ?? '')}>
          <SelectTrigger>
            <SelectValue placeholder="カテゴリを選択" />
          </SelectTrigger>
          <SelectContent>
            {JOB_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label>希望勤務地</Label>
        <Select value={location} onValueChange={(v) => setLocation(v ?? '')}>
          <SelectTrigger>
            <SelectValue placeholder="都道府県を選択" />
          </SelectTrigger>
          <SelectContent>
            {PREFECTURES.map((pref) => (
              <SelectItem key={pref} value={pref}>
                {pref}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Remote */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="remoteOk"
          checked={remoteOk}
          onCheckedChange={(checked) => setRemoteOk(checked === true)}
        />
        <Label htmlFor="remoteOk" className="cursor-pointer">
          リモートワーク可の求人を含む
        </Label>
      </div>

      {/* Salary Range */}
      <div className="space-y-4">
        <Label>
          希望年収: {salaryRange[0]}万円 〜 {salaryRange[1]}万円
        </Label>
        <Slider
          min={SALARY_RANGE.min}
          max={SALARY_RANGE.max}
          step={SALARY_RANGE.step}
          value={salaryRange}
          onValueChange={(v) => setSalaryRange(Array.isArray(v) ? [...v] : [v])}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{SALARY_RANGE.min}万円</span>
          <span>{SALARY_RANGE.max}万円</span>
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg">
        求人を検索する
      </Button>
    </form>
  )
}
