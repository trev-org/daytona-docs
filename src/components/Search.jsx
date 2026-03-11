import { useEffect, useRef, useState } from 'react'

import '../styles/components/search.scss'

const SUBDOMAIN = import.meta.env.PUBLIC_MINTLIFY_SUBDOMAIN || ''
const ASSISTANT_KEY = import.meta.env.PUBLIC_MINTLIFY_ASSISTANT_KEY || ''
const PAGE_SIZE = 10

function normalizeLocale(locale) {
  return locale === 'ja' ? 'jp' : locale
}

function normalizeResultPath(path, locale) {
  if (!path) return `/docs/${locale}`

  let normalized = path.startsWith('/') ? path.slice(1) : path
  normalized = normalized.replace(/\/index$/, '')

  if (!normalized.startsWith('en/') && !normalized.startsWith('jp/')) {
    normalized = `${locale}/${normalized}`
  }

  return `/docs/${normalized}`
}

function extractSlug(path) {
  if (!path) return ''
  let slug = path.startsWith('/') ? path : `/${path}`
  slug = slug.replace(/\/index$/, '')
  return slug.toUpperCase()
}

async function searchDocs(query, locale) {
  if (!SUBDOMAIN) return []

  const response = await fetch(
    `https://api.mintlify.com/discovery/v1/search/${SUBDOMAIN}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ASSISTANT_KEY ? { Authorization: `Bearer ${ASSISTANT_KEY}` } : {}),
      },
      body: JSON.stringify({
        query,
        pageSize: 50,
        filter: {
          language: locale,
        },
      }),
    }
  )

  if (!response.ok) {
    const message =
      response.status === 401
        ? 'Search authentication failed. Check `PUBLIC_MINTLIFY_ASSISTANT_KEY`; Mintlify assistant keys usually start with `mint_dsc_`.'
        : response.status === 403
          ? 'Search access was rejected by Mintlify. Please verify your assistant configuration and key.'
          : `Search request failed with status ${response.status}`

    throw new Error(message)
  }

  const data = await response.json()
  return (Array.isArray(data) ? data : []).map((item, idx) => ({
    id: item.path || `${item.metadata?.title || 'result'}-${idx}`,
    title: item.metadata?.title || 'Untitled',
    description: item.metadata?.description || item.content || '',
    slug: extractSlug(item.path),
    url: normalizeResultPath(item.path, locale),
  }))
}

function Search({ locale = 'en' }) {
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const searchWrapperRef = useRef(null)
  const debounceTimeoutRef = useRef(null)
  const effectiveLocale = normalizeLocale(locale || 'en')

  const totalPages = Math.ceil(results.length / PAGE_SIZE)
  const pagedResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  useEffect(() => {
    const toggleSearch = () => {
      setIsSearchVisible(prev => {
        if (prev) {
          setSearchQuery('')
          setResults([])
          setError('')
          setIsLoading(false)
          setPage(0)
        }
        return !prev
      })
    }

    const handleKeyDown = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        toggleSearch()
      } else if (event.key === 'Escape') {
        setIsSearchVisible(false)
        setSearchQuery('')
        setResults([])
        setError('')
        setIsLoading(false)
        setPage(0)
      }
    }

    const handleSearchClick = event => {
      if (event.target.closest('.search-click')) {
        event.preventDefault()
        event.stopPropagation()
        toggleSearch()
      }
    }

    const handleClickOutside = event => {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target) &&
        !event.target.closest('.search-click')
      ) {
        setIsSearchVisible(false)
        setSearchQuery('')
        setResults([])
        setError('')
        setIsLoading(false)
        setPage(0)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', handleSearchClick)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleSearchClick)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (isSearchVisible) {
      document.body.classList.add('no-scroll')
    } else {
      document.body.classList.remove('no-scroll')
    }

    return () => {
      document.body.classList.remove('no-scroll')
    }
  }, [isSearchVisible])

  useEffect(() => {
    if (!isSearchVisible) return

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setResults([])
      setError('')
      setIsLoading(false)
      setPage(0)
      return
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true)
      setError('')
      setPage(0)
      try {
        const nextResults = await searchDocs(searchQuery.trim(), effectiveLocale)
        setResults(nextResults)
      } catch (err) {
        console.error(err)
        setResults([])
        setError(
          err instanceof Error ? err.message : 'Search is temporarily unavailable.'
        )
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [searchQuery, effectiveLocale, isSearchVisible])

  const handleResultClick = url => {
    window.location.href = url
    setIsSearchVisible(false)
  }

  const closeSearch = () => {
    setIsSearchVisible(false)
    setSearchQuery('')
    setResults([])
    setError('')
    setIsLoading(false)
    setPage(0)
  }

  if (!isSearchVisible) return null

  const hasResults = !isLoading && !error && results.length > 0

  return (
    <div className="search-overlay">
      <div id="searchbox-wrapper" className="searchbox-wrapper" ref={searchWrapperRef}>
        <div className="search-bar-container">
          <div className="search-shell">
            <input
              className="ais-SearchBox-input"
              placeholder="Search documentation"
              autoFocus
              value={searchQuery}
              onChange={event => setSearchQuery(event.currentTarget.value)}
            />
            <button
              type="button"
              className="search-close-button"
              onClick={closeSearch}
              aria-label="Close search"
            >
              ×
            </button>
          </div>
          {isLoading && (
            <div className="search-status">Searching...</div>
          )}
          {error && (
            <div className="search-status search-status-error">{error}</div>
          )}
          {!isLoading && !error && searchQuery.trim() && results.length === 0 && (
            <div className="search-status">No results found for "{searchQuery}"</div>
          )}
          {!isLoading && !error && !searchQuery.trim() && (
            <div className="search-status">Start typing to search the docs</div>
          )}
        </div>

        {hasResults && (
          <div className="search-content">
            <div className="search-results-header">
              <span className="search-results-count">
                Documentation ({results.length} result{results.length === 1 ? '' : 's'})
              </span>
              {totalPages > 1 && (
                <div className="search-pagination">
                  <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                  <span>{page + 1}</span>
                  <button
                    type="button"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    aria-label="Next page"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>
            <ul className="ais-Hits-list">
              {pagedResults.map(result => (
                <li className="ais-Hits-item" key={result.id}>
                  <a
                    href={result.url}
                    onClick={e => {
                      e.preventDefault()
                      handleResultClick(result.url)
                    }}
                  >
                    <h5 className="search-result-title">
                      <span className="search-result-bullet">■</span>
                      {result.title}
                    </h5>
                    <div className="search-result-slug">{result.slug}</div>
                    {result.description && (
                      <p className="search-result-description">{result.description}</p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default Search
