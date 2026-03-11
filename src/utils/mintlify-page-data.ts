import type { CollectionEntry } from 'astro:content'
import type { DocsConfig } from '@mintlify/validation'
import {
  isNavGroup,
  isNavPage,
  resolvePageData,
  type NavEntry,
  type NavGroup,
  type NavPage,
  type PageData,
} from '@mintlify/astro/helpers'

import docsConfigJson from '../../docs/docs.json'
import { SIDEBAR_PRESENTATION } from './sidebar-presentation'

const DOCS_BASE_PATH = '/docs'
const docsConfig = docsConfigJson as DocsConfig

export interface UiNavPage extends Omit<NavPage, 'href' | 'title'> {
  type: 'link'
  href: string
  title: string
  label?: string
  description?: string
  attrs?: {
    icon?: string
  }
}

export interface UiNavGroup extends Omit<NavGroup, 'pages' | 'group'> {
  type: 'group'
  label: string
  entries: UiNavEntry[]
}

export type UiNavEntry = UiNavPage | UiNavGroup

export interface UiPageData extends Omit<PageData, 'sidebarEntries' | 'footerPages'> {
  sidebarEntries: UiNavEntry[]
  footerPages: {
    prev: UiNavPage | null
    next: UiNavPage | null
  }
}

interface DocMeta {
  title: string
  description?: string
}

type SupportedLocale = keyof typeof SIDEBAR_PRESENTATION

function normalizeLocaleSegment(locale: string): string {
  return locale === 'ja' ? 'jp' : locale
}

function collapseIndexPath(path: string): string {
  if (path === '/index') return '/'
  if (path.endsWith('/index')) {
    return path.slice(0, -'/index'.length) || '/'
  }
  return path
}

function stripDocsBase(pathname: string): string {
  if (!pathname.startsWith(DOCS_BASE_PATH)) {
    return pathname || '/'
  }

  const stripped = pathname.slice(DOCS_BASE_PATH.length) || '/'
  return stripped.startsWith('/') ? stripped : `/${stripped}`
}

function normalizeInternalCurrentPath(pathname: string): string {
  let normalized = stripDocsBase(pathname).replace(/\/$/, '') || '/'
  normalized = normalized.replace(/^\/ja(\/|$)/, '/jp$1')

  if (normalized === '/en' || normalized === '/jp') {
    return `${normalized}/index`
  }

  return normalized
}

function toPublicHref(internalHref: string): string {
  const collapsed = collapseIndexPath(
    internalHref.replace(/^\/ja(\/|$)/, '/jp$1')
  )
  return `${DOCS_BASE_PATH}${collapsed === '/' ? '' : collapsed}`
}

function getLocaleFromInternalHref(internalHref: string): SupportedLocale {
  return internalHref.startsWith('/jp/') || internalHref === '/jp' || internalHref === '/ja'
    ? 'jp'
    : 'en'
}

function toPresentationSlug(internalHref: string): string {
  const withoutLocale = internalHref.replace(/^\/(en|jp|ja)(?=\/|$)/, '') || '/'
  return collapseIndexPath(withoutLocale || '/')
}

function normalizeDocId(docId: string): string {
  return docId.endsWith('/index') ? docId.slice(0, -'/index'.length) : docId
}

function buildTitleMap(docs: CollectionEntry<'docs'>[]): Record<string, string> {
  return docs.reduce<Record<string, string>>((acc, doc) => {
    const title = doc.data.title || doc.slug || doc.id
    acc[doc.id] = title
    acc[normalizeDocId(doc.id)] = title
    return acc
  }, {})
}

function buildDocMetaMap(docs: CollectionEntry<'docs'>[]): Map<string, DocMeta> {
  const map = new Map<string, DocMeta>()

  for (const doc of docs) {
    const meta: DocMeta = {
      title: doc.data.title || doc.slug || doc.id,
      description: doc.data.description,
    }
    const rawPath = `/${doc.id}`
    const normalizedPath = `/${normalizeDocId(doc.id)}`
    const collapsedRawPath = collapseIndexPath(rawPath)
    const collapsedNormalizedPath = collapseIndexPath(normalizedPath)

    for (const key of [
      rawPath,
      normalizedPath,
      collapsedRawPath,
      collapsedNormalizedPath,
    ]) {
      map.set(key, meta)
    }
  }

  return map
}

function mapNavEntry(entry: NavEntry, metaMap: Map<string, DocMeta>): UiNavEntry {
  if (isNavPage(entry)) {
    const collapsedInternalHref = collapseIndexPath(entry.href)
    const locale = getLocaleFromInternalHref(entry.href)
    const presentationSlug = toPresentationSlug(entry.href)
    const presentation = SIDEBAR_PRESENTATION[locale]?.[presentationSlug]
    const meta =
      metaMap.get(entry.href) ||
      metaMap.get(collapsedInternalHref) ||
      metaMap.get(entry.href.replace(/^\/ja(\/|$)/, '/jp$1')) ||
      metaMap.get(collapsedInternalHref.replace(/^\/ja(\/|$)/, '/jp$1'))

    return {
      ...entry,
      type: 'link',
      href: toPublicHref(entry.href),
      title: presentation?.label ?? meta?.title ?? entry.title,
      label: presentation?.label,
      description: presentation?.description ?? meta?.description,
      attrs: {
        icon: presentation?.icon,
      },
    }
  }

  return {
    ...entry,
    type: 'group',
    label: entry.group,
    entries: entry.pages.map(page => mapNavEntry(page, metaMap)),
  }
}

function mapFooterPage(
  page: NavPage | null,
  metaMap: Map<string, DocMeta>
): UiNavPage | null {
  if (!page) return null
  const mapped = mapNavEntry(page, metaMap)
  return mapped.type === 'link' ? mapped : null
}

function flattenEntries(entries: UiNavEntry[]): UiNavPage[] {
  return entries.flatMap(entry =>
    entry.type === 'group' ? flattenEntries(entry.entries) : [entry]
  )
}

function firstEntryHref(entry: UiNavEntry): string | undefined {
  if (entry.type === 'link') return entry.href
  for (const child of entry.entries) {
    const href = firstEntryHref(child)
    if (href) return href
  }
  return undefined
}

function filterHiddenEntries(entries: NavEntry[]): NavEntry[] {
  return entries.flatMap(entry => {
    if ('hidden' in entry && entry.hidden) {
      return []
    }

    if (isNavGroup(entry)) {
      const visiblePages = filterHiddenEntries(entry.pages)
      if (visiblePages.length === 0) {
        return []
      }

      return [{ ...entry, pages: visiblePages }]
    }

    return [entry]
  })
}

export function resolveMintlifyPageData(
  docs: CollectionEntry<'docs'>[],
  currentPath: string
): UiPageData {
  const titleMap = buildTitleMap(docs)
  const metaMap = buildDocMetaMap(docs)
  const pageData = resolvePageData(docsConfig, {
    currentPath: normalizeInternalCurrentPath(currentPath),
    titleMap,
  })

  return {
    ...pageData,
    sidebarEntries: filterHiddenEntries(pageData.sidebarEntries).map(entry =>
      mapNavEntry(entry, metaMap)
    ),
    footerPages: {
      prev: mapFooterPage(pageData.footerPages.prev, metaMap),
      next: mapFooterPage(pageData.footerPages.next, metaMap),
    },
  }
}

export function isUiNavGroup(entry: UiNavEntry): entry is UiNavGroup {
  return entry.type === 'group'
}

export function isUiNavPage(entry: UiNavEntry): entry is UiNavPage {
  return entry.type === 'link'
}

export function getExploreMoreData(
  docs: CollectionEntry<'docs'>[],
  currentPath: string,
  locale: string
): Array<{
  title: string
  items: Array<{ title: string; subtitle?: string; href: string }>
}> {
  const normalizedLocale = normalizeLocaleSegment(locale || 'en')
  const pageData = resolveMintlifyPageData(docs, currentPath)
  const excludedPrefixes = [
    `${DOCS_BASE_PATH}/${normalizedLocale}/guides`,
    `${DOCS_BASE_PATH}/${normalizedLocale}/typescript-sdk`,
    `${DOCS_BASE_PATH}/${normalizedLocale}/python-sdk`,
    `${DOCS_BASE_PATH}/${normalizedLocale}/ruby-sdk`,
    `${DOCS_BASE_PATH}/${normalizedLocale}/go-sdk`,
    `${DOCS_BASE_PATH}/${normalizedLocale}/tools`,
    `${DOCS_BASE_PATH}/${normalizedLocale}/404`,
  ]

  return pageData.sidebarEntries
    .filter(isUiNavGroup)
    .filter(group => {
      const href = firstEntryHref(group)
      return href ? !excludedPrefixes.some(prefix => href.startsWith(prefix)) : false
    })
    .map(group => ({
      title: group.label,
      items: group.entries
        .filter(isUiNavPage)
        .map(entry => ({
          title: entry.title,
          subtitle: entry.description,
          href: entry.href,
        })),
    }))
    .filter(group => group.items.length > 0)
}

export function getGuidesListData(
  docs: CollectionEntry<'docs'>[],
  locale: string,
  category?: string
): Array<{ href: string; title: string; description?: string }> {
  const normalizedLocale = normalizeLocaleSegment(locale || 'en')
  const pageData = resolveMintlifyPageData(docs, `${DOCS_BASE_PATH}/${normalizedLocale}/guides`)
  const allPages = flattenEntries(pageData.sidebarEntries)
  const guidesPrefix = `${DOCS_BASE_PATH}/${normalizedLocale}/guides`

  return allPages.filter(page => {
    if (!page.href.startsWith(guidesPrefix)) return false
    if (page.href === guidesPrefix) return false

    const relativePath = page.href.slice(guidesPrefix.length + 1)
    if (!relativePath) return false

    if (category) {
      return relativePath.startsWith(`${category}/`)
    }

    return !relativePath.includes('/')
  })
}
