import { useEffect } from 'react';
import { useStored } from './storage';

export type Theme = 'light' | 'dark';

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useStored<Theme>('theme', 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0d0e' : '#1a1e20');
  }, [theme]);
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')];
}
