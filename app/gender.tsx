// app/gender.tsx
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function GenderScreen() {
  const router = useRouter();

  const select = async (gender: 'male' | 'female') => {
    await AsyncStorage.setItem('gender', gender);
    router.replace('/');
  };

  return (
    <SafeAreaView style={s.safe}>

      {/* HEADER */}
      <Text style={s.title}>Who's your{'\n'}AI companion?</Text>
      <Text style={s.sub}>Tap to start chatting</Text>

      {/* TWO CARDS SIDE BY SIDE */}
      <View style={s.row}>

        {/* MAYA — Male */}
        <TouchableOpacity style={[s.card, { borderColor: '#7b2ff7' }]} onPress={() => select('male')} activeOpacity={0.85}>
          <View style={[s.glow, { backgroundColor: '#7b2ff7' }]} />
          <Image
            source={require('../assets/images/GD2FB.jpg')}
            style={[s.avatar, { borderColor: '#7b2ff7' }]}
          />
          <Text style={[s.aiName, { color: '#7b2ff7' }]}>Maya</Text>
          <Text style={s.forText}>For Male</Text>
          <View style={[s.pill, { backgroundColor: '#7b2ff7' }]}>
            <Text style={s.pillText}>Chat ➤</Text>
          </View>
        </TouchableOpacity>

        {/* YASH — Female */}
        <TouchableOpacity style={[s.card, { borderColor: '#e91e8c' }]} onPress={() => select('female')} activeOpacity={0.85}>
          <View style={[s.glow, { backgroundColor: '#e91e8c' }]} />
          <Image
            source={require('../assets/images/yash.jpeg')}
            style={[s.avatar, { borderColor: '#e91e8c' }]}
          />
          <Text style={[s.aiName, { color: '#e91e8c' }]}>Yash</Text>
          <Text style={s.forText}>For Female</Text>
          <View style={[s.pill, { backgroundColor: '#e91e8c' }]}>
            <Text style={s.pillText}>Chat ➤</Text>
          </View>
        </TouchableOpacity>

      </View>

      <Text style={s.footer}>You can switch anytime inside the chat</Text>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', paddingHorizontal: 20 },
  title:   { color: '#fff', fontSize: 32, fontWeight: '800', textAlign: 'center', lineHeight: 40, marginBottom: 8 },
  sub:     { color: '#444', fontSize: 14, textAlign: 'center', marginBottom: 36 },
  row:     { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  card:    { width: CARD_WIDTH, backgroundColor: '#141414', borderWidth: 1.5, borderRadius: 24, padding: 20, alignItems: 'center', overflow: 'hidden', gap: 10 },
  glow:    { position: 'absolute', width: 100, height: 100, borderRadius: 50, top: -30, right: -20, opacity: 0.15 },
  avatar:  { width: CARD_WIDTH - 40, height: CARD_WIDTH - 40, borderRadius: (CARD_WIDTH - 40) / 2, borderWidth: 2.5 },
  aiName:  { fontSize: 22, fontWeight: '800', marginTop: 4 },
  forText: { color: '#555', fontSize: 12 },
  pill:    { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginTop: 4 },
  pillText:{ color: '#fff', fontSize: 13, fontWeight: '700' },
  footer:  { color: '#2a2a2a', textAlign: 'center', fontSize: 12, marginTop: 32 },
});