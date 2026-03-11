import { defineMiddleware } from 'astro:middleware'
import fs from 'node:fs'

import { redirects } from './utils/redirects'

const enMessages = JSON.parse(
  fs.readFileSync(new URL('./content/i18n/en.json', import.meta.url), 'utf8')
) as Record<string, string>
const jpMessages = JSON.parse(
  fs.readFileSync(new URL('./content/i18n/ja.json', import.meta.url), 'utf8')
) as Record<string, string>

function resolveLocale(pathname: string): 'en' | 'jp' {
  const localeMatch = pathname.match(/^\/docs\/([a-z]{2})(?:\/|$)/)
  if (!localeMatch) return 'en'
  return localeMatch[1] === 'jp' || localeMatch[1] === 'ja' ? 'jp' : 'en'
}

function translate(locale: 'en' | 'jp', key: string): string {
  const localeMessages = locale === 'jp' ? jpMessages : enMessages
  return localeMessages[key] || enMessages[key] || key
}

export const onRequest = defineMiddleware((context, next) => {
  const { request, redirect, locals } = context
  const url = new URL(request.url)
  const path = url.pathname.replace(/\/$/, '')
  const locale = resolveLocale(url.pathname)

  locals.lang = locale
  locals.t = (key: string) => translate(locale, key)

  if (path === '/docs') {
    return redirect('/docs/en', 301)
  }

  if (path === '/docs/ja') {
    return redirect('/docs/jp', 301)
  }

  if (path.startsWith('/docs/ja/')) {
    return redirect(path.replace('/docs/ja/', '/docs/jp/'), 301)
  }

  // Match /docs/old-slug or /docs/{locale}/old-slug
  const match = path.match(/^\/docs(?:\/([a-z]{2}))?\/(.+)$/)
  if (match) {
    const matchedLocale = match[1]
    const slug = match[2]
    const newSlug = redirects[slug]
    if (newSlug) {
      const localizedPrefix = matchedLocale
        ? `/docs/${matchedLocale === 'ja' ? 'jp' : matchedLocale}`
        : '/docs'
      const target = `${localizedPrefix}/${newSlug}`
      return redirect(target, 301)
    }
  }

  return next()
})
