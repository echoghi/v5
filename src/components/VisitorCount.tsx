import { useEffect, useState } from 'react'
import { EyeIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VisitorCountProps {
  path: string
}

export default function VisitorCount({ path }: VisitorCountProps) {
  const [views, setViews] = useState<number | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchViews() {
      try {
        const res = await fetch(
          `/api/pageviews?path=${encodeURIComponent(path)}`,
        )
        if (!res.ok) throw new Error('Failed')

        const data = await res.json()
        setViews(data.pageviews)
      } catch {
        setError(true)
      }
    }

    fetchViews()
  }, [path])

  return (
    <div className={cn(`flex items-center gap-1`, error && 'hidden')}>
      <EyeIcon className="size-3" />{' '}
      {error || views === null ? '0' : views.toLocaleString()}
    </div>
  )
}
