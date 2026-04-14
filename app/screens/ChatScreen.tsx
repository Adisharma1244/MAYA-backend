/**
 * ChatScreen.tsx — Fixed & Production-Ready
 *
 * ✅ Expo-safe Device ID (expo-crypto + AsyncStorage)
 * ✅ AsyncStorage persistence (last 20 messages)
 * ✅ LIFO via FlatList `inverted` prop
 * ✅ Infinite scroll (scroll-up loads older messages with cursor)
 * ✅ Typing indicator while bot responds
 * ✅ Error handling
 * ✅ Clean architecture
 *
 * Required installs:
 *   expo install expo-crypto @react-native-async-storage/async-storage
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  USER_ID: 'app_user_id',
  MESSAGES: 'chat_messages',
} as const;

const API_URL = 'https://web-production-50ca.up.railway.app/chat';
const MAX_STORED_MESSAGES = 20;
const PAGE_SIZE = 20;

const BOT_IMAGE = require('../../assets/images/GD2FB.jpg');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get or create a persistent UUID for this device (Expo-safe, no native module) */
async function getOrCreateUserId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    if (stored) return stored;

    // expo-crypto is safe in managed Expo workflow
    const newId = Crypto.randomUUID();
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newId);
    return newId;
  } catch {
    // Fallback: timestamp-based ID (won't persist but won't crash)
    return `user_${Date.now()}`;
  }
}

/** Load saved messages from AsyncStorage */
async function loadStoredMessages(): Promise<Message[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (!raw) return [];
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}

/** Save messages to AsyncStorage (keep only last N) */
async function saveMessages(msgs: Message[]): Promise<void> {
  try {
    // Keep the most recent MAX_STORED_MESSAGES (sorted oldest→newest)
    const toStore = msgs
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_STORED_MESSAGES);
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(toStore));
  } catch {
    // Storage failure is non-fatal
  }
}

// ─── TypingIndicator Component ───────────────────────────────────────────────

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={styles.typingRow}>
      <Image source={BOT_IMAGE} style={styles.msgDp} />
      <View style={styles.typingBubble}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.typingDot, { transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  const userIdRef = useRef<string>('');
  const flatListRef = useRef<FlatList<Message>>(null);

  // ─── Init: load userId + saved messages ────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [uid, saved] = await Promise.all([
        getOrCreateUserId(),
        loadStoredMessages(),
      ]);
      userIdRef.current = uid;

      if (saved.length > 0) {
        // FlatList is inverted → newest first in array = correct display order
        const sorted = saved.sort((a, b) => b.timestamp - a.timestamp);
        setMessages(sorted);
      }
    })();
  }, []);

  // ─── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = {
      id: `${Date.now()}_user`,
      text: trimmed,
      sender: 'user',
      timestamp: Date.now(),
    };

    // Optimistic update — prepend (inverted list shows newest first)
    setMessages(prev => {
      const updated = [userMsg, ...prev];
      saveMessages(updated); // fire-and-forget
      return updated;
    });
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userIdRef.current,
          message: trimmed,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const replyText =
        data?.reply ?? data?.response ?? 'Hmm, I had nothing to say 🤔';

      const botMsg: Message = {
        id: `${Date.now()}_bot`,
        text: replyText,
        sender: 'bot',
        timestamp: Date.now(),
      };

      setMessages(prev => {
        const updated = [botMsg, ...prev];
        saveMessages(updated);
        return updated;
      });
    } catch (err) {
      const errMsg: Message = {
        id: `${Date.now()}_err`,
        text: "Couldn't reach the server. Check your connection 😭",
        sender: 'bot',
        timestamp: Date.now(),
      };
      setMessages(prev => [errMsg, ...prev]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping]);

  // ─── Infinite scroll: load older messages ─────────────────────────────────
  // With FlatList `inverted`, onEndReached fires when user scrolls UP (toward older msgs)
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasOlderMessages || !userIdRef.current) return;

    setIsLoadingOlder(true);
    try {
      const url = cursor
        ? `${API_URL}/history?user_id=${userIdRef.current}&cursor=${cursor}&limit=${PAGE_SIZE}`
        : `${API_URL}/history?user_id=${userIdRef.current}&limit=${PAGE_SIZE}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const olderMsgs: Message[] = (data?.messages ?? []).map((m: any) => ({
        id: m.id ?? `${Date.now()}_${Math.random()}`,
        text: m.text ?? m.content ?? '',
        sender: m.sender ?? m.role === 'user' ? 'user' : 'bot',
        timestamp: m.timestamp ?? 0,
      }));

      if (olderMsgs.length === 0) {
        setHasOlderMessages(false);
        return;
      }

      setCursor(data?.next_cursor ?? null);
      if (!data?.next_cursor) setHasOlderMessages(false);

      // Append older messages to the END of array (inverted list = top of screen)
      setMessages(prev => [...prev, ...olderMsgs]);
    } catch {
      // Pagination failure is non-fatal — just stop trying
      setHasOlderMessages(false);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasOlderMessages, cursor]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => setProfileOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image source={BOT_IMAGE} style={styles.dp} />
          </TouchableOpacity>
          <View style={styles.topBarText}>
            <Text style={styles.name}>Maya</Text>
            {isTyping && (
              <Text style={styles.typingLabel}>typing...</Text>
            )}
          </View>
        </View>

        {/* MESSAGE LIST */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          inverted                          // ✅ LIFO: newest at bottom, scroll up for older
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadOlderMessages}  // fires when user scrolls to top (inverted)
          onEndReachedThreshold={0.3}
          ListHeaderComponent={isTyping ? <TypingIndicator /> : null}
          ListFooterComponent={
            isLoadingOlder ? (
              <View style={styles.loadingOlder}>
                <ActivityIndicator color="#7b2ff7" size="small" />
                <Text style={styles.loadingOlderText}>Loading older messages…</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                item.sender === 'user' ? styles.rowUser : styles.rowBot,
              ]}
            >
              {item.sender === 'bot' && (
                <Image source={BOT_IMAGE} style={styles.msgDp} />
              )}
              <View
                style={[
                  styles.bubble,
                  item.sender === 'user' ? styles.userBubble : styles.botBubble,
                ]}
              >
                <Text style={styles.text}>{item.text}</Text>
              </View>
            </View>
          )}
        />

        {/* INPUT BAR */}
        <View style={styles.inputBox}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#555"
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            editable={!isTyping}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, isTyping && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={isTyping}
          >
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>

        {/* PROFILE MODAL */}
        <Modal visible={profileOpen} animationType="slide" statusBarTranslucent>
          <SafeAreaView style={styles.modal}>
            <TouchableOpacity
              onPress={() => setProfileOpen(false)}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.close}>← Back</Text>
            </TouchableOpacity>

            <Image source={BOT_IMAGE} style={styles.bigDp} />
            <Text style={styles.profileName}>Maya</Text>
            <Text style={styles.bio}>
              Hey, I'm here to chat and make your day better.{'\n'}
              Let's talk and vibe together ✨
            </Text>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  container: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  topBarText: {
    marginLeft: 10,
  },
  name: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  typingLabel: {
    color: '#7b2ff7',
    fontSize: 12,
    marginTop: 1,
  },
  dp: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  // Messages
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    marginVertical: 5,
    alignItems: 'flex-end',
  },
  rowUser: { justifyContent: 'flex-end' },
  rowBot: { justifyContent: 'flex-start' },
  msgDp: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '75%',
  },
  userBubble: {
    backgroundColor: '#7b2ff7',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 4,
  },
  text: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },

  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 5,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    gap: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#7b2ff7',
  },

  // Older messages loader
  loadingOlder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingOlderText: {
    color: '#555',
    fontSize: 12,
  },

  // Input bar
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#0f0f0f',
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#7b2ff7',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#3a1a6a',
  },
  sendText: {
    color: '#fff',
    fontSize: 16,
  },

  // Profile modal
  modal: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    paddingTop: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  close: {
    color: '#fff',
    fontSize: 16,
  },
  bigDp: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  profileName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 14,
  },
  bio: {
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    fontSize: 15,
    lineHeight: 22,
  },
});