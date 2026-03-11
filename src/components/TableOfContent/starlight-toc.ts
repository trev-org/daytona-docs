import { PAGE_TITLE_ID } from './constants.ts'

export class StarlightTOC extends HTMLElement {
  private _current = this.querySelector(
    'a[aria-current="true"]'
  ) as HTMLAnchorElement | null
  private minH = parseInt(this.dataset.minH || '2', 10)
  private maxH = parseInt(this.dataset.maxH || '3', 10)
  private observer?: IntersectionObserver
  private resizeTimeout?: ReturnType<typeof setTimeout>

  protected set current(link: HTMLAnchorElement) {
    if (link === this._current) return
    if (this._current) this._current.removeAttribute('aria-current')
    link.setAttribute('aria-current', 'true')
    this._current = link
  }

  constructor() {
    super()

    /** All the links in the table of contents. */
    const links = [...this.querySelectorAll('a')]

    const headings = [
      ...document.querySelectorAll<HTMLHeadingElement>(
        'main h1[id], main h2[id], main h3[id], main h4[id], main h5[id], main h6[id]'
      ),
    ].filter(heading => {
      if (heading.closest('#scalar-container')) return false
      if (heading.id === PAGE_TITLE_ID) return true
      const level = Number(heading.tagName.slice(1))
      return level >= this.minH && level <= this.maxH
    })

    const setCurrent: IntersectionObserverCallback = entries => {
      const visibleHeadings = entries
        .filter(entry => entry.isIntersecting)
        .sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        )

      const visibleHeading = visibleHeadings[0]?.target
      if (!(visibleHeading instanceof HTMLHeadingElement)) return

      const link = links.find(
        link => link.hash === '#' + encodeURIComponent(visibleHeading.id)
      )
      if (link) {
        this.current = link
      }
    }

    const observe = () => {
      this.observer?.disconnect()
      this.observer = new IntersectionObserver(setCurrent, {
        rootMargin: this.getRootMargin(),
      })
      headings.forEach(heading => this.observer?.observe(heading))
    }

    observe()

    const onIdle = window.requestIdleCallback || (cb => setTimeout(cb, 1))
    window.addEventListener('resize', () => {
      this.observer?.disconnect()
      clearTimeout(this.resizeTimeout)
      this.resizeTimeout = setTimeout(() => onIdle(observe), 200)
    })
  }

  private getRootMargin(): `-${number}px 0% ${number}px` {
    const navBarHeight =
      document.querySelector('header')?.getBoundingClientRect().height || 0
    // `<summary>` only exists in mobile ToC, so will fall back to 0 in large viewport component.
    const mobileTocHeight =
      this.querySelector('summary')?.getBoundingClientRect().height || 0
    /** Start intersections at nav height + 2rem padding. */
    const top = navBarHeight + mobileTocHeight + 32
    /** End intersections 1.5rem later. */
    const bottom = top + 24
    const height = document.documentElement.clientHeight
    return `-${top}px 0% ${bottom - height}px`
  }
}

if (!customElements.get('starlight-toc')) {
  customElements.define('starlight-toc', StarlightTOC)
}
