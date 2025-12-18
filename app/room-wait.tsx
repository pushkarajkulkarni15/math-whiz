import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '@/lib/firebase';

const normalizeCode = (value: string) => value.trim().toUpperCase();

export default function RoomWaitScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code?: string }>();

  const roomCode = useMemo(() => normalizeCode(code ?? ''), [code]);
  const [status, setStatus] = useState<'lobby' | 'in_progress' | 'ended'>('lobby');
  const [durationSec, setDurationSec] = useState(60);
  const [seed, setSeed] = useState<number | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const roomRef = doc(db, 'rooms', roomCode);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          Alert.alert('Room ended', 'This room is no longer available.');
          router.replace('/(tabs)/home');
          return;
        }
        const data = snap.data() as any;
        setStatus(data.status ?? 'lobby');
        setDurationSec(typeof data.durationSec === 'number' ? data.durationSec : 60);
        setSeed(typeof data.seed === 'number' ? data.seed : null);
      },
      (err) => {
        console.error('Room wait snapshot error', err);
      }
    );
    return unsub;
  }, [roomCode, router]);

  useEffect(() => {
    if (status === 'in_progress' && seed) {
      router.replace({
        pathname: '/game',
        params: { duration: String(durationSec), seed: String(seed), room: roomCode },
      });
    }
    if (status === 'ended') {
      router.replace({ pathname: '/room-result', params: { code: roomCode } });
    }
  }, [durationSec, roomCode, router, seed, status]);

  const leaveRoom = async () => {
    const user = auth.currentUser;
    if (!user || !roomCode) {
      router.replace('/(tabs)/home');
      return;
    }
    try {
      await deleteDoc(doc(db, 'rooms', roomCode, 'players', user.uid));
      await updateDoc(doc(db, 'rooms', roomCode), { updatedAt: serverTimestamp() }).catch(() => null);
    } catch (err) {
      console.error('Leave room failed', err);
    } finally {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.backgroundGlyphs} pointerEvents="none">
        <Text style={[styles.glyph, styles.glyphPlus, { color: theme.primaryMuted }]}>+</Text>
        <Text style={[styles.glyph, styles.glyphPlus2, { color: theme.primaryMuted }]}>+</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 8, 16),
            paddingBottom: Math.max(insets.bottom + 24, 32),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={leaveRoom} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Lobby</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.center}>
          <View style={[styles.ringOuter, { borderColor: theme.primaryMuted }]}>
            <View style={[styles.ringInner, { borderColor: theme.primary }]}>
              <MaterialCommunityIcons name="timer-sand" size={30} color={theme.primary} />
            </View>
          </View>

          <Text style={[styles.bigTitle, { color: theme.text }]}>You&apos;re in!</Text>

          <View style={[styles.messageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.messageText, { color: theme.textMuted }]}>
              Waiting for host to start{'\n'}the game...
            </Text>
          </View>

          <Text style={[styles.currentLabel, { color: theme.textMuted }]}>CURRENT ROOM</Text>
          <View style={[styles.codePill, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.codeText, { color: theme.text }]}>{roomCode}</Text>
          </View>
        </View>

        <Pressable style={[styles.leaveBtn, { borderColor: theme.border, backgroundColor: theme.card }]} onPress={leaveRoom}>
          <Text style={[styles.leaveText, { color: theme.textMuted }]}>Leave Room</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backgroundGlyphs: { ...StyleSheet.absoluteFillObject },
  glyph: { fontSize: 200, fontWeight: '900', opacity: 0.08 },
  glyphPlus: { position: 'absolute', top: 140, left: 10, transform: [{ rotate: '-10deg' }] },
  glyphPlus2: { position: 'absolute', bottom: 160, right: 24, transform: [{ rotate: '18deg' }] },
  content: { flexGrow: 1, paddingHorizontal: 22, justifyContent: 'space-between' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 30, paddingBottom: 30 },
  ringOuter: { width: 110, height: 110, borderRadius: 55, borderWidth: 10, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 86, height: 86, borderRadius: 43, borderWidth: 8, alignItems: 'center', justifyContent: 'center' },
  bigTitle: { fontSize: 30, fontWeight: '900', marginTop: 4 },
  messageCard: { width: '100%', borderRadius: 16, borderWidth: 1, paddingVertical: 16, paddingHorizontal: 14, alignItems: 'center' },
  messageText: { fontSize: 16, textAlign: 'center', lineHeight: 22, fontWeight: '700' },
  currentLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: 10 },
  codePill: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  codeText: { fontSize: 22, fontWeight: '900', letterSpacing: 5 },
  leaveBtn: { borderWidth: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  leaveText: { fontSize: 16, fontWeight: '900' },
});
