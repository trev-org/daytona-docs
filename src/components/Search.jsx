import { useEffect, useRef, useState } from 'react'

import '../styles/components/search.scss'

const SUBDOMAIN = import.meta.env.PUBLIC_MINTLIFY_SUBDOMAIN || ''
const ASSISTANT_KEY = import.meta.env.PUBLIC_MINTLIFY_ASSISTANT_KEY || ''

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
        pageSize: 10,
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
    url: normalizeResultPath(item.path, locale),
  }))
}

function Search({ locale = 'en' }) {
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const searchWrapperRef = useRef(null)
  const debounceTimeoutRef = useRef(null)
  const effectiveLocale = normalizeLocale(locale || 'en')

  useEffect(() => {
    const toggleSearch = () => {
      setIsSearchVisible(prev => {
        if (prev) {
          setSearchQuery('')
          setResults([])
          setError('')
          setIsLoading(false)
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
      return
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true)
      setError('')
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

  if (!isSearchVisible) return null

  const statusText = isLoading
    ? 'Searching...'
    : error
      ? error
      : searchQuery.trim() && results.length === 0
        ? `No results found for "${searchQuery}"`
        : searchQuery.trim() && results.length > 0
          ? `${results.length} result${results.length === 1 ? '' : 's'}`
          : 'Start typing to search the docs'

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
              onClick={() => setIsSearchVisible(false)}
              aria-label="Close search"
            >
              Esc
            </button>
          </div>
          <div className="search-status">{statusText}</div>
        </div>
        <div className="search-content">
          {!isLoading && !error && results.length > 0 && (
            <ul className="ais-Hits-list">
              {results.map(result => (
                <li className="ais-Hits-item" key={result.id}>
                  <a href={result.url} onClick={e => {
                    e.preventDefault()
                    handleResultClick(result.url)
                  }}>
                    <div className="search-result-label">Documentation</div>
                    <h5 style={{ fontSize: '18px', marginBottom: '8px' }}>
                      {result.title}
                    </h5>
                    <p style={{ fontSize: '14px', margin: 0 }}>
                      {result.description}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Search
