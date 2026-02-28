/**
 * components/ResultsTabs.tsx
 * Tabbed view of the 4 generated markdown documents.
 * Renders markdown beautifully in both light and dark mode.
 * Includes Copy and ZIP Export actions.
 */
import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '@/lib/themeContext';
import type { OrchestrationResult } from '@/lib/orchestrator';
import { exportAsZip, MASTER_PROMPT } from '@/lib/zipExport';

// ─── Tab meta ─────────────────────────────────────────────────────────────────
// Tab key -1 = master prompt (special), 0–3 = generated steps
const TABS = [
  { key: -1, label: '📝 Prompt', short: 'Prompt' },
  { key: 0, label: '🔍 Research', short: 'Research' },
  { key: 1, label: '📋 PRD', short: 'PRD' },
  { key: 2, label: '⚙️ Tech', short: 'Tech' },
  { key: 3, label: '🤖 Agent', short: 'Agent' },
];

// ─── Component ────────────────────────────────────────────────────────────────
interface ResultsTabsProps {
  visible: boolean;
  result: OrchestrationResult | null;
  onClose: () => void;
}

export function ResultsTabs({ visible, result, onClose }: ResultsTabsProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = React.useState(-1);
  const [copied, setCopied] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const C = isDark
    ? {
        bg: 'hsl(222,47%,6%)',
        card: 'hsl(222,47%,9%)',
        border: 'hsl(222,47%,16%)',
        text: 'hsl(210,40%,98%)',
        subtext: 'hsl(215,20%,55%)',
        tabActive: 'hsl(263,90%,65%)',
        tabActiveBg: 'rgba(139,92,246,0.15)',
        tabInactive: 'hsl(215,20%,50%)',
        codeBg: 'hsl(222,47%,11%)',
        codeText: 'hsl(173,80%,70%)',
        blockquoteBorder: 'hsl(263,90%,65%)',
        blockquoteBg: 'rgba(139,92,246,0.07)',
        hrColor: 'hsl(222,47%,16%)',
        headingColor: 'hsl(210,40%,98%)',
        linkColor: 'hsl(200,90%,65%)',
        purple: 'hsl(263,90%,65%)',
      }
    : {
        bg: 'hsl(210,40%,98%)',
        card: 'hsl(0,0%,100%)',
        border: 'hsl(220,20%,88%)',
        text: 'hsl(222,47%,11%)',
        subtext: 'hsl(215,20%,42%)',
        tabActive: 'hsl(263,80%,50%)',
        tabActiveBg: 'rgba(109,40,217,0.1)',
        tabInactive: 'hsl(215,20%,45%)',
        codeBg: 'hsl(220,20%,93%)',
        codeText: 'hsl(330,80%,40%)',
        blockquoteBorder: 'hsl(263,80%,50%)',
        blockquoteBg: 'rgba(109,40,217,0.05)',
        hrColor: 'hsl(220,20%,88%)',
        headingColor: 'hsl(222,47%,11%)',
        linkColor: 'hsl(200,90%,40%)',
        purple: 'hsl(263,80%,50%)',
      };

  const activeContent = activeTab === -1 ? MASTER_PROMPT : (result?.steps[activeTab]?.content ?? '');

  const handleCopy = async () => {
    await Clipboard.setStringAsync(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    if (!result) return;
    setExporting(true);
    try {
      await exportAsZip(result);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Unknown error');
    } finally {
      setExporting(false);
    }
  };

  // ─── Markdown styles ───────────────────────────────────────────────────────
  const mdStyles = {
    body: {
      color: C.text,
      fontSize: 14,
      lineHeight: 22,
      fontFamily: Platform.OS === 'web' ? '-apple-system, system-ui, sans-serif' : undefined,
    },
    heading1: {
      color: C.headingColor,
      fontSize: 22,
      fontWeight: '800' as const,
      marginTop: 20,
      marginBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      paddingBottom: 6,
    },
    heading2: {
      color: C.headingColor,
      fontSize: 18,
      fontWeight: '700' as const,
      marginTop: 18,
      marginBottom: 6,
    },
    heading3: {
      color: C.headingColor,
      fontSize: 15,
      fontWeight: '600' as const,
      marginTop: 14,
      marginBottom: 4,
    },
    paragraph: {
      color: C.text,
      fontSize: 14,
      lineHeight: 22,
      marginBottom: 10,
    },
    strong: { color: C.headingColor, fontWeight: '700' as const },
    em: { color: C.subtext, fontStyle: 'italic' as const },
    link: { color: C.linkColor, textDecorationLine: 'underline' as const },
    code_inline: {
      backgroundColor: C.codeBg,
      color: C.codeText,
      fontSize: 12,
      fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 4,
    },
    fence: {
      backgroundColor: C.codeBg,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    code_block: {
      backgroundColor: C.codeBg,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: C.blockquoteBorder,
      backgroundColor: C.blockquoteBg,
      paddingLeft: 12,
      paddingVertical: 6,
      marginVertical: 8,
      borderRadius: 4,
    },
    bullet_list: { marginVertical: 6 },
    ordered_list: { marginVertical: 6 },
    list_item: { color: C.text, fontSize: 14, lineHeight: 22 },
    hr: {
      backgroundColor: C.hrColor,
      height: 1,
      marginVertical: 16,
    },
    table: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      overflow: 'hidden' as const,
      marginVertical: 8,
    },
    thead: { backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(109,40,217,0.06)' },
    th: {
      color: C.tabActive,
      fontSize: 12,
      fontWeight: '700' as const,
      padding: 8,
      borderRightWidth: 1,
      borderRightColor: C.border,
    },
    td: {
      color: C.text,
      fontSize: 13,
      padding: 8,
      borderRightWidth: 1,
      borderRightColor: C.border,
    },
    tr: { borderBottomWidth: 1, borderBottomColor: C.border },
  };

  if (!result) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        {/* ─── Header ─── */}
        <View
          style={{
            backgroundColor: C.card,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
            paddingTop: Platform.OS === 'ios' ? 56 : 40,
            paddingHorizontal: 16,
            paddingBottom: 0,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text
                style={{
                  color: C.subtext,
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                MVP Architecture ·{' '}
                {result.provider.charAt(0).toUpperCase() + result.provider.slice(1)}
              </Text>
              <Text
                style={{ color: C.text, fontSize: 16, fontWeight: '700' }}
                numberOfLines={1}
              >
                {result.idea.length > 60 ? result.idea.slice(0, 60) + '…' : result.idea}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: C.subtext, fontSize: 16, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ─── Tabs ─── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 4, paddingBottom: 0 }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
                const isDone = tab.key === -1 ? true : (result.steps[tab.key]?.content?.length > 0);
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: isActive ? C.tabActiveBg : 'transparent',
                    borderBottomWidth: isActive ? 2 : 0,
                    borderBottomColor: C.tabActive,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    marginBottom: -1,
                  }}
                >
                  <Text
                    style={{
                      color: isActive ? C.tabActive : C.tabInactive,
                      fontSize: 13,
                      fontWeight: isActive ? '700' : '500',
                    }}
                  >
                    {tab.label}
                  </Text>
                  {isDone && !isActive && (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: 'hsl(142,65%,45%)',
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── Content ─── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        >
          {activeContent ? (
            <Markdown style={mdStyles as any}>{activeContent}</Markdown>
          ) : (
            <View
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}
            >
              <Text style={{ color: C.subtext, fontSize: 14 }}>No content for this step.</Text>
            </View>
          )}
        </ScrollView>

        {/* ─── Bottom Action Bar ─── */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: C.card,
            borderTopWidth: 1,
            borderTopColor: C.border,
            padding: 16,
            paddingBottom: Platform.OS === 'ios' ? 32 : 16,
            flexDirection: 'row',
            gap: 10,
          }}
        >
          {/* Copy current tab */}
          <TouchableOpacity
            onPress={handleCopy}
            style={{
              flex: 1,
              paddingVertical: 13,
              borderRadius: 12,
              backgroundColor: copied
                ? 'hsl(142,65%,35%)'
                : isDark
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.06)',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Text style={{ fontSize: 15 }}>{copied ? '✅' : '📋'}</Text>
            <Text
              style={{
                color: copied ? '#fff' : C.text,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>

          {/* Export ZIP */}
          <TouchableOpacity
            onPress={handleExport}
            disabled={exporting}
            style={{
              flex: 2,
              paddingVertical: 13,
              borderRadius: 12,
              backgroundColor: C.purple,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 7,
              opacity: exporting ? 0.7 : 1,
            }}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ fontSize: 15 }}>📦</Text>
            )}
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
              {exporting ? 'Exporting…' : 'Export for IDE (.zip)'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
