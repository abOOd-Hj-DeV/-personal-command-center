import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getPref, setPref } from './db'
import type { Prefs } from './types'

type Theme = Prefs['theme']
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: 'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  useEffect(() => {
    getPref('theme').then((t) => setThemeState(t))
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])
  return (
    <Ctx.Provider
      value={{
        theme,
        setTheme: (t) => {
          setThemeState(t)
          void setPref('theme', t)
        },
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
