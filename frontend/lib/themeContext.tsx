/**
 * lib/themeContext.tsx
 * Global theme context — persists to AsyncStorage, smooth animated transitions.
 * Provides `themeProgress` (0 = light, 1 = dark) for components to interpolate colours.
 */
import * as React from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'nativewind';
import {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedStyle,
  interpolateColor,
  type SharedValue,
} from 'react-native-reanimated';

type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  isDark: boolean;
  /** 0 = fully light, 1 = fully dark — use with Reanimated interpolateColor for smooth transitions */
  themeProgress: SharedValue<number>;
}

const THEME_KEY = 'promptcraft_theme';
const TRANSITION_DURATION = 320;

// Provide a no-op shared value for the default context (won't be used in practice)
const _defaultProgress = { value: 1 } as SharedValue<number>;

export const ThemeContext = React.createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => { },
  isDark: true,
  themeProgress: _defaultProgress,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [theme, setTheme] = React.useState<ThemeMode>('dark');
  const themeProgress = useSharedValue(1); // 1 = dark initially

  React.useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      const mode: ThemeMode = saved === 'light' ? 'light' : 'dark';
      // Set instantly on mount (no transition flash)
      themeProgress.value = mode === 'dark' ? 1 : 0;
      setTheme(mode);
      setColorScheme(mode);
      if (Platform.OS === 'web') {
        const html = document.documentElement;
        html.classList.remove('dark', 'light');
        html.classList.add(mode);
      }
    });
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    setTheme(mode);
    setColorScheme(mode);
    // Smooth colour transition
    themeProgress.value = withTiming(mode === 'dark' ? 1 : 0, {
      duration: TRANSITION_DURATION,
      easing: Easing.inOut(Easing.ease),
    });
    if (Platform.OS === 'web') {
      const html = document.documentElement;
      html.classList.remove('dark', 'light');
      html.classList.add(mode);
    }
    AsyncStorage.setItem(THEME_KEY, mode);
  };

  const toggleTheme = () => applyTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark', themeProgress }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}

/**
 * Helper hook: returns an animated style with a smoothly interpolated background colour.
 * Pass the dark and light colour strings.
 *
 * Example:
 *   const bgStyle = useThemeColor('hsl(222,47%,6%)', 'hsl(210,40%,98%)');
 *   <Animated.View style={[bgStyle, { flex:1 }]} />
 */
export function useThemeColor(darkColor: string, lightColor: string) {
  const { themeProgress } = useTheme();
  return useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(themeProgress.value, [0, 1], [lightColor, darkColor]),
  }));
}
