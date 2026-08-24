import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { NAV_LINKS } from '@/site.config'
import { cn } from '@/lib/utils'
import { Archive, Camera, Home } from 'lucide-react'

const iconMap = {
  home: () => <Home className="h-5 w-5" />,
  posts: () => <Archive className="h-5 w-5" />,
  photos: () => <Camera className="h-5 w-5" />,
} as Record<string, () => JSX.Element>

type MobileMenuProps = {
  currentPath?: string
}

const MobileMenu = ({ currentPath = '/' }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    const handleViewTransitionStart = () => {
      setIsOpen(false)
    }

    document.addEventListener('astro:before-swap', handleViewTransitionStart)
    return () => {
      document.removeEventListener(
        'astro:before-swap',
        handleViewTransitionStart,
      )
    }
  }, [])

  return (
    <div className="flex flex-col items-center md:hidden">
      <Button
        onClick={toggleMenu}
        variant="ghost"
        size="icon"
        className="relative z-50 rounded-xl bg-transparent p-1 text-primary focus:outline-none"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        <span
          className="pointer-fine:hidden absolute left-1/2 top-1/2 size-[max(100%,3rem)] -translate-x-1/2 -translate-y-1/2"
          aria-hidden="true"
        />
        <div className="relative flex size-8 cursor-pointer">
          <div
            className={cn(
              'absolute left-1/2 top-2 h-0.5 w-5 -translate-x-1/2 bg-primary transition-transform duration-300',
              isOpen ? 'translate-y-[8px] rotate-45' : 'rotate-0',
            )}
          />

          <div
            className={cn(
              'absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 bg-primary transition-all duration-200',
              isOpen ? 'opacity-0' : 'opacity-100',
            )}
          />

          <div
            className={cn(
              'absolute bottom-2 left-1/2 h-0.5 w-5 -translate-x-1/2 bg-primary transition-transform duration-300',
              isOpen ? '-translate-y-[6px] -rotate-45' : 'rotate-0',
            )}
          />
        </div>
      </Button>

      <div
        className={cn(
          'paper-glass fixed inset-x-0 top-20 z-40 overflow-hidden rounded-2xl p-2 shadow-lg',
          'origin-top transition duration-300 ease-out motion-reduce:transition-none',
          isOpen
            ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none -translate-y-2 scale-[0.98] opacity-0',
        )}
      >
        <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={
                item.href === '/'
                  ? currentPath === '/'
                    ? 'page'
                    : undefined
                  : currentPath.startsWith(item.href)
                    ? 'page'
                    : undefined
              }
              className={cn(
                'flex w-full items-center justify-start gap-3 rounded-xl px-3 py-3 text-base font-medium capitalize text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                (item.href === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.href)) &&
                  'bg-secondary/60 text-foreground',
              )}
              onClick={() => setIsOpen(false)}
            >
              {iconMap[item.label]()}
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default MobileMenu
