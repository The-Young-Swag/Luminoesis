import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'theme'

const THEME_COLORS: Record<Theme, string> = {
  light: '#EAF3EE',
  dark: '#05130d',
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle(
    'dark',
    theme === 'dark',
  )

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private mode — theme just won't persist.
  }

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', THEME_COLORS[theme])
  }
}

export function useTheme() {
  // Must be deterministic during SSR and the first client render.
  // THEME_INIT_SCRIPT in __root.tsx handles the visual theme
  // before React hydrates.
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const storedTheme =
      window.localStorage.getItem(THEME_STORAGE_KEY)

    const resolvedTheme: Theme =
      storedTheme === 'dark' ? 'dark' : 'light'

    setTheme(resolvedTheme)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) =>
      currentTheme === 'dark' ? 'light' : 'dark',
    )
  }, [])

  return {
    theme,
    toggleTheme,
  }
}