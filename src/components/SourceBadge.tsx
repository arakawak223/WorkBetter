import { Badge } from '@/components/ui/badge'

type SourceBadgeProps = {
  sourceType: 'direct' | 'agent'
  agentName?: string | null
}

export function SourceBadge({ sourceType, agentName }: SourceBadgeProps) {
  if (sourceType === 'direct') {
    return (
      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
        企業直接
      </Badge>
    )
  }

  return (
    <Badge variant="secondary">
      エージェント{agentName ? `(${agentName})` : '経由'}
    </Badge>
  )
}
