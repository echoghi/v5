import { cn } from '@/lib/utils'
import { type VariantProps, cva } from 'class-variance-authority'
import { Hash } from 'lucide-react'
import * as React from 'react'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border border-foreground/10 py-1 pl-1.5 pr-2.5 font-sans text-base font-normal text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary/55 text-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'bg-background/45 text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  showHash?: boolean
}

function Badge({ className, variant, showHash = true, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {showHash && <Hash className="size-4 sm:size-3.5" />}
      {props.children}
    </div>
  )
}

export { Badge, badgeVariants }
