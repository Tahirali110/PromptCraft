/**
 * components/AppSplash.tsx
 * Custom splash screen that respects the APP's theme (not system theme).
 * Shows logo + text in correct colors, then fades out.
 */
import * as React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { FadeOut, FadeIn } from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '@/lib/themeContext';

// Prevent auto-hide so we control when it disappears
SplashScreen.preventAutoHideAsync().catch(() => { });

export function AppSplash({ onReady }: { onReady: () => void }) {
    const { isDark } = useTheme();
    const [visible, setVisible] = React.useState(true);

    React.useEffect(() => {
        // Hide the native splash as soon as our custom one is showing
        SplashScreen.hideAsync().catch(() => { });

        // Show custom splash for 1.5 seconds, then fade out
        const timer = setTimeout(() => {
            setVisible(false);
            // Small delay for fade-out animation to finish
            setTimeout(onReady, 400);
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    const bg = isDark ? '#0d1117' : '#ffffff';
    const titleColor = isDark ? '#f0f0f0' : '#1a1a2e';
    const subtitleColor = isDark ? '#aaaaaa' : '#555555';

    return (
        <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(350)}
            style={[StyleSheet.absoluteFill, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center', zIndex: 999 }]}
        >
            <Image
                source={require('@/assets/images/logo-icon.png')}
                style={{ width: 120, height: 120, borderRadius: 24, marginBottom: 20 }}
            />
            <Text style={{ fontSize: 28, fontWeight: '800', color: titleColor, letterSpacing: -0.5 }}>
                PromptCraft
            </Text>
            <Text style={{ fontSize: 14, color: subtitleColor, marginTop: 6 }}>
                Generate Idea to MVP Level Prompts
            </Text>
        </Animated.View>
    );
}
