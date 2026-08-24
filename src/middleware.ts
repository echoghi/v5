import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware((context, next) => {
  const { pathname, search } = context.url

  if (pathname === '/blog' || pathname.startsWith('/blog/')) {
    const legacySuffix = pathname
      .slice('/blog'.length)
      .replace(/\/+$/, '')
    return context.redirect(`/posts${legacySuffix}${search}`, 308)
  }

  return next()
})
