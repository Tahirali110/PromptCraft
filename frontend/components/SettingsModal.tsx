/**
 * components/SettingsModal.tsx
 * Settings modal — fixed header + footer, only middle content scrolls.
 * Smooth slide-up / fade animation via Reanimated.
 */
import * as React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Switch,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AIProvider } from '@/lib/orchestrator';
import { useTheme } from '@/lib/themeContext';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const KEY_API_KEY = 'promptcraft_api_key';
const KEY_PROVIDER = 'promptcraft_provider';
const KEY_OR_MODEL = 'promptcraft_or_model';

// ─── OpenRouter model list ────────────────────────────────────────────────────
export const OPENROUTER_MODELS: { value: string; label: string; description: string }[] = [
  { value: 'openai/gpt-4o', label: 'GPT-4o', description: 'OpenAI — fast & capable' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', description: 'OpenAI — cheap & fast' },
  { value: 'openai/gpt-5.2', label: 'GPT-5.2', description: 'OpenAI — most capable' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', description: 'Anthropic — balanced' },
  { value: 'anthropic/claude-3-opus', label: 'Claude 3 Opus', description: 'Anthropic — most powerful' },
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash', description: 'Google — fast & cheap' },
  { value: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5', description: 'Google — long context' },
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', description: 'Meta — open source' },
  { value: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3', description: 'DeepSeek — very cheap' },
  { value: 'mistralai/mistral-large', label: 'Mistral Large', description: 'Mistral — European AI' },
];

export const DEFAULT_OR_MODEL = 'openai/gpt-4o';

// ─── Persistence helpers ──────────────────────────────────────────────────────
export async function getStoredSettings(): Promise<{
  provider: AIProvider;
  apiKey: string;
  orModel: string;
}> {
  try {
    const [p, k, m] = await Promise.all([
      AsyncStorage.getItem(KEY_PROVIDER),
      AsyncStorage.getItem(KEY_API_KEY),
      AsyncStorage.getItem(KEY_OR_MODEL),
    ]);
    return {
      provider: (p as AIProvider) ?? 'openai',
      apiKey: k ?? '',
      orModel: m ?? DEFAULT_OR_MODEL,
    };
  } catch {
    return { provider: 'openai', apiKey: '', orModel: DEFAULT_OR_MODEL };
  }
}

async function saveSettings(provider: AIProvider, apiKey: string, orModel: string) {
  await Promise.all([
    AsyncStorage.setItem(KEY_PROVIDER, provider),
    apiKey.trim()
      ? AsyncStorage.setItem(KEY_API_KEY, apiKey.trim())
      : AsyncStorage.removeItem(KEY_API_KEY),
    AsyncStorage.setItem(KEY_OR_MODEL, orModel),
  ]);
}

// ─── Provider meta ────────────────────────────────────────────────────────────
const PROVIDERS: { value: AIProvider; label: string; keyHint: string; docsUrl: string }[] = [
  { value: 'openai', label: 'OpenAI (GPT-4o)', keyHint: 'sk-proj-...', docsUrl: 'platform.openai.com/api-keys' },
  { value: 'gemini', label: 'Google Gemini', keyHint: 'AIza...', docsUrl: 'aistudio.google.com/app/apikey' },
  { value: 'anthropic', label: 'Anthropic Claude', keyHint: 'sk-ant-...', docsUrl: 'console.anthropic.com/settings/keys' },
  { value: 'openrouter', label: 'OpenRouter', keyHint: 'sk-or-...', docsUrl: 'openrouter.ai/keys' },
];

// ─── Props & hook ─────────────────────────────────────────────────────────────
interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function useSettings() {
  const [provider, setProvider] = React.useState<AIProvider>('openai');
  const [apiKey, setApiKey] = React.useState('');
  const [orModel, setOrModel] = React.useState(DEFAULT_OR_MODEL);

  const refresh = React.useCallback(() => {
    getStoredSettings().then(({ provider: p, apiKey: k, orModel: m }) => {
      setProvider(p);
      setApiKey(k);
      setOrModel(m);
    });
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  return { provider, apiKey, orModel, hasKey: apiKey.length > 0, refresh };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const [provider, setProvider] = React.useState<AIProvider>('openai');
  const [apiKey, setApiKey] = React.useState('');
  const [orModel, setOrModel] = React.useState(DEFAULT_OR_MODEL);
  const [showKey, setShowKey] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [providerMenuOpen, setProviderMenuOpen] = React.useState(false);
  const [modelMenuOpen, setModelMenuOpen] = React.useState(false);

  // Animation values
  const translateY = useSharedValue(600);
  const backdropOpacity = useSharedValue(0);
  const [modalMounted, setModalMounted] = React.useState(false);

  const C = isDark
    ? {
      bg: 'hsl(222,47%,9%)',
      border: 'hsl(222,47%,18%)',
      header: 'hsl(222,47%,12%)',
      footer: 'hsl(222,47%,12%)',
      text: 'hsl(210,40%,98%)',
      subtext: 'hsl(215,20%,55%)',
      inputBg: 'hsl(222,47%,8%)',
      purple: 'hsl(263,90%,65%)',
      purpleDim: 'rgba(139,92,246,0.12)',
      purpleBorder: 'rgba(139,92,246,0.25)',
      green: 'hsl(142,72%,65%)',
      greenDim: 'rgba(34,197,94,0.1)',
      greenBorder: 'rgba(34,197,94,0.25)',
      red: 'hsl(0,72%,65%)',
      redDim: 'rgba(239,68,68,0.08)',
      redBorder: 'rgba(239,68,68,0.25)',
    }
    : {
      bg: 'hsl(0,0%,100%)',
      border: 'hsl(220,20%,88%)',
      header: 'hsl(210,30%,97%)',
      footer: 'hsl(210,30%,97%)',
      text: 'hsl(222,47%,11%)',
      subtext: 'hsl(215,20%,45%)',
      inputBg: 'hsl(210,30%,97%)',
      purple: 'hsl(263,80%,55%)',
      purpleDim: 'rgba(109,40,217,0.07)',
      purpleBorder: 'rgba(109,40,217,0.2)',
      green: 'hsl(142,65%,35%)',
      greenDim: 'rgba(22,163,74,0.08)',
      greenBorder: 'rgba(22,163,74,0.2)',
      red: 'hsl(0,72%,45%)',
      redDim: 'rgba(220,38,38,0.06)',
      redBorder: 'rgba(220,38,38,0.2)',
    };

  // Load settings on open + animate in
  React.useEffect(() => {
    if (visible) {
      setModalMounted(true);
      getStoredSettings().then(({ provider: p, apiKey: k, orModel: m }) => {
        setProvider(p);
        setApiKey(k);
        setOrModel(m);
        setSaved(false);
        setShowKey(false);
        setModelMenuOpen(false);
        setProviderMenuOpen(false);
      });
      // Animate in
      translateY.value = withSpring(0, { damping: 22, stiffness: 200 });
      backdropOpacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
    } else {
      // Animate out then unmount
      translateY.value = withSpring(600, { damping: 24, stiffness: 200 });
      backdropOpacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(setModalMounted)(false);
      });
    }
  }, [visible]);

  const sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnim = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const selectedProviderMeta = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0];

  const maskedKey = apiKey
    ? apiKey.slice(0, 7) + '•'.repeat(Math.max(0, apiKey.length - 11)) + apiKey.slice(-4)
    : '';

  const handleSave = async () => {
    await saveSettings(provider, apiKey, orModel);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleClear = async () => {
    setApiKey('');
    await saveSettings(provider, '', orModel);
  };

  if (!modalMounted && !visible) return null;

  return (
    <Modal
      visible={modalMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      {/* Backdrop */}
      <Animated.View
        style={[backdropAnim, {
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
        }]}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[sheetAnim, {
          position: 'absolute', bottom: 0, left: 0, right: 0,
          maxHeight: '92%',
          backgroundColor: C.bg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: C.border,
          overflow: 'hidden',
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 -8px 40px rgba(0,0,0,0.35)' }
            : { elevation: 24 }),
          flexDirection: 'column',
        }]}
      >
        {/* ── Fixed Header ── */}
        <View
          style={{
            backgroundColor: C.header,
            paddingTop: insets.top > 0 ? insets.top + 4 : 16,
            paddingBottom: 14,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              position: 'absolute',
              top: 8, left: 0, right: 0,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 36, height: 4, borderRadius: 2,
                backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
              }}
            />
          </View>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
            ⚙️  Settings
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ color: C.subtext, fontSize: 15, fontWeight: '600' }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Scrollable Body ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Theme Toggle */}
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: C.purpleDim, borderRadius: 12,
              borderWidth: 1, borderColor: C.purpleBorder, padding: 14,
            }}
          >
            <View style={{ gap: 2 }}>
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>
                {isDark ? '🌙  Dark Mode' : '☀️  Light Mode'}
              </Text>
              <Text style={{ color: C.subtext, fontSize: 12 }}>Toggle app appearance</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#ccc', true: C.purple }}
              thumbColor="#fff"
            />
          </View>

          {/* AI Provider */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: C.subtext, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              AI Provider
            </Text>
            <TouchableOpacity
              onPress={() => setProviderMenuOpen((v) => !v)}
              style={{
                borderRadius: 10, borderWidth: 1,
                borderColor: providerMenuOpen ? C.purple : C.border,
                backgroundColor: C.inputBg, padding: 14,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>
                {selectedProviderMeta.label}
              </Text>
              <Text style={{ color: C.subtext, fontSize: 12 }}>{providerMenuOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {providerMenuOpen && (
              <ScrollView
                style={{ maxHeight: 200, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg }}
                nestedScrollEnabled
              >
                {PROVIDERS.map((p, i) => (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => { setProvider(p.value); setApiKey(''); setProviderMenuOpen(false); }}
                    style={{
                      padding: 14, backgroundColor: provider === p.value ? C.purpleDim : 'transparent',
                      borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.border,
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ color: provider === p.value ? C.purple : C.text, fontSize: 14, fontWeight: provider === p.value ? '700' : '400' }}>
                      {p.label}
                    </Text>
                    {provider === p.value && <Text style={{ color: C.purple, fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* OpenRouter Model Picker */}
          {provider === 'openrouter' && (
            <View style={{ gap: 8 }}>
              <Text style={{ color: C.subtext, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                Model
              </Text>
              <TouchableOpacity
                onPress={() => setModelMenuOpen((v) => !v)}
                style={{
                  borderRadius: 10, borderWidth: 1,
                  borderColor: modelMenuOpen ? C.purple : C.border,
                  backgroundColor: C.inputBg, padding: 14,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>
                    {OPENROUTER_MODELS.find((m) => m.value === orModel)?.label ?? orModel}
                  </Text>
                  <Text style={{ color: C.subtext, fontSize: 11 }}>
                    {OPENROUTER_MODELS.find((m) => m.value === orModel)?.description ?? ''}
                  </Text>
                </View>
                <Text style={{ color: C.subtext, fontSize: 12, marginLeft: 8 }}>{modelMenuOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {modelMenuOpen && (
                <ScrollView
                  style={{ maxHeight: 220, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg }}
                  nestedScrollEnabled
                >
                  {OPENROUTER_MODELS.map((m, i) => (
                    <TouchableOpacity
                      key={m.value}
                      onPress={() => { setOrModel(m.value); setModelMenuOpen(false); }}
                      style={{
                        padding: 14, backgroundColor: orModel === m.value ? C.purpleDim : 'transparent',
                        borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.border,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: orModel === m.value ? C.purple : C.text, fontSize: 14, fontWeight: orModel === m.value ? '700' : '400' }}>
                          {m.label}
                        </Text>
                        <Text style={{ color: C.subtext, fontSize: 11 }}>{m.description}</Text>
                      </View>
                      {orModel === m.value && <Text style={{ color: C.purple, fontSize: 16 }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* API Key */}
          <View style={{ gap: 8 }}>
            <Text style={{ color: C.subtext, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
              API Key
            </Text>
            <View
              style={{
                backgroundColor: C.purpleDim, borderRadius: 8, borderWidth: 1,
                borderColor: C.purpleBorder, padding: 10,
                flexDirection: 'row', gap: 8, marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 14 }}>🔒</Text>
              <Text style={{ color: C.subtext, fontSize: 12, flex: 1, lineHeight: 17 }}>
                Your key is sent securely to your own PromptCraft backend — never stored on external servers.
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row', borderRadius: 10, borderWidth: 1,
                borderColor: C.border, backgroundColor: C.inputBg, overflow: 'hidden',
              }}
            >
              <TextInput
                value={showKey ? apiKey : apiKey ? maskedKey : ''}
                onChangeText={(t) => { setShowKey(true); setApiKey(t); }}
                placeholder={selectedProviderMeta.keyHint}
                placeholderTextColor={C.subtext}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                style={{
                  flex: 1, paddingHorizontal: 14, paddingVertical: 12,
                  color: C.text, fontSize: 13,
                  fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
                  letterSpacing: showKey ? 0.2 : 1.2,
                }}
              />
              <TouchableOpacity
                onPress={() => setShowKey((s) => !s)}
                style={{ paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: C.border }}
              >
                <Text style={{ fontSize: 15 }}>{showKey ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.subtext, fontSize: 11 }}>
              Get your key at <Text style={{ color: C.purple }}>{selectedProviderMeta.docsUrl}</Text>
            </Text>
          </View>

          {/* Key status */}
          {apiKey.length > 0 && (
            <View
              style={{
                backgroundColor: C.greenDim, borderRadius: 8,
                borderWidth: 1, borderColor: C.greenBorder,
                padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
              }}
            >
              <Text style={{ fontSize: 13 }}>✅</Text>
              <Text style={{ color: C.green, fontSize: 12 }}>
                API key configured ({apiKey.length} characters)
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Fixed Footer ── */}
        <View
          style={{
            backgroundColor: C.footer,
            borderTopWidth: 1, borderTopColor: C.border,
            paddingHorizontal: 20, paddingTop: 14,
            paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 20,
            flexDirection: 'row', gap: 10,
          }}
        >
          {apiKey.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              style={{
                flex: 1, paddingVertical: 14, borderRadius: 12,
                borderWidth: 1, borderColor: C.redBorder,
                backgroundColor: C.redDim, alignItems: 'center',
              }}
            >
              <Text style={{ color: C.red, fontSize: 14, fontWeight: '600' }}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleSave}
            style={{
              flex: 2, paddingVertical: 14, borderRadius: 12,
              backgroundColor: saved ? 'hsl(142,65%,35%)' : C.purple,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
              {saved ? '✓  Saved!' : 'Save Settings'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}
