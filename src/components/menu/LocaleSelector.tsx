import type { ChangeEvent, ComponentProps } from 'react'
import { localizePath } from 'src/i18n/utils'

import styles from './LocaleSelector.module.scss'

function normalizeLocale(locale: string): string {
  return locale === 'ja' ? 'jp' : locale
}

type Props = ComponentProps<'select'>

const localeOptions: Array<{ value: string; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

export const LocaleSelect = ({
  locale,
  ...props
}: { locale: string } & Props) => {
  const currentLocale = normalizeLocale(locale || 'en')
  const uiLocale = currentLocale === 'jp' ? 'ja' : currentLocale
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = normalizeLocale(event.target.value)
    if (!nextLocale || nextLocale === currentLocale) return

    window.location.href = localizePath(
      window.location.pathname,
      nextLocale,
      currentLocale
    )
  }

  const { ...restProps } = props

  return (
    <select
      {...restProps}
      className={styles.localeSelector}
      value={uiLocale}
      onChange={handleChange}
    >
      {localeOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
