/**
 * app/index.tsx
 * Main dashboard — Idea input, Progress stepper, Generate button.
 * Orchestrates multi-provider prompt chaining and saves results to history.
 */
import * as React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Stack, useRouter } from 'expo-router';
import {
  Settings as SettingsIcon,
  Zap as ZapIcon,
  Sparkles as SparklesIcon,
  History as HistoryIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Mic,
  StopCircle,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import { SettingsModal, useSettings } from '@/components/SettingsModal';
import { ResultsTabs } from '@/components/ResultsTabs';
import { ChatBot } from '@/components/ChatBot';
import { useTheme } from '@/lib/themeContext';
import { runOrchestration, transcribeAudio } from '@/lib/orchestrator';
import type { OrchestrationResult } from '@/lib/orchestrator';
import { saveToHistory } from '@/lib/history';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Advanced questions ───────────────────────────────────────────────────────
const ADVANCED_QUESTIONS = [
  { id: 'target_users', label: 'Target users', placeholder: 'e.g. freelance designers aged 25–40' },
  { id: 'monetization', label: 'Monetization', placeholder: 'e.g. freemium SaaS, $9/mo pro plan' },
  { id: 'platform', label: 'Platform / device', placeholder: 'e.g. iOS + Android, web dashboard' },
  { id: 'tech_preference', label: 'Tech stack preference', placeholder: 'e.g. React Native + Supabase' },
  { id: 'competitors', label: 'Main competitors', placeholder: 'e.g. Notion, Linear, Airtable' },
  { id: 'key_differentiator', label: 'Key differentiator', placeholder: 'e.g. offline-first, AI-powered search' },
];

// ─── Step config for progress stepper ────────────────────────────────────────
const STEPS = [
  { label: 'Research', icon: '🔍' },
  { label: 'PRD', icon: '📋' },
  { label: 'Tech Design', icon: '⚙️' },
  { label: 'Agent Prompt', icon: '🤖' },
];

// ─── Animated step row ────────────────────────────────────────────────────────
function StepRow({
  step,
  stepNum,
  isDone,
  isActive,
  isError,
  isLast,
  result,
  C,
}: {
  step: { label: string; icon: string };
  stepNum: number;
  isDone: boolean;
  isActive: boolean;
  isError: boolean;
  isLast: boolean;
  result: OrchestrationResult | null;
  C: any;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isDone || isActive ? 1 : 0.55);

  React.useEffect(() => {
    if (isDone) {
      scale.value = withSpring(1.06, { damping: 8 }, () => {
        scale.value = withSpring(1, { damping: 12 });
      });
      opacity.value = withTiming(1, { duration: 300 });
    } else if (isActive) {
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0.55, { duration: 200 });
    }
  }, [isDone, isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const isPending = !isDone && !isActive && !isError;

  return (
    <Animated.View style={[animStyle, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isDone
            ? C.stepDone
            : isError
              ? 'hsl(0,72%,45%)'
              : isActive
                ? C.stepActive
                : C.stepIdle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isActive ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={{ fontSize: 14 }}>{isDone ? '✓' : isError ? '!' : step.icon}</Text>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: isPending ? C.subtext : C.text,
            fontSize: 14,
            fontWeight: isActive ? '700' : '500',
          }}
        >
          Step {stepNum} — {step.label}
        </Text>
        {isActive && (
          <Text style={{ color: C.subtext, fontSize: 11, marginTop: 1 }}>Generating with AI…</Text>
        )}
        {isError && (
          <Text style={{ color: 'hsl(0,72%,65%)', fontSize: 11, marginTop: 1 }}>
            Failed to generate.
          </Text>
        )}
        {isDone && result && result.steps[stepNum - 1] && (
          <Text style={{ color: 'hsl(142,65%,45%)', fontSize: 11, marginTop: 1 }}>
            {(result.steps[stepNum - 1].content.length / 1000).toFixed(1)}k chars
          </Text>
        )}
      </View>

      {!isLast && (
        <View
          style={{
            position: 'absolute',
            left: 15,
            top: 32,
            width: 2,
            height: 12,
            backgroundColor: isDone ? C.stepDone : isError ? 'hsl(0,72%,45%)' : C.stepIdle,
          }}
        />
      )}
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { provider, apiKey, hasKey, refresh: refreshSettings } = useSettings();
  const router = useRouter();

  const [idea, setIdea] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [result, setResult] = React.useState<OrchestrationResult | null>(null);
  const [resultsVisible, setResultsVisible] = React.useState(false);
  const [errorStep, setErrorStep] = React.useState<number | null>(null);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advanced, setAdvanced] = React.useState<Record<string, string>>({});
  const [isRecording, setIsRecording] = React.useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [recording, setRecording] = React.useState<Audio.Recording | null>(null);

  // ─── Animations ─────────────────────────────────────────────────────────────
  const generateBtnScale = useSharedValue(1);
  const advancedHeight = useSharedValue(0);
  const heroOpacity = useSharedValue(0);
  const micPulse = useSharedValue(1);

  React.useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
  }, []);

  React.useEffect(() => {
    advancedHeight.value = withSpring(advancedOpen ? 1 : 0, { damping: 16, stiffness: 120 });
  }, [advancedOpen]);

  React.useEffect(() => {
    if (isRecording) {
      micPulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 380, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 380, easing: Easing.inOut(Easing.ease) })
        ),
        -1, false
      );
    } else {
      micPulse.value = withTiming(1, { duration: 180 });
    }
  }, [isRecording]);

  const generateBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: generateBtnScale.value }],
  }));

  const heroAnimStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: interpolate(heroOpacity.value, [0, 1], [16, 0]) }],
  }));

  const micAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micPulse.value }],
  }));

  // ─── Voice recording ─────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Microphone Access', 'Please allow microphone access to use voice input.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
    } catch {
      Alert.alert('Recording Error', 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) throw new Error('No audio URI');

      if (!apiKey) {
        Alert.alert('Voice Input', 'Please configure an API key in Settings to use voice input.');
        return;
      }

      const transcript = await transcribeAudio(provider, apiKey, uri);
      if (transcript) setIdea((prev) => prev ? `${prev} ${transcript}` : transcript);
    } catch (e: any) {
      Alert.alert('Transcription Error', e.message ?? 'Could not transcribe audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const C = isDark
    ? {
      bg: 'hsl(222,47%,6%)',
      card: 'hsl(222,47%,9%)',
      border: 'hsl(222,47%,16%)',
      text: 'hsl(210,40%,98%)',
      subtext: 'hsl(215,20%,55%)',
      purple: 'hsl(263,90%,65%)',
      input: 'hsl(222,47%,8%)',
      stepActive: 'hsl(263,90%,65%)',
      stepDone: 'hsl(142,65%,45%)',
      stepIdle: 'hsl(222,47%,22%)',
      iconColor: '#fff',
    }
    : {
      bg: 'hsl(210,40%,98%)',
      card: '#fff',
      border: 'hsl(220,20%,88%)',
      text: 'hsl(222,47%,11%)',
      subtext: 'hsl(215,20%,42%)',
      purple: 'hsl(263,80%,50%)',
      input: '#fff',
      stepActive: 'hsl(263,80%,50%)',
      stepDone: 'hsl(142,65%,35%)',
      stepIdle: 'hsl(220,20%,86%)',
      iconColor: 'hsl(222,47%,11%)',
    };

  const buildIdeaWithAdvanced = () => {
    const extras = ADVANCED_QUESTIONS.filter((q) => advanced[q.id]?.trim())
      .map((q) => `${q.label}: ${advanced[q.id].trim()}`)
      .join('\n');
    return extras ? `${idea.trim()}\n\nAdditional context:\n${extras}` : idea.trim();
  };

  const handleGenerate = async (isRetry = false) => {
    if (!idea.trim()) return;
    if (!hasKey) {
      setSettingsVisible(true);
      return;
    }

    // Button press animation
    generateBtnScale.value = withSpring(0.95, { damping: 12 }, () => {
      generateBtnScale.value = withSpring(1, { damping: 10 });
    });

    setIsGenerating(true);
    setErrorStep(null);
    if (!isRetry) {
      setCurrentStep(0);
      setResult(null);
    }

    const fullIdea = buildIdeaWithAdvanced();
    const timestamp = result?.timestamp ?? Date.now();
    const existingSteps = isRetry ? result?.steps ?? [] : [];

    try {
      const orchestrationResult = await runOrchestration({
        idea: fullIdea,
        provider,
        apiKey,
        onProgress: (step, _label) => setCurrentStep(step),
        existingSteps,
        onStepComplete: (step, allSteps) => {
          const partialResult = { idea: fullIdea, provider, timestamp, steps: allSteps };
          setResult(partialResult);
          saveToHistory(partialResult);
        },
      });

      setResult(orchestrationResult);
      setResultsVisible(true);
    } catch (e: any) {
      setErrorStep(currentStep);
      const msg = e?.message ?? 'An unexpected error occurred.';
      if (Platform.OS === 'web') {
        window.alert(`Generation Failed at Step ${currentStep}\n\n${msg}`);
      } else {
        Alert.alert(`Generation Failed at Step ${currentStep}`, msg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Called by ChatBot when user taps "Generate MVP from this discussion"
  const handleGenerateFromChat = (ideaSummary: string) => {
    setIdea(ideaSummary);
    setResult(null);
    setAdvancedOpen(false);
    // Small delay so the text box update is visible before generation begins
    setTimeout(() => handleGenerate(), 400);
  };

  const handleSettingsClose = () => {
    setSettingsVisible(false);
    refreshSettings();
  };

  // ─── Determine button state ──────────────────────────────────────────────────
  const btnDisabled = isGenerating || (!result && !idea.trim());
  const btnBg = isGenerating
    ? isDark ? 'hsl(222,47%,16%)' : 'hsl(220,20%,88%)'
    : result
      ? 'hsl(142,65%,35%)'
      : !idea.trim()
        ? isDark ? 'hsl(222,47%,14%)' : 'hsl(220,20%,90%)'
        : C.purple;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── Custom Header ─── */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.bg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={require('@/assets/images/logo-icon.png')} style={{ width: 28, height: 28, borderRadius: 6 }} />
          <Text style={{ color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3 }}>
            PromptCraft
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isDark ? <SunIcon size={17} color={C.iconColor} /> : <MoonIcon size={17} color={C.iconColor} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/history')}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <HistoryIcon size={17} color={C.iconColor} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSettingsVisible(true)}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <SettingsIcon size={17} color={C.iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView behavior={'padding'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Hero ─── */}
          <Animated.View style={[heroAnimStyle, { alignItems: 'center', marginBottom: 32 }]}>
            <Image
              source={require('@/assets/images/logo-icon.png')}
              style={{ width: 72, height: 72, borderRadius: 18, marginBottom: 16 }}
            />
            <Text
              style={{
                color: C.text, fontSize: 28, fontWeight: '800',
                textAlign: 'center', letterSpacing: -0.5, lineHeight: 34,
              }}
            >
              What are we{'\n'}building today?
            </Text>
            <Text
              style={{
                color: C.subtext, fontSize: 14, textAlign: 'center',
                marginTop: 8, lineHeight: 20, maxWidth: 300,
              }}
            >
              Describe your app idea and PromptCraft will generate a full MVP architecture in 4 steps.
            </Text>
          </Animated.View>

          {/* ─── Idea Input ─── */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <View
              style={{
                backgroundColor: C.card, borderRadius: 20, borderWidth: 1,
                borderColor: isRecording ? 'hsl(0,72%,45%)' : C.border, overflow: 'hidden', marginBottom: 16,
                ...(Platform.OS === 'web'
                  ? { boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.08)' }
                  : { elevation: 3 }),
              }}
            >
              <TextInput
                multiline
                placeholder={isTranscribing ? 'Transcribing…' : 'e.g. A marketplace for local farmers to sell directly to urban consumers, with real-time inventory, subscriptions, and route-optimized delivery...'}
                placeholderTextColor={C.subtext}
                value={idea}
                onChangeText={setIdea}
                editable={!isGenerating && !isTranscribing}
                style={{
                  color: C.text, fontSize: 15, lineHeight: 22,
                  minHeight: 140, padding: 16, textAlignVertical: 'top',
                }}
              />
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 12, paddingVertical: 10,
                  borderTopWidth: 1, borderTopColor: C.border,
                }}
              >
                <Text style={{ color: C.subtext, fontSize: 12, flex: 1 }}>
                  {isTranscribing
                    ? 'Transcribing audio…'
                    : isRecording
                      ? 'Recording… tap mic to stop'
                      : idea.length > 0
                        ? `${idea.length} chars`
                        : 'Tip: more detail = better results'}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {hasKey && (
                    <View
                      style={{
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                        backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(109,40,217,0.1)',
                      }}
                    >
                      <Text style={{ color: C.purple, fontSize: 11, fontWeight: '700' }}>
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </Text>
                    </View>
                  )}

                  {/* Voice button */}
                  <AnimatedTouchable
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={isGenerating || isTranscribing}
                    style={[micAnimStyle, {
                      width: 34, height: 34, borderRadius: 17,
                      backgroundColor: isRecording
                        ? 'hsl(0,72%,45%)'
                        : isTranscribing
                          ? (isDark ? 'rgba(139,92,246,0.2)' : 'rgba(109,40,217,0.12)')
                          : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
                      alignItems: 'center', justifyContent: 'center',
                    }]}
                  >
                    {isTranscribing
                      ? <ActivityIndicator size="small" color={C.purple} />
                      : isRecording
                        ? <StopCircle size={16} color="#fff" />
                        : <Mic size={16} color={isGenerating ? C.subtext : C.subtext} />}
                  </AnimatedTouchable>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ─── Progress Stepper ─── */}
          {(isGenerating || result) && (
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={{
                backgroundColor: C.card, borderRadius: 16, borderWidth: 1,
                borderColor: C.border, padding: 16, marginBottom: 16, gap: 12,
              }}
            >
              <Text style={{ color: C.subtext, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
                {isGenerating ? 'Generating…' : 'Complete'}
              </Text>
              {STEPS.map((step, i) => {
                const stepNum = i + 1;
                const isDone = result ? result.steps[i] !== undefined : false;
                const isActive = isGenerating && stepNum === currentStep;
                const isError = !isGenerating && errorStep === stepNum;
                return (
                  <StepRow
                    key={step.label}
                    step={step}
                    stepNum={stepNum}
                    isDone={isDone}
                    isActive={isActive}
                    isError={isError}
                    isLast={i === STEPS.length - 1}
                    result={result}
                    C={C}
                  />
                );
              })}
            </Animated.View>
          )}

          {/* ─── Advanced Options ─── */}
          {!isGenerating && !result && (
            <Animated.View entering={FadeInDown.duration(500).delay(200)} style={{ marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setAdvancedOpen((v) => !v)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: C.card, borderRadius: advancedOpen ? 14 : 14,
                  borderBottomLeftRadius: advancedOpen ? 0 : 14,
                  borderBottomRightRadius: advancedOpen ? 0 : 14,
                  borderWidth: 1,
                  borderColor: advancedOpen ? C.purple : C.border,
                  paddingHorizontal: 16, paddingVertical: 13,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>🔆</Text>
                  <View>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Advanced Options</Text>
                    <Text style={{ color: C.subtext, fontSize: 11 }}>Optional — add context for better results</Text>
                  </View>
                </View>
                {advancedOpen ? <ChevronUp size={18} color={C.subtext} /> : <ChevronDown size={18} color={C.subtext} />}
              </TouchableOpacity>

              {advancedOpen && (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={{
                    backgroundColor: C.card, borderRadius: 14,
                    borderWidth: 1, borderTopWidth: 0, borderColor: C.purple,
                    padding: 16, gap: 14,
                    borderTopLeftRadius: 0, borderTopRightRadius: 0,
                  }}
                >
                  <Text style={{ color: C.subtext, fontSize: 12, lineHeight: 17 }}>
                    All fields optional. More context = more accurate MVP architecture.
                  </Text>
                  {ADVANCED_QUESTIONS.map((q) => (
                    <View key={q.id} style={{ gap: 5 }}>
                      <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>{q.label}</Text>
                      <TextInput
                        placeholder={q.placeholder}
                        placeholderTextColor={C.subtext}
                        value={advanced[q.id] ?? ''}
                        onChangeText={(t) => setAdvanced((prev) => ({ ...prev, [q.id]: t }))}
                        style={{
                          backgroundColor: C.input, borderRadius: 10,
                          borderWidth: 1,
                          borderColor: advanced[q.id]?.trim() ? C.purple : C.border,
                          paddingHorizontal: 14, paddingVertical: 10,
                          color: C.text, fontSize: 13,
                        }}
                      />
                    </View>
                  ))}
                  {Object.values(advanced).some((v) => v?.trim()) && (
                    <TouchableOpacity onPress={() => setAdvanced({})} style={{ alignSelf: 'flex-end' }}>
                      <Text style={{ color: C.subtext, fontSize: 12 }}>Clear all fields</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}
            </Animated.View>
          )}

          {/* ─── Generate Button ─── */}
          <AnimatedTouchable
            onPress={result ? () => setResultsVisible(true) : () => handleGenerate()}
            onPressIn={() => { if (!btnDisabled) generateBtnScale.value = withSpring(0.96, { damping: 15 }); }}
            onPressOut={() => { generateBtnScale.value = withSpring(1, { damping: 12 }); }}
            disabled={btnDisabled}
            style={[
              generateBtnAnimStyle,
              {
                borderRadius: 16, paddingVertical: 16,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                backgroundColor: btnBg,
                ...(Platform.OS === 'web' && !isGenerating && idea.trim() && !result
                  ? { boxShadow: `0 4px 20px ${isDark ? 'rgba(139,92,246,0.4)' : 'rgba(109,40,217,0.3)'}` }
                  : {}),
              },
            ]}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator color={isDark ? 'hsl(215,20%,55%)' : 'hsl(215,20%,50%)'} size="small" />
                <Text style={{ color: C.subtext, fontSize: 16, fontWeight: '700' }}>
                  Generating Step {currentStep} of 4…
                </Text>
              </>
            ) : result ? (
              <>
                <Text style={{ fontSize: 18 }}>📂</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>View Generated Architecture</Text>
              </>
            ) : (
              <>
                <ZapIcon size={20} color={!idea.trim() ? C.subtext : '#fff'} fill={!idea.trim() ? 'transparent' : '#fff'} />
                <Text style={{ color: !idea.trim() ? C.subtext : '#fff', fontSize: 16, fontWeight: '700' }}>
                  {hasKey ? 'Generate MVP Architecture' : 'Configure API Key & Generate'}
                </Text>
              </>
            )}
          </AnimatedTouchable>

          {/* Retry button if failed */}
          {errorStep !== null && !isGenerating && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <TouchableOpacity
                onPress={() => handleGenerate(true)}
                style={{
                  marginTop: 12, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20,
                  alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                  backgroundColor: 'hsl(0,72%,45%)',
                }}
              >
                <RotateCcw size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                  Retry Step {errorStep}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ZIP instructions */}
          {!isGenerating && !result && (
            <Animated.View entering={FadeInDown.duration(500).delay(300)} style={{ marginTop: 16, alignItems: 'center', opacity: 0.8 }}>
              <Text style={{ color: C.subtext, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                Once generated, export as ZIP and drop into your IDE.{'\n'}
                PromptCraft's master prompt will guide your AI agent to build the full MVP.
              </Text>
            </Animated.View>
          )}

          {/* Reset after generation */}
          {result && !isGenerating && (
            <TouchableOpacity
              onPress={() => { setResult(null); setIdea(''); }}
              style={{ marginTop: 12, alignItems: 'center' }}
            >
              <Text style={{ color: C.subtext, fontSize: 13 }}>↺  Start over with a new idea</Text>
            </TouchableOpacity>
          )}

          {/* ─── Feature Cards ─── */}
          {!isGenerating && !result && (
            <Animated.View key={isDark ? 'dark-cards' : 'light-cards'} entering={FadeInDown.duration(500).delay(350)} style={{ marginTop: 32 }}>
              <Text
                style={{
                  color: C.subtext, fontSize: 11, fontWeight: '700',
                  letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
                }}
              >
                What PromptCraft generates
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { icon: '🔍', title: 'Market Research', desc: 'Competitors, tech landscape, user personas' },
                  { icon: '📋', title: 'Product (PRD)', desc: 'Features, user stories, success metrics' },
                  { icon: '⚙️', title: 'Tech Architecture', desc: 'Stack, data model, API design' },
                  { icon: '🤖', title: 'Agent Prompt', desc: 'Ready-to-run AI coding orchestration' },
                ].map((card, i) => (
                  <Animated.View
                    key={card.title}
                    entering={FadeInDown.duration(400).delay(400 + i * 60)}
                    style={{
                      width: '47%', backgroundColor: C.card, borderRadius: 14,
                      borderWidth: 1, borderColor: C.border, padding: 14, gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{card.icon}</Text>
                    <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>{card.title}</Text>
                    <Text style={{ color: C.subtext, fontSize: 11, lineHeight: 15 }}>{card.desc}</Text>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Modals ─── */}
      <SettingsModal visible={settingsVisible} onClose={handleSettingsClose} />

      <ResultsTabs
        visible={resultsVisible}
        result={result}
        onClose={() => setResultsVisible(false)}
      />

      <ChatBot
        mode={result ? 'refine' : 'new_idea'}
        context={result ? JSON.stringify(result) : idea}
        onRegenerate={result ? (_summary: string) => handleGenerate() : undefined}
        onGenerateFromChat={handleGenerateFromChat}
      />
    </View>
  );
}
