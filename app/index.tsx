// app/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated, FlatList, Image, KeyboardAvoidingView,
  Modal, Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import {
  AdEventType,
  BannerAd,
  BannerAdSize,
  InterstitialAd,
} from 'react-native-google-mobile-ads';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── AD UNIT IDs ──────────────────────────────────────────────────
const BANNER_AD_UNIT_ID       = 'ca-app-pub-4939123118848020/6839283859';
const INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-4939123118848020/7062645130';
const MSG_AD_INTERVAL         = 5;

// ── WHO IS WHO ───────────────────────────────────────────────────
const AI = {
  male: {
    name: 'Maya',
    color: '#7b2ff7',
    image: require('../assets/images/GD2FB.jpg'),
    about: 'Hey there! I am Maya ✨',
    status: 'Always here to chat 💜',
    info: [
      { label: 'About',       value: 'Your AI companion, always ready to talk!' },
      { label: 'Personality', value: 'Friendly, caring, and fun 🌟' },
      { label: 'Language',    value: 'English & Hindi' },
      { label: 'Type',        value: 'AI Assistant' },
    ],
  },
  female: {
    name: 'Yash',
    color: '#e91e8c',
    image: require('../assets/images/yash.jpeg'),
    about: 'Hey there! I am Yash 🔥',
    status: 'Vibing and chatting 💗',
    info: [
      { label: 'About',       value: 'Your AI friend, always on your side!' },
      { label: 'Personality', value: 'Bold, fun, and real 🔥' },
      { label: 'Language',    value: 'English & Hindi' },
      { label: 'Type',        value: 'AI Assistant' },
    ],
  },
};

const API_URL     = 'https://garimasharma567890-maya-backend.hf.space/chat';
const HISTORY_URL = 'https://garimasharma567890-maya-backend.hf.space/history';
const PAGE_LIMIT  = 20;

type Gender  = 'male' | 'female';
type Message = { id: string; text: string; sender: 'user' | 'bot' };

const COMPANION: Record<Gender, string> = {
  male:   'maya',
  female: 'aryan',
};

// ── CREATE INTERSTITIAL INSTANCE (outside component) ─────────────
const interstitialAd = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

// ── HISTORY FETCHER ───────────────────────────────────────────────
async function fetchHistory(
  userId: string,
  gender: Gender,
  limit: number,
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    companion: COMPANION[gender],
    limit:     String(limit),
  });
  const url = `${HISTORY_URL}/${userId}?${params.toString()}`;
  console.log('📡 Fetching history from:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`History API ${res.status}`);
  const data = await res.json();
  console.log('📦 History API raw response:', JSON.stringify(data).slice(0, 300));

  let raw: any[] = [];
  if (Array.isArray(data))               raw = data;
  else if (Array.isArray(data.messages)) raw = data.messages;
  else if (Array.isArray(data.history))  raw = data.history;
  else if (Array.isArray(data.chats))    raw = data.chats;
  else if (Array.isArray(data.data))     raw = data.data;

  const hasMore = raw.length >= limit;
  console.log(`✅ Parsed ${raw.length} msgs | asked=${limit} | hasMore=${hasMore}`);

  const messages: Message[] = raw
    .map((item: any, i: number) => {
      const text = item.content ?? item.text ?? item.message ?? item.reply ?? '';
      let sender: 'user' | 'bot' = 'user';
      if (
        item.role === 'assistant' || item.role === 'bot' ||
        item.sender === 'bot'    || item.sender === 'assistant' ||
        item.type === 'bot'
      ) sender = 'bot';
      return { id: item.id ?? item._id ?? `hist_${i}_${Date.now()}`, text, sender };
    })
    .filter(m => m.text.trim().length > 0);

  return { messages, hasMore };
}

// ── TYPING DOTS ───────────────────────────────────────────────────
function TypingDots({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    dots.forEach((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(d, { toValue: -6, duration: 280, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0,  duration: 280, useNativeDriver: true }),
        Animated.delay(500),
      ])).start()
    );
  }, []);
  return (
    <View style={{
      flexDirection: 'row', padding: 12, backgroundColor: '#2a2a2a',
      borderRadius: 18, alignSelf: 'flex-start', marginVertical: 4, gap: 4,
    }}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 4,
            backgroundColor: color, transform: [{ translateY: d }],
          }}
        />
      ))}
    </View>
  );
}

// ── PROFILE MODAL ─────────────────────────────────────────────────
function ProfileModal({ visible, onClose, onSwitch, gender }: {
  visible: boolean;
  onClose: () => void;
  onSwitch: () => void;
  gender: Gender;
}) {
  const ai = AI[gender];
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={p.safe}>
        <View style={[p.header, { backgroundColor: ai.color }]}>
          <TouchableOpacity onPress={onClose} style={p.backBtn}>
            <Text style={p.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={p.headerTitle}>Profile</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[p.dpSection, { backgroundColor: ai.color + '18' }]}>
            <Image source={ai.image} style={[p.bigDp, { borderColor: ai.color }]} />
            <Text style={p.profileName}>{ai.name}</Text>
            <Text style={[p.onlineStatus, { color: ai.color }]}>● Online</Text>
          </View>
          <View style={p.section}>
            <Text style={[p.sectionLabel, { color: ai.color }]}>ABOUT</Text>
            <View style={p.sectionBox}>
              <Text style={p.sectionValue}>{ai.about}</Text>
            </View>
          </View>
          <View style={p.section}>
            <Text style={[p.sectionLabel, { color: ai.color }]}>STATUS</Text>
            <View style={p.sectionBox}>
              <Text style={p.sectionValue}>{ai.status}</Text>
            </View>
          </View>
          <View style={p.section}>
            <Text style={[p.sectionLabel, { color: ai.color }]}>INFO</Text>
            <View style={p.sectionBox}>
              {ai.info.map((item, i) => (
                <View key={i} style={[p.infoRow, i < ai.info.length - 1 && p.infoRowBorder]}>
                  <Text style={p.infoLabel}>{item.label}</Text>
                  <Text style={p.infoValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
          <TouchableOpacity
            style={[p.switchBtn, { borderColor: ai.color }]}
            onPress={onSwitch}
          >
            <Text style={[p.switchText, { color: ai.color }]}>🔄  Switch AI</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────
export default function ChatScreen() {
  const router = useRouter();

  const [gender,         setGender]        = useState<Gender>('male');
  const [messages,       setMessages]      = useState<Message[]>([]);
  const [input,          setInput]         = useState('');
  const [typing,         setTyping]        = useState(false);
  const [profileOpen,    setProfileOpen]   = useState(false);
  const [loadingHistory, setLoadingHistory]= useState(true);
  const [historyError,   setHistoryError]  = useState('');
  const [appReady,       setAppReady]      = useState(false);

  // ── Pagination ────────────────────────────────────────────────
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const limitRef      = useRef(PAGE_LIMIT);
  const isFetchingRef = useRef(false);

  const userIdRef = useRef('');
  const genderRef = useRef<Gender>('male');
  const ai        = AI[gender];

  // ── Ad state ──────────────────────────────────────────────────
  const adLoadedRef      = useRef(false);
  const [bannerVisible,  setBannerVisible] = useState(true);
  const msgsSinceAdRef   = useRef(0);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const retryTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load & auto-reload interstitial ───────────────────────────
  useEffect(() => {
    const onLoaded = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('✅ Interstitial ad LOADED');
      adLoadedRef.current = true;
      // Clear any pending retry timer since ad loaded successfully
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    });

    const onOpened = interstitialAd.addAdEventListener(AdEventType.OPENED, () => {
      console.log('📺 Interstitial ad OPENED');
    });

    const onClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('✅ Interstitial ad CLOSED');
      adLoadedRef.current = false;
      // Wait 2 seconds then reload
      retryTimerRef.current = setTimeout(() => {
        interstitialAd.load();
      }, 2000);
      // Run pending action
      if (pendingActionRef.current) {
        pendingActionRef.current();
        pendingActionRef.current = null;
      }
    });

    const onError = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('💥 Interstitial ad ERROR:', error.message);
      adLoadedRef.current = false;
      // ✅ KEY FIX: Wait 30 seconds before retrying — stops spam loop
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => {
        console.log('🔄 Retrying interstitial ad load...');
        interstitialAd.load();
      }, 30000);
    });

    // Initial load
    interstitialAd.load();
    console.log('🔄 Interstitial ad loading started...');

    return () => {
      onLoaded();
      onOpened();
      onClosed();
      onError();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // ── Show interstitial ─────────────────────────────────────────
  const showAdThen = useCallback((afterAd?: () => void) => {
    console.log('🎯 showAdThen called | adLoaded:', adLoadedRef.current);
    if (afterAd) pendingActionRef.current = afterAd;

    if (adLoadedRef.current) {
      console.log('▶️ Showing interstitial ad...');
      interstitialAd.show().catch((e) => {
        console.log('Show error:', e);
        if (pendingActionRef.current) {
          pendingActionRef.current();
          pendingActionRef.current = null;
        }
      });
    } else {
      console.log('⚠️ Ad not ready yet, running action directly');
      if (pendingActionRef.current) {
        pendingActionRef.current();
        pendingActionRef.current = null;
      }
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const g = await AsyncStorage.getItem('gender');
      if (!g) { router.replace('./gender'); return; }
      setGender(g as Gender);
      genderRef.current = g as Gender;

      let uid = await AsyncStorage.getItem('user_id');
      if (!uid) {
        uid = Crypto.randomUUID();
        await AsyncStorage.setItem('user_id', uid);
      }
      userIdRef.current = uid;
      console.log('👤 User ID:', uid);
      console.log('👤 Gender:', g);
      setAppReady(true);

      const cached = await AsyncStorage.getItem('msgs_' + g);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log(`💾 Loaded ${parsed.length} messages from cache`);
        setMessages(parsed);
      }

      try {
        setLoadingHistory(true);
        limitRef.current = PAGE_LIMIT;
        const { messages: serverMsgs, hasMore: more } =
          await fetchHistory(uid, g as Gender, PAGE_LIMIT);

        if (serverMsgs.length > 0) {
          const reversed = [...serverMsgs].reverse();
          setMessages(reversed);
          AsyncStorage.setItem('msgs_' + g, JSON.stringify(reversed.slice(0, PAGE_LIMIT)));
          setHasMore(more);
          console.log(`🌐 Loaded ${serverMsgs.length} messages from server`);
        } else {
          setHistoryError('No history found on server');
          setHasMore(false);
        }
      } catch (e: any) {
        console.warn('❌ History fetch failed:', e.message);
        setHistoryError(e.message);
        setHasMore(false);
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, []);

  // ── Load older messages ───────────────────────────────────────
  const loadMoreMessages = useCallback(async () => {
    if (isFetchingRef.current || !hasMore || loadingHistory) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const newLimit = limitRef.current + PAGE_LIMIT;
      console.log(`📜 Fetching history with limit=${newLimit}`);
      const { messages: allMsgs, hasMore: more } =
        await fetchHistory(userIdRef.current, genderRef.current, newLimit);

      if (allMsgs.length > limitRef.current) {
        const reversed = [...allMsgs].reverse();
        setMessages(reversed);
        limitRef.current = newLimit;
        setHasMore(more);
        console.log(`✅ Now showing ${allMsgs.length} messages | hasMore=${more}`);
      } else {
        setHasMore(false);
        console.log('🏁 No more messages to load');
      }
    } catch (e: any) {
      console.warn('❌ Load more failed:', e.message);
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [hasMore, loadingHistory]);

  const save = (msgs: Message[], g: Gender) => {
    AsyncStorage.setItem('msgs_' + g, JSON.stringify(msgs.slice(0, PAGE_LIMIT)));
  };

  // ── Send message ──────────────────────────────────────────────
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || typing) return;
    if (!appReady || !userIdRef.current) {
      console.warn('⚠️ App not ready yet — user_id is empty!');
      return;
    }

    const userMsg: Message = { id: `${Date.now()}_u`, text, sender: 'user' };
    const next = [userMsg, ...messages];
    setMessages(next);
    save(next, genderRef.current);
    setInput('');
    setTyping(true);

    // ── Trigger interstitial every MSG_AD_INTERVAL messages ─────
    msgsSinceAdRef.current += 1;
    console.log(`📨 Messages since last ad: ${msgsSinceAdRef.current}/${MSG_AD_INTERVAL}`);
    if (msgsSinceAdRef.current >= MSG_AD_INTERVAL) {
      msgsSinceAdRef.current = 0;
      console.log('🎬 Triggering interstitial ad!');
      showAdThen();
    }

    try {
      const requestBody = {
        user_id: userIdRef.current,
        gender:  genderRef.current,
        message: text,
      };
      console.log('📤 Request body:', JSON.stringify(requestBody));

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', res.status);

      if (!res.ok) {
        const errText = await res.text();
        console.error('❌ Server error response:', errText);
        throw new Error(`Server returned ${res.status}: ${errText}`);
      }

      const data = await res.json();
      console.log('✅ Response data:', JSON.stringify(data).slice(0, 200));

      const botMsg: Message = {
        id:     `${Date.now()}_b`,
        text:   data?.reply ?? data?.response ?? '...',
        sender: 'bot',
      };
      const next2 = [botMsg, ...next];
      setMessages(next2);
      save(next2, genderRef.current);
    } catch (error: any) {
      console.error('❌ Send failed:', error.message);
      const err: Message = {
        id:     `${Date.now()}_e`,
        text:   `Error: ${error.message}`,
        sender: 'bot',
      };
      setMessages(prev => [err, ...prev]);
    } finally {
      setTyping(false);
    }
  }, [input, typing, messages, showAdThen, appReady]);

  // ── Switch AI ─────────────────────────────────────────────────
  const switchAI = useCallback(() => {
    setProfileOpen(false);
    showAdThen(async () => {
      await AsyncStorage.removeItem('gender');
      router.replace('./gender');
    });
  }, [showAdThen, router]);

  // ── List footer ───────────────────────────────────────────────
  const ListFooterComponent = () => {
    if (loadingMore) {
      return (
        <View style={s.loadMoreContainer}>
          <ActivityIndicator color={ai.color} size="small" />
          <Text style={s.loadMoreText}>Loading older messages...</Text>
        </View>
      );
    }
    if (!hasMore && messages.length > 0) {
      return (
        <View style={s.loadMoreContainer}>
          <Text style={s.endOfChatText}> Beginning of your conversation</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── TOP BAR ──────────────────────────────────────── */}
        <View style={s.topBar}>
          <TouchableOpacity
            onPress={() => setProfileOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            <Image source={ai.image} style={[s.dp, { borderColor: ai.color }]} />
            <View style={{ marginLeft: 10 }}>
              <Text style={s.aiName}>{ai.name}</Text>
              <Text style={{ color: typing ? ai.color : '#555', fontSize: 12 }}>
                {!appReady
                  ? 'loading...'
                  : loadingHistory
                  ? 'loading history...'
                  : typing
                  ? 'typing...'
                  : 'tap here for profile'}
              </Text>
            </View>
          </TouchableOpacity>

          {loadingHistory && (
            <ActivityIndicator color={ai.color} size="small" style={{ marginRight: 10 }} />
          )}

          <TouchableOpacity
            onPress={switchAI}
            style={[s.switchBtn, { borderColor: ai.color }]}
          >
            <Text style={{ color: ai.color, fontSize: 12, fontWeight: '600' }}>Switch AI</Text>
          </TouchableOpacity>
        </View>

        {/* ── MESSAGES ─────────────────────────────────────── */}
        <FlatList
          data={messages}
          keyExtractor={i => i.id}
          inverted
          contentContainerStyle={{ padding: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooterComponent />}
          ListHeaderComponent={typing ? <TypingDots color={ai.color} /> : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              {loadingHistory ? (
                <>
                  <ActivityIndicator color={ai.color} size="large" />
                  <Text style={{ color: '#444', marginTop: 12, fontSize: 15 }}>
                    Loading your chats...
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 40 }}>👋</Text>
                  <Text style={{ color: '#444', marginTop: 8, fontSize: 15 }}>
                    Say hi to {ai.name}!
                  </Text>
                  {historyError ? (
                    <Text style={{ color: '#333', marginTop: 6, fontSize: 12 }}>
                      (History: {historyError})
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={[s.row, item.sender === 'user' ? s.rowUser : s.rowBot]}>
              {item.sender === 'bot' && (
                <Image source={ai.image} style={s.msgDp} />
              )}
              <View style={[
                s.bubble,
                item.sender === 'user'
                  ? [s.userBubble, { backgroundColor: ai.color }]
                  : s.botBubble,
              ]}>
                <Text style={{ color: '#fff', fontSize: 15, lineHeight: 21 }}>
                  {item.text}
                </Text>
              </View>
            </View>
          )}
        />

        {/* ── BANNER AD ────────────────────────────────────── */}
        {bannerVisible && (
          <View style={s.bannerContainer}>
            <BannerAd
              unitId={BANNER_AD_UNIT_ID}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{ requestNonPersonalizedAdsOnly: true }}
              onAdLoaded={() => {
                console.log('✅ Banner ad LOADED');
                setBannerVisible(true);
              }}
              onAdFailedToLoad={(e) => {
                console.log('💥 Banner ad FAILED:', e.message);
                setBannerVisible(false);
              }}
            />
          </View>
        )}

        {/* ── INPUT BAR ─────────────────────────────────────── */}
        <View style={s.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={`Message ${ai.name}...`}
            placeholderTextColor="#444"
            style={s.input}
            returnKeyType="send"
            onSubmitEditing={send}
            editable={!typing && appReady}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: (typing || !appReady) ? ai.color + '55' : ai.color }]}
            onPress={send}
            disabled={typing || !appReady}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>➤</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* ── PROFILE MODAL ─────────────────────────────────────── */}
      <ProfileModal
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSwitch={switchAI}
        gender={gender}
      />
    </SafeAreaView>
  );
}

// ── STYLES ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#0f0f0f' },
  topBar:            {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  dp:                { width: 42, height: 42, borderRadius: 21, borderWidth: 2 },
  aiName:            { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn:         { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  row:               { flexDirection: 'row', marginVertical: 4, alignItems: 'flex-end' },
  rowUser:           { justifyContent: 'flex-end' },
  rowBot:            { justifyContent: 'flex-start' },
  msgDp:             { width: 26, height: 26, borderRadius: 13, marginRight: 6 },
  bubble:            { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, maxWidth: '75%' },
  userBubble:        { borderBottomRightRadius: 4 },
  botBubble:         { backgroundColor: '#2a2a2a', borderBottomLeftRadius: 4 },
  bannerContainer:   {
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  inputRow:          {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 10, borderTopWidth: 1, borderTopColor: '#1e1e1e',
  },
  input:             {
    flex: 1, backgroundColor: '#1e1e1e', color: '#fff',
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 120,
  },
  sendBtn:           {
    marginLeft: 8, width: 42, height: 42,
    borderRadius: 21, alignItems: 'center', justifyContent: 'center',
  },
  loadMoreContainer: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  loadMoreText:      { color: '#555', fontSize: 12 },
  endOfChatText:     { color: '#333', fontSize: 12 },
});

const p = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#0f0f0f' },
  header:        {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn:       { marginRight: 16 },
  backArrow:     { color: '#fff', fontSize: 22 },
  headerTitle:   { color: '#fff', fontSize: 18, fontWeight: '700' },
  dpSection:     { alignItems: 'center', paddingVertical: 32 },
  bigDp:         { width: 130, height: 130, borderRadius: 65, borderWidth: 3 },
  profileName:   { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 14 },
  onlineStatus:  { fontSize: 13, marginTop: 5 },
  section:       { marginHorizontal: 16, marginTop: 22 },
  sectionLabel:  { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  sectionBox:    { backgroundColor: '#1a1a1a', borderRadius: 14, overflow: 'hidden' },
  sectionValue:  { color: '#ccc', fontSize: 15, padding: 14 },
  infoRow:       { paddingHorizontal: 14, paddingVertical: 13 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  infoLabel:     { color: '#555', fontSize: 12, marginBottom: 3 },
  infoValue:     { color: '#fff', fontSize: 15 },
  switchBtn:     {
    marginHorizontal: 16, marginTop: 28,
    borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  switchText:    { fontSize: 15, fontWeight: '700' },
});