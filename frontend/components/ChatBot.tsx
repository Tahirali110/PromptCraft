/**
 * components/ChatBot.tsx
 * Sticky AI assistant — full-screen modal, keyboard-aware, safe-area safe.
 * Fixes:
 *  - Safe-area insets on all screens (no content behind status bar / home indicator)
 *  - Scroll bug: only scrolls to end once on session open (no visible animation), 
 *    then only on new messages
 *  - Smooth Reanimated animations: FAB spring, modal slide, bubbles fade, chips spring
 *  - Generate MVP button after ≥2 user messages in new_idea mode
 *  - Voice input via expo-av + OpenAI Whisper
 *  - New Chat / Select Project / Chat History
 */
import * as React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  StatusBar,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  RotateCcw,
  Plus,
  FolderOpen,
  Clock,
  ChevronLeft,
  Trash2,
  Mic,
  StopCircle,
  Zap,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useSettings } from './SettingsModal';
import { useTheme } from '@/lib/themeContext';
import { callProvider, transcribeAudio } from '@/lib/orchestrator';
import { loadHistory } from '@/lib/history';
import type { OrchestrationResult } from '@/lib/orchestrator';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  projectTimestamp?: number;
}

const CHAT_SESSIONS_KEY = 'promptcraft_chat_sessions';

// ─── Persistence ──────────────────────────────────────────────────────────────
async function loadChatSessions(): Promise<ChatSession[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAT_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveChatSessions(sessions: ChatSession[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions.slice(0, 100)));
  } catch { }
}

// ─── Animated bubble ─────────────────────────────────────────────────────────
function MessageBubble({ message, C }: { message: ChatMessage; C: any }) {
  return (
    <Animated.View
      entering={FadeIn.duration(250).springify().damping(18)}
      style={{
        alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        backgroundColor: message.role === 'user' ? C.userBubble : C.aiBubble,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        borderBottomRightRadius: message.role === 'user' ? 4 : 18,
        borderBottomLeftRadius: message.role === 'assistant' ? 4 : 18,
        marginBottom: 6,
      }}
    >
      <Text style={{ color: message.role === 'user' ? '#fff' : C.text, fontSize: 14, lineHeight: 21 }}>
        {message.content}
      </Text>
    </Animated.View>
  );
}

// ─── Action chip ──────────────────────────────────────────────────────────────
function ActionChip({
  icon, label, onPress, active, C,
}: { icon: React.ReactNode; label: string; onPress: () => void; active?: boolean; C: any }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.90, { damping: 12, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 10, stiffness: 200 }); }}
      style={[anim, {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20,
        backgroundColor: active ? 'rgba(139,92,246,0.14)' : 'rgba(128,128,128,0.08)',
        borderWidth: 1, borderColor: active ? 'rgba(139,92,246,0.35)' : C.border,
      }]}
    >
      {icon}
      <Text style={{ color: active ? C.purple : C.subtext, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </AnimatedTouchable>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ChatBotProps {
  mode?: 'new_idea' | 'refine';
  context?: string;
  onRegenerate?: (chatSummary: string) => void;
  onGenerateFromChat?: (ideaSummary: string) => void;
  projectToRefine?: OrchestrationResult | null;
  onProjectToRefineConsumed?: () => void;
}

type Screen = 'fab' | 'chat' | 'history' | 'pick_project';

// ─── Component ────────────────────────────────────────────────────────────────
export function ChatBot({
  mode = 'new_idea',
  context,
  onRegenerate,
  onGenerateFromChat,
  projectToRefine,
  onProjectToRefineConsumed,
}: ChatBotProps) {
  const { isDark } = useTheme();
  const { provider, apiKey } = useSettings();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const [screen, setScreen] = React.useState<Screen>('fab');
  const [chatMode, setChatMode] = React.useState<'new_idea' | 'refine'>(mode);
  const [activeSession, setActiveSession] = React.useState<ChatSession | null>(null);
  const [allSessions, setAllSessions] = React.useState<ChatSession[]>([]);
  const [allProjects, setAllProjects] = React.useState<OrchestrationResult[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [linkedProject, setLinkedProject] = React.useState<OrchestrationResult | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [recording, setRecording] = React.useState<Audio.Recording | null>(null);

  // Scroll: only scroll to end once when session first opens (no animation),
  // then auto-scroll on new messages only
  const isFirstScrollDone = React.useRef(false);
  const scrollRef = React.useRef<ScrollView>(null);

  // ─── Animations ─────────────────────────────────────────────────────────────
  const fabScale = useSharedValue(1);
  const micPulse = useSharedValue(1);
  const generateBtnScale = useSharedValue(1);
  const sendBtnScale = useSharedValue(1);

  const fabAnim = useAnimatedStyle(() => ({ transform: [{ scale: fabScale.value }] }));
  const micAnim = useAnimatedStyle(() => ({ transform: [{ scale: micPulse.value }] }));
  const generateBtnAnim = useAnimatedStyle(() => ({ transform: [{ scale: generateBtnScale.value }] }));
  const sendBtnAnim = useAnimatedStyle(() => ({ transform: [{ scale: sendBtnScale.value }] }));

  // Pulse mic button while recording
  React.useEffect(() => {
    if (isRecording) {
      micPulse.value = withRepeat(
        withSequence(
          withTiming(1.18, { duration: 380, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 380, easing: Easing.inOut(Easing.ease) })
        ),
        -1, false
      );
    } else {
      micPulse.value = withTiming(1, { duration: 180 });
    }
  }, [isRecording]);

  // ─── Colors ─────────────────────────────────────────────────────────────────
  const C = React.useMemo(() => isDark ? {
    bg: 'hsl(222,47%,7%)',
    card: 'hsl(222,47%,10%)',
    border: 'hsl(222,47%,16%)',
    text: 'hsl(210,40%,98%)',
    subtext: 'hsl(215,20%,55%)',
    purple: 'hsl(263,90%,65%)',
    input: 'hsl(222,47%,12%)',
    userBubble: 'hsl(263,90%,60%)',
    aiBubble: 'hsl(222,47%,14%)',
    headerBg: 'hsl(222,47%,9%)',
    green: 'hsl(142,65%,45%)',
    red: 'hsl(0,72%,55%)',
    chipsBg: 'hsl(222,47%,9%)',
  } : {
    bg: '#fafafa',
    card: '#fff',
    border: 'hsl(220,20%,88%)',
    text: 'hsl(222,47%,11%)',
    subtext: 'hsl(215,20%,42%)',
    purple: 'hsl(263,80%,50%)',
    input: 'hsl(210,40%,96%)',
    userBubble: 'hsl(263,80%,50%)',
    aiBubble: 'hsl(210,40%,95%)',
    headerBg: '#fff',
    green: 'hsl(142,65%,35%)',
    red: 'hsl(0,72%,45%)',
    chipsBg: '#f5f5f5',
  }, [isDark]);

  // ─── Load on mount ───────────────────────────────────────────────────────────
  React.useEffect(() => { loadChatSessions().then(setAllSessions); }, []);

  // ─── Open from History "Chat with AI" ────────────────────────────────────────
  React.useEffect(() => {
    if (projectToRefine) {
      startRefineSession(projectToRefine);
      onProjectToRefineConsumed?.();
    }
  }, [projectToRefine]);

  // ─── Session helpers ─────────────────────────────────────────────────────────
  const persistSessions = async (sessions: ChatSession[]) => {
    setAllSessions(sessions);
    await saveChatSessions(sessions);
  };

  const openSession = (sess: ChatSession) => {
    isFirstScrollDone.current = false; // reset so we scroll to end once on open
    setActiveSession(sess);
    setScreen('chat');
  };

  const startRefineSession = (project: OrchestrationResult) => {
    const sess: ChatSession = {
      id: `sess_${Date.now()}`,
      title: `Refine: ${project.idea.slice(0, 40)}`,
      messages: [{
        role: 'assistant',
        content: `Hi! I'm looking at your project:\n\n**${project.idea.slice(0, 80)}${project.idea.length > 80 ? '…' : ''}**\n\nWhat changes would you like? Once done, tap **Regenerate** to apply them.`,
      }],
      createdAt: Date.now(),
      projectTimestamp: project.timestamp,
    };
    setLinkedProject(project);
    setChatMode('refine');
    openSession(sess);
  };

  const handleNewChat = () => {
    setChatMode('new_idea');
    setLinkedProject(null);
    openSession({
      id: `sess_${Date.now()}`,
      title: 'New Idea',
      messages: [{
        role: 'assistant',
        content: "Hi! Tell me about your app idea and I'll help you refine it. When you're ready, tap **Generate MVP** to create the full architecture.",
      }],
      createdAt: Date.now(),
    });
  };

  const handlePickProject = async () => {
    const projects = await loadHistory();
    setAllProjects(projects);
    setScreen('pick_project');
  };

  const handleOpenHistory = async () => {
    const sessions = await loadChatSessions();
    setAllSessions(sessions);
    setScreen('history');
  };

  const handleResumeSession = (sess: ChatSession) => {
    if (sess.projectTimestamp) {
      loadHistory().then((projects) => {
        const proj = projects.find((p) => p.timestamp === sess.projectTimestamp) ?? null;
        setLinkedProject(proj);
        setChatMode(proj ? 'refine' : 'new_idea');
      });
    } else {
      setLinkedProject(null);
      setChatMode('new_idea');
    }
    isFirstScrollDone.current = false;
    setActiveSession(sess);
    setScreen('chat');
  };

  const handleDeleteSession = (id: string) => {
    Alert.alert('Delete Chat', 'Delete this chat session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = allSessions.filter((s) => s.id !== id);
          await persistSessions(updated);
          if (activeSession?.id === id) setActiveSession(null);
        },
      },
    ]);
  };

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
      if (transcript) setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
    } catch (e: any) {
      Alert.alert('Transcription Error', e.message ?? 'Could not transcribe audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // ─── Send ────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeSession) return;
    const userMsg = input.trim();
    setInput('');

    const updatedMessages: ChatMessage[] = [
      ...activeSession.messages,
      { role: 'user', content: userMsg },
    ];
    const updatedSession: ChatSession = {
      ...activeSession,
      messages: updatedMessages,
      title: activeSession.title === 'New Idea' && activeSession.messages.length <= 1
        ? userMsg.slice(0, 40) : activeSession.title,
    };
    setActiveSession(updatedSession);
    setIsLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const systemPrompt = chatMode === 'new_idea'
        ? `You are PromptCraft's AI assistant. Help the user brainstorm and refine their MVP app idea. Be concise, practical and encouraging. Ask targeted clarifying questions. When the user has a clear idea, remind them to tap "Generate MVP".`
        : `You are PromptCraft's AI assistant helping refine an MVP architecture. ${linkedProject
          ? `Project: ${linkedProject.idea}\n\nDocs summary:\n${linkedProject.steps.map((s, i) => `Step ${i + 1} (${s.label}): ${s.content.slice(0, 200)}…`).join('\n\n')}`
          : context ?? ''}\n\nHelp them clarify desired changes concisely.`;

      const response = await callProvider(
        provider, apiKey, systemPrompt, userMsg,
        updatedMessages.slice(0, -1),
      );

      const finalMessages: ChatMessage[] = [...updatedMessages, { role: 'assistant', content: response }];
      const finalSession: ChatSession = { ...updatedSession, messages: finalMessages };
      setActiveSession(finalSession);

      const idx = allSessions.findIndex((s) => s.id === finalSession.id);
      const updated = idx >= 0
        ? allSessions.map((s, i) => i === idx ? finalSession : s)
        : [finalSession, ...allSessions];
      await persistSessions(updated);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setActiveSession({
        ...updatedSession,
        messages: [...updatedMessages, { role: 'assistant', content: `Sorry, something went wrong: ${e.message}` }],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Generate MVP from chat ───────────────────────────────────────────────────
  const handleGenerateFromChat = async () => {
    if (!activeSession || !onGenerateFromChat) return;
    generateBtnScale.value = withSpring(0.92, { damping: 12 }, () => {
      generateBtnScale.value = withSpring(1, { damping: 10 });
    });
    setIsLoading(true);
    try {
      const conversationText = activeSession.messages
        .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
        .join('\n\n');
      const summary = await callProvider(
        provider, apiKey,
        `Summarize this brainstorming conversation into a concise detailed app idea (2-4 sentences). Include: app type, target users, key features, monetization, platform, tech preferences. Return ONLY the description, no preamble.`,
        `Conversation:\n\n${conversationText}\n\nSummarize:`,
        [],
      );
      onGenerateFromChat(summary.trim());
      setScreen('fab');
    } catch {
      const fallback = activeSession.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
      onGenerateFromChat(fallback);
      setScreen('fab');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Regenerate ───────────────────────────────────────────────────────────────
  const handleRegenerate = () => {
    if (!onRegenerate || !activeSession) return;
    const summary = activeSession.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    onRegenerate(summary);
    setScreen('fab');
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const hasEnoughForGenerate = (activeSession?.messages.filter((m) => m.role === 'user').length ?? 0) >= 2;

  // ─── Header ───────────────────────────────────────────────────────────────────
  const renderHeader = (title: string, onBack?: () => void) => (
    <View style={{
      backgroundColor: C.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      paddingTop: insets.top + 8,
      paddingBottom: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    }}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={{ padding: 4, marginRight: 2 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ChevronLeft size={22} color={C.subtext} />
        </TouchableOpacity>
      )}
      <Sparkles size={17} color={C.purple} />
      <Text style={{ color: C.text, fontWeight: '700', fontSize: 16, flex: 1 }} numberOfLines={1}>{title}</Text>
      <TouchableOpacity
        onPress={() => setScreen('fab')}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={17} color={C.subtext} />
      </TouchableOpacity>
    </View>
  );

  // ─── Chat screen ──────────────────────────────────────────────────────────────
  const renderChat = () => (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {renderHeader(
        chatMode === 'refine' ? `Refine: ${linkedProject?.idea.slice(0, 26) ?? 'Project'}…` : 'PromptCraft Assistant',
        () => setScreen('fab')
      )}

      {/* Chips */}
      <View style={{
        flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 9,
        borderBottomWidth: 1, borderBottomColor: C.border,
        backgroundColor: C.chipsBg, flexWrap: 'wrap',
      }}>
        <ActionChip icon={<Plus size={12} color={C.purple} />} label="New Chat" onPress={handleNewChat} active C={C} />
        <ActionChip icon={<FolderOpen size={12} color={C.subtext} />} label="Project" onPress={handlePickProject} C={C} />
        <ActionChip icon={<Clock size={12} color={C.subtext} />} label="History" onPress={handleOpenHistory} C={C} />
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 10 }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          if (!isFirstScrollDone.current) {
            // First time: scroll instantly to bottom, no visible animation
            isFirstScrollDone.current = true;
            scrollRef.current?.scrollToEnd({ animated: false });
          }
        }}
      >
        {(activeSession?.messages ?? []).map((m, i) => (
          <MessageBubble key={`${activeSession?.id}-${i}`} message={m} C={C} />
        ))}
        {isLoading && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{
              alignSelf: 'flex-start', backgroundColor: C.aiBubble,
              padding: 14, borderRadius: 18, borderBottomLeftRadius: 4, marginBottom: 6,
            }}
          >
            <ActivityIndicator size="small" color={C.purple} />
          </Animated.View>
        )}
      </ScrollView>

      {/* Generate MVP button */}
      {chatMode === 'new_idea' && onGenerateFromChat && hasEnoughForGenerate && (
        <Animated.View
          entering={FadeIn.duration(350).springify()}
          style={{
            paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
            borderTopWidth: 1, borderTopColor: C.border,
            backgroundColor: isDark ? 'rgba(109,40,217,0.09)' : 'rgba(109,40,217,0.05)',
          }}
        >
          <AnimatedTouchable
            onPress={handleGenerateFromChat}
            onPressIn={() => { generateBtnScale.value = withSpring(0.95, { damping: 14 }); }}
            onPressOut={() => { generateBtnScale.value = withSpring(1, { damping: 12 }); }}
            disabled={isLoading}
            style={[generateBtnAnim, {
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, paddingVertical: 13, borderRadius: 14, backgroundColor: C.purple,
            }]}
          >
            <Zap size={16} color="#fff" fill="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              Generate MVP from this discussion
            </Text>
          </AnimatedTouchable>
        </Animated.View>
      )}

      {/* Regenerate button */}
      {chatMode === 'refine' && onRegenerate && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{
            paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
            borderTopWidth: 1, borderTopColor: C.border,
            backgroundColor: isDark ? 'rgba(139,92,246,0.07)' : 'rgba(109,40,217,0.04)',
          }}
        >
          <TouchableOpacity
            onPress={handleRegenerate}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: C.purple,
            }}
          >
            <RotateCcw size={15} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Regenerate with these changes</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Input bar — pinned at bottom, above home indicator */}
      <View style={{
        paddingHorizontal: 12, paddingTop: 10,
        paddingBottom: keyboardHeight > 0 ? 10 : insets.bottom + 10,
        borderTopWidth: 1, borderTopColor: C.border,
        backgroundColor: C.bg,
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
      }}>
        <View style={{
          flex: 1, backgroundColor: C.input, borderRadius: 22,
          borderWidth: 1, borderColor: C.border,
          paddingLeft: 14, paddingRight: 10, paddingVertical: 8,
          flexDirection: 'row', alignItems: 'flex-end',
        }}>
          <TextInput
            placeholder={isTranscribing ? 'Transcribing…' : 'Type or speak…'}
            placeholderTextColor={C.subtext}
            value={input}
            onChangeText={setInput}
            style={{
              flex: 1, color: C.text, fontSize: 14, lineHeight: 20,
              maxHeight: 120, paddingTop: 2, paddingBottom: 2,
            }}
            multiline
            blurOnSubmit={false}
            editable={!isTranscribing}
          />
        </View>

        {/* Mic button */}
        <AnimatedTouchable
          onPress={isRecording ? stopRecording : startRecording}
          style={[micAnim, {
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: isRecording ? C.red : isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
            alignItems: 'center', justifyContent: 'center',
          }]}
        >
          {isTranscribing
            ? <ActivityIndicator size="small" color={C.purple} />
            : isRecording
              ? <StopCircle size={19} color="#fff" />
              : <Mic size={19} color={C.subtext} />}
        </AnimatedTouchable>

        {/* Send button */}
        <AnimatedTouchable
          onPress={handleSend}
          disabled={!input.trim() || isLoading}
          onPressIn={() => { if (input.trim()) sendBtnScale.value = withSpring(0.88, { damping: 12 }); }}
          onPressOut={() => { sendBtnScale.value = withSpring(1, { damping: 10 }); }}
          style={[sendBtnAnim, {
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: input.trim() && !isLoading ? C.purple : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
            alignItems: 'center', justifyContent: 'center',
          }]}
        >
          <Send size={18} color={input.trim() && !isLoading ? '#fff' : C.subtext} />
        </AnimatedTouchable>
      </View>
    </View>
  );

  // ─── Chat History ──────────────────────────────────────────────────────────────
  const renderHistoryScreen = () => (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {renderHeader('Chat History', () => setScreen('chat'))}
      {allSessions.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ fontSize: 42 }}>💬</Text>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>No chats yet</Text>
          <Text style={{ color: C.subtext, fontSize: 13 }}>Start a new conversation</Text>
          <TouchableOpacity onPress={handleNewChat} style={{ marginTop: 10, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12, backgroundColor: C.purple }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>New Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16, gap: 10 }}>
          {allSessions.map((sess, i) => (
            <Animated.View
              key={sess.id}
              entering={FadeIn.duration(220).delay(i * 35)}
              style={{
                backgroundColor: C.card, borderRadius: 12, borderWidth: 1,
                borderColor: C.border, flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
              }}
            >
              <TouchableOpacity onPress={() => handleResumeSession(sess)} style={{ flex: 1, padding: 14, gap: 3 }}>
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{sess.title}</Text>
                <Text style={{ color: C.subtext, fontSize: 11 }}>{sess.messages.length - 1} messages · {formatDate(sess.createdAt)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteSession(sess.id)} style={{ padding: 14, paddingLeft: 8 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Trash2 size={16} color={C.subtext} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // ─── Pick Project ─────────────────────────────────────────────────────────────
  const renderPickProject = () => (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {renderHeader('Select a Project', () => setScreen('chat'))}
      {allProjects.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ fontSize: 42 }}>📂</Text>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>No projects yet</Text>
          <Text style={{ color: C.subtext, fontSize: 13, textAlign: 'center', maxWidth: 260 }}>Generate an MVP first, then refine it here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16, gap: 10 }}>
          <Text style={{ color: C.subtext, fontSize: 12, marginBottom: 4 }}>Tap a project to discuss changes</Text>
          {allProjects.map((proj, i) => (
            <Animated.View key={proj.timestamp} entering={FadeIn.duration(220).delay(i * 35)}>
              <TouchableOpacity
                onPress={() => handleSelectProject(proj)}
                style={{
                  backgroundColor: C.card, borderRadius: 12, borderWidth: 1,
                  borderColor: C.border, padding: 14, gap: 4,
                }}
              >
                <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>{proj.idea}</Text>
                <Text style={{ color: C.subtext, fontSize: 11 }}>{proj.steps.length} docs · {formatDate(proj.timestamp)}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const handleSelectProject = (project: OrchestrationResult) => startRefineSession(project);

  // ─── FAB ─────────────────────────────────────────────────────────────────────
  if (screen === 'fab') {
    return (
      <AnimatedTouchable
        onPress={handleNewChat}
        onPressIn={() => { fabScale.value = withSpring(0.86, { damping: 11, stiffness: 280 }); }}
        onPressOut={() => { fabScale.value = withSpring(1, { damping: 10, stiffness: 200 }); }}
        style={[fabAnim, {
          position: 'absolute',
          bottom: insets.bottom + 20,
          right: 20,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: C.purple,
          alignItems: 'center', justifyContent: 'center',
          elevation: 8,
          shadowColor: C.purple,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
        }]}
      >
        <MessageCircle color="#fff" size={25} />
      </AnimatedTouchable>
    );
  }

  // ─── Full-screen modal ────────────────────────────────────────────────────────
  return (
    <Modal
      visible
      animationType="slide"
      transparent={false}
      onRequestClose={() => setScreen('fab')}
      statusBarTranslucent
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={C.bg}
      />
      <View
        style={{
          flex: 1, backgroundColor: C.bg,
          paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0,
        }}
      >
        {screen === 'chat' && renderChat()}
        {screen === 'history' && renderHistoryScreen()}
        {screen === 'pick_project' && renderPickProject()}
      </View>
    </Modal>
  );
}
