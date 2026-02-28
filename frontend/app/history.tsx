/**
 * app/history.tsx
 * History screen — multi-select delete, Chat with AI, view project
 */
import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CheckSquare, Square, Trash2, MessageCircle } from 'lucide-react-native';
import { useTheme } from '@/lib/themeContext';
import { loadHistory, deleteHistoryItem } from '@/lib/history';
import type { OrchestrationResult } from '@/lib/orchestrator';
import { ResultsTabs } from '@/components/ResultsTabs';
import { ChatBot } from '@/components/ChatBot';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  anthropic: 'Claude',
  openrouter: 'OpenRouter',
};

export default function HistoryScreen() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [sessions, setSessions] = React.useState<OrchestrationResult[]>([]);
  const [selected, setSelected] = React.useState<OrchestrationResult | null>(null);
  const [resultsVisible, setResultsVisible] = React.useState(false);
  const [checkedIds, setCheckedIds] = React.useState<Set<number>>(new Set());
  const [chatProject, setChatProject] = React.useState<OrchestrationResult | null>(null);

  const C = isDark
    ? {
        bg: 'hsl(222,47%,6%)',
        card: 'hsl(222,47%,9%)',
        border: 'hsl(222,47%,16%)',
        text: 'hsl(210,40%,98%)',
        subtext: 'hsl(215,20%,55%)',
        purple: 'hsl(263,90%,65%)',
        red: 'hsl(0,72%,65%)',
        green: 'hsl(142,65%,45%)',
        headerBg: 'hsl(222,47%,8%)',
        checkActive: 'hsl(263,90%,65%)',
      }
    : {
        bg: 'hsl(210,40%,98%)',
        card: '#fff',
        border: 'hsl(220,20%,88%)',
        text: 'hsl(222,47%,11%)',
        subtext: 'hsl(215,20%,42%)',
        purple: 'hsl(263,80%,50%)',
        red: 'hsl(0,72%,45%)',
        green: 'hsl(142,65%,35%)',
        headerBg: '#fff',
        checkActive: 'hsl(263,80%,50%)',
      };

  const isSelectMode = checkedIds.size > 0;

  const refresh = React.useCallback(() => {
    loadHistory().then(setSessions);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleCheck = (ts: number) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ts)) next.delete(ts);
      else next.add(ts);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (checkedIds.size === sessions.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(sessions.map((s) => s.timestamp)));
    }
  };

  const handleDeleteSelected = () => {
    const count = checkedIds.size;
    Alert.alert(
      `Delete ${count} project${count !== 1 ? 's' : ''}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Delete ${count}`,
          style: 'destructive',
          onPress: async () => {
            for (const ts of checkedIds) {
              await deleteHistoryItem(ts);
            }
            setCheckedIds(new Set());
            refresh();
          },
        },
      ]
    );
  };

  const handleOpen = (session: OrchestrationResult) => {
    if (isSelectMode) {
      toggleCheck(session.timestamp);
      return;
    }
    setSelected(session);
    setResultsVisible(true);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen
        options={{
          title: 'History',
          headerShown: true,
          headerStyle: { backgroundColor: C.headerBg },
          headerTintColor: C.text,
          headerRight: () =>
            isSelectMode ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 }}>
                <TouchableOpacity onPress={toggleSelectAll} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: C.purple, fontSize: 13, fontWeight: '600' }}>
                    {checkedIds.size === sessions.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteSelected}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: C.red,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Trash2 size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                    Delete ({checkedIds.size})
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null,
        }}
      />

      {sessions.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ fontSize: 48 }}>📂</Text>
          <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>No history yet</Text>
          <Text style={{ color: C.subtext, fontSize: 14, textAlign: 'center', maxWidth: 280 }}>
            After you generate an MVP architecture, it will appear here for easy access.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              marginTop: 16,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: C.purple,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
          <Text style={{ color: C.subtext, fontSize: 12, marginBottom: 4 }}>
            {sessions.length} project{sessions.length !== 1 ? 's' : ''} · Tap card to view, long-press to select
          </Text>

          {sessions.map((s) => {
            const isChecked = checkedIds.has(s.timestamp);
            return (
              <TouchableOpacity
                key={s.timestamp}
                activeOpacity={0.85}
                onPress={() => handleOpen(s)}
                onLongPress={() => toggleCheck(s.timestamp)}
                style={{
                  backgroundColor: C.card,
                  borderRadius: 14,
                  borderWidth: isChecked ? 2 : 1,
                  borderColor: isChecked ? C.checkActive : C.border,
                  overflow: 'hidden',
                }}
              >
                <View style={{ padding: 16, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* Checkbox */}
                    <TouchableOpacity onPress={() => toggleCheck(s.timestamp)} style={{ marginRight: 2 }}>
                      {isChecked ? (
                        <CheckSquare size={20} color={C.checkActive} />
                      ) : (
                        <Square size={20} color={C.subtext} />
                      )}
                    </TouchableOpacity>

                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: isDark
                          ? 'rgba(139,92,246,0.18)'
                          : 'rgba(109,40,217,0.1)',
                      }}
                    >
                      <Text style={{ color: C.purple, fontSize: 11, fontWeight: '700' }}>
                        {PROVIDER_LABELS[s.provider] ?? s.provider}
                      </Text>
                    </View>
                    <Text style={{ color: C.subtext, fontSize: 11 }}>{formatDate(s.timestamp)}</Text>
                  </View>

                  <Text
                    style={{ color: C.text, fontSize: 15, fontWeight: '700', lineHeight: 21, marginLeft: 28 }}
                    numberOfLines={2}
                  >
                    {s.idea}
                  </Text>

                  <Text style={{ color: C.subtext, fontSize: 12, marginLeft: 28 }}>
                    {s.steps.length} documents ·{' '}
                    {(s.steps.reduce((sum, st) => sum + st.content.length, 0) / 1000).toFixed(1)}k chars
                  </Text>
                </View>

                {/* Action buttons row */}
                <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border }}>
                  <TouchableOpacity
                    onPress={() => { setSelected(s); setResultsVisible(true); }}
                    style={{ flex: 1, paddingVertical: 11, alignItems: 'center' }}
                  >
                    <Text style={{ color: C.purple, fontSize: 13, fontWeight: '600' }}>
                      📂  View
                    </Text>
                  </TouchableOpacity>

                  <View style={{ width: 1, backgroundColor: C.border }} />

                  <TouchableOpacity
                    onPress={() => setChatProject(s)}
                    style={{ flex: 1, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 }}
                  >
                    <MessageCircle size={14} color={C.green} />
                    <Text style={{ color: C.green, fontSize: 13, fontWeight: '600' }}>
                      Chat with AI
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ResultsTabs
        visible={resultsVisible}
        result={selected}
        onClose={() => setResultsVisible(false)}
      />

      <ChatBot
        projectToRefine={chatProject}
        onProjectToRefineConsumed={() => setChatProject(null)}
      />
    </View>
  );
}
