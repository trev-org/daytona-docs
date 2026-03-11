'use client'

import { clsx as cn } from 'clsx'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { type ComponentProps, useEffect, useState } from 'react'

import styles from './Button.module.scss'

function useCopyToClipboard({
  onCopy,
  timeout = 2000,
}: {
  onCopy?: () => void
  timeout?: number
} = {}) {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (!isCopied || timeout === 0) return

    const id = window.setTimeout(() => {
      setIsCopied(false)
    }, timeout)

    return () => {
      window.clearTimeout(id)
    }
  }, [isCopied, timeout])

  const copyToClipboard = (value: string) => {
    if (typeof window === 'undefined' || !navigator.clipboard.writeText) {
      return
    }

    if (!value) {
      return
    }

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true)
      onCopy?.()
    }, console.error)
  }

  return { copyToClipboard, isCopied }
}

interface Props {
  value: string
  variant?: 'default' | 'ghost'
}
export function CopyButton({
  value,
  children,
  className,
  variant = 'default',
  ...props
}: Props & ComponentProps<'button'>) {
  const { copyToClipboard, isCopied } = useCopyToClipboard()

  return (
    <button
      className={cn(
        styles.button,
        {
          [styles.ghost]: variant === 'ghost',
          [styles.default]: variant === 'default',
        },
        className
      )}
      type="button"
      onClick={() => copyToClipboard(value)}
      data-copied={isCopied}
      {...props}
    >
      {isCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {children}
    </button>
  )
}
