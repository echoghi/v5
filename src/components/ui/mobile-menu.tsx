import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { NAV_LINKS } from '@/site.config'
import { Archive, Briefcase, Home, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

const iconMap = {
  home: () => <Home className="h-5 w-5" />,
  blog: () => <Archive className="h-5 w-5" />,
  photos: () => <Camera className="h-5 w-5" />,
  work: () => <Briefcase className="h-5 w-5" />,
} as Record<string, () => JSX.Element>

const MobileMenu = () => {
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
        className="z-50 bg-transparent p-1 text-primary focus:outline-none"
        aria-label="Toggle Menu"
      >
        <div className="relative flex h-8 w-8 cursor-pointer">
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
          'fixed left-0 top-0 z-40 w-full bg-background pb-10 pt-[68px]',
          'transition-all duration-300 ease-in-out',
          isOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0',
        )}
      >
        <div className="space-y-4 p-4">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-md flex w-full items-center justify-start space-x-4 px-4 text-center font-medium capitalize"
              onClick={() => setIsOpen(false)}
            >
              {iconMap[item.label]()}
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MobileMenu
