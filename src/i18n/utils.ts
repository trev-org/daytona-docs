import config from '../../gt.config.json'

const defaultLocale = config.defaultLocale

function normalizeLocale(locale: string): string {
  if (locale === 'ja') return 'jp'
  return locale
}

/**
 * Localizes a path to a given locale.
 * @param path - The path to localize.
 * @param locale - The locale to localize to.
 * @param currentLocale - The current locale.
 * @returns The localized path.
 */
export function localizePath(
  path: string,
  locale: string = defaultLocale,
  currentLocale?: string
): string {
  const nextLocale = normalizeLocale(locale)
  const activeLocale = currentLocale ? normalizeLocale(currentLocale) : undefined

  // Keep compatibility with legacy /ja paths and canonicalize to /jp.
  let normalizedPath = path.replace('/docs/ja', '/docs/jp')

  if (activeLocale && normalizedPath.startsWith(`/docs/${activeLocale}`)) {
    return normalizedPath.replace(`/docs/${activeLocale}`, `/docs/${nextLocale}`)
  }

  const match = normalizedPath.match(/^\/docs\/([a-z]{2})(\/|$)/)
  if (match) {
    return normalizedPath.replace(`/docs/${match[1]}`, `/docs/${nextLocale}`)
  }

  if (normalizedPath === '/docs' || normalizedPath === '/docs/') {
    return `/docs/${nextLocale}`
  }

  return normalizedPath.replace('/docs', `/docs/${nextLocale}`)
}
