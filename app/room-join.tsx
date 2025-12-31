import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc } from 'firebase/firestore';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '@/lib/firebase';

const normalizeCode = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);

export default function RoomJoinScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const boxes = useMemo(() => {
    const chars = code.split('');
    return new Array(6).fill('').map((_, i) => chars[i] ?? '');
  }, [code]);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const normalized = normalizeCode(text);
      if (normalized.length === 6) {
        setCode(normalized);
      } else {
        Alert.alert('Invalid code', 'Clipboard does not contain a valid 6-character code.');
      }
    } catch (err) {
      console.error('Paste failed', err);
      Alert.alert('Paste failed', 'Could not read your clipboard.');
    } finally {
      focusInput();
    }
  };

  const joinRoom = async () => {
    const roomCode = normalizeCode(code);
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Not signed in', 'Please log in again.');
      return;
    }
    if (roomCode.length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-character room code.');
      return;
    }

    setJoining(true);
    try {
      const roomRef = doc(db, 'rooms', roomCode);
      const roomSnap = await getDoc(roomRef);
      if (!roomSnap.exists()) {
        Alert.alert('Room not found', 'Check the code and try again.');
        return;
      }
      const room = roomSnap.data() as any;
      if (room.status !== 'lobby' || room.locked) {
        Alert.alert('Room locked', 'This game has already started.');
        return;
      }

      const maxPlayers = typeof room.maxPlayers === 'number' ? room.maxPlayers : 8;
      const playersRef = collection(db, 'rooms', roomCode, 'players');
      const playersSnap = await getDocs(query(playersRef, limit(maxPlayers + 1)));
      if (playersSnap.size >= maxPlayers) {
        Alert.alert('Room full', 'This room has reached the player limit.');
        return;
      }

      await setDoc(
        doc(db, 'rooms', roomCode, 'players', user.uid),
        {
          uid: user.uid,
          displayName: user.displayName ?? 'Math Wizard',
          joinedAt: serverTimestamp(),
          isHost: false,
          score: 0,
          attempts: 0,
          correct: 0,
          accuracy: 0,
        },
        { merge: true }
      );

      router.replace({ pathname: '/room-wait', params: { code: roomCode } });
    } catch (err) {
      console.error('Join room failed', err);
      Alert.alert('Error', 'Could not join the room. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.backgroundGlyphs} pointerEvents="none">
          <Text style={[styles.glyph, styles.glyphPlus, { color: theme.primaryMuted }]}>+</Text>
          <Text style={[styles.glyph, styles.glyphMultiply, { color: theme.primaryMuted }]}>×</Text>
        </View>

        <View style={[styles.content, { paddingTop: Math.max(insets.top + 8, 16) }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Join Game</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.center}>
            <Text style={[styles.title, { color: theme.text }]}>Enter Room Code</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Ask your friend for the 6-character game ID to{'\n'}start the battle.
            </Text>

            <Pressable onPress={focusInput} style={styles.codeRow}>
              {boxes.map((c, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.codeBox,
                    {
                      backgroundColor: theme.card,
                      borderColor: c ? theme.primary : theme.border,
                    },
                  ]}>
                  <Text style={[styles.codeChar, { color: theme.text }]}>{c || '–'}</Text>
                </View>
              ))}
            </Pressable>

            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(t) => setCode(normalizeCode(t))}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'visible-password'}
              textContentType="oneTimeCode"
              style={styles.hiddenInput}
              caretHidden
              selectTextOnFocus
              maxLength={6}
            />

            <Pressable onPress={handlePaste} style={[styles.pastePill, { backgroundColor: theme.primaryMuted }]}>
              <Ionicons name="clipboard-outline" size={18} color={theme.primary} />
              <Text style={[styles.pasteText, { color: theme.primary }]}>Paste Code</Text>
            </Pressable>

            <Pressable
              onPress={joinRoom}
              disabled={joining}
              style={[
                styles.joinBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: joining ? 0.8 : 1,
                  shadowColor: theme.shadow,
                },
              ]}>
              <Text style={styles.joinText}>{joining ? 'Joining...' : 'Join Room'}</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: theme.textMuted }]}>Don&apos;t have a code? </Text>
              <Pressable onPress={() => router.replace('/friends')}>
                <Text style={[styles.footerLink, { color: theme.primary }]}>Create a Room</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  backgroundGlyphs: { ...StyleSheet.absoluteFillObject },
  glyph: { fontSize: 160, fontWeight: '900', opacity: 0.10 },
  glyphPlus: { position: 'absolute', top: 120, left: 10, transform: [{ rotate: '-12deg' }] },
  glyphMultiply: { position: 'absolute', bottom: 140, right: 24, transform: [{ rotate: '12deg' }] },
  content: { flex: 1, paddingHorizontal: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 30, gap: 14 },
  title: { fontSize: 34, fontWeight: '900', textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 22, marginTop: 4 },
  codeRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  codeBox: {
    width: 50,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: { fontSize: 20, fontWeight: '900' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  pastePill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 6 },
  pasteText: { fontSize: 14, fontWeight: '800' },
  joinBtn: {
    width: '100%',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  joinText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  footerText: { fontSize: 14 },
  footerLink: { fontSize: 14, fontWeight: '900' },
});
