export interface HeaderActiveState {
  isTypescriptSdkActive: boolean
  isPythonSdkActive: boolean
  isRubySdkActive: boolean
  isGoSdkActive: boolean
  isApiActive: boolean
  isCliActive: boolean
  isReferencesActive: boolean
  isGuidesActive: boolean
}

function normalizePath(path: string): string {
  if (!path) return '/'
  const normalized = path.replace(/\/+$/, '')
  return normalized || '/'
}

export function comparePaths(path1: string, path2: string): boolean {
  return normalizePath(path1) === normalizePath(path2)
}

function stripLocaleFromDocsPath(path: string): string {
  const normalized = normalizePath(path)
  const segments = normalized.split('/').filter(Boolean)
  const docsIndex = segments.indexOf('docs')

  if (docsIndex !== -1 && segments.length > docsIndex + 1) {
    const maybeLocale = segments[docsIndex + 1]
    if (['en', 'jp', 'ja'].includes(maybeLocale)) {
      segments.splice(docsIndex + 1, 1)
    }
  }

  return `/${segments.join('/')}`
}

export function getHeaderActiveState(
  baseUrl: string,
  currentPath: string
): HeaderActiveState {
  const normalizedCurrentPath = stripLocaleFromDocsPath(currentPath)

  const referencePaths = {
    typescriptSdk: `${baseUrl}/typescript-sdk`,
    pythonSdk: `${baseUrl}/python-sdk`,
    rubySdk: `${baseUrl}/ruby-sdk`,
    goSdk: `${baseUrl}/go-sdk`,
    api: `${baseUrl}/tools/api`,
    cli: `${baseUrl}/tools/cli`,
  }

  const isTypescriptSdkActive = isActiveOrParentPath(
    referencePaths.typescriptSdk,
    normalizedCurrentPath
  )
  const isPythonSdkActive = isActiveOrParentPath(
    referencePaths.pythonSdk,
    normalizedCurrentPath
  )
  const isRubySdkActive = isActiveOrParentPath(
    referencePaths.rubySdk,
    normalizedCurrentPath
  )
  const isGoSdkActive = isActiveOrParentPath(
    referencePaths.goSdk,
    normalizedCurrentPath
  )
  const isApiActive = isActiveOrParentPath(
    referencePaths.api,
    normalizedCurrentPath
  )
  const isCliActive = isActiveOrParentPath(
    referencePaths.cli,
    normalizedCurrentPath
  )

  return {
    isTypescriptSdkActive,
    isPythonSdkActive,
    isRubySdkActive,
    isGoSdkActive,
    isApiActive,
    isCliActive,
    isReferencesActive:
      isTypescriptSdkActive ||
      isPythonSdkActive ||
      isRubySdkActive ||
      isGoSdkActive ||
      isApiActive ||
      isCliActive,
    isGuidesActive: isActiveOrParentPath(
      `${baseUrl}/guides`,
      normalizedCurrentPath
    ),
  }
}

export function isActiveOrParentPath(
  entryPath: string,
  currentPath: string
): boolean {
  const normalizedEntry = normalizePath(entryPath)
  const normalizedCurrent = normalizePath(currentPath)

  if (normalizedEntry === normalizedCurrent) {
    return true
  }

  const segments = normalizedEntry.split('/').filter(Boolean)
  if (segments.length < 3) {
    return false
  }

  return normalizedCurrent.startsWith(normalizedEntry + '/')
}
