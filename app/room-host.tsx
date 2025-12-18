import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '@/lib/firebase';

type RoomStatus = 'lobby' | 'in_progress' | 'ended';

type RoomDoc = {
  code: string;
  hostUid: string;
  status: RoomStatus;
  locked: boolean;
  maxPlayers: number;
  durationSec: number;
  seed: number | null;
};

type PlayerDoc = {
  uid: string;
  displayName: string;
  isHost?: boolean;
};

const DURATION_OPTIONS = [
  { id: 'blitz', labelTop: '1 Min', labelBottom: 'BLITZ', durationSec: 60, icon: 'timer-outline' as const },
  { id: 'standard', labelTop: '2 Min', labelBottom: 'CLASSIC', durationSec: 120, icon: 'timer-sand' as const },
  { id: 'marathon', labelTop: '3 Min', labelBottom: 'LONG', durationSec: 180, icon: 'run' as const },
] as const;

const normalizeCode = (code: string) => code.trim().toUpperCase();

export default function RoomHostScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = normalizeCode(params.code ?? '');

  const [room, setRoom] = useState<RoomDoc | null>(null);
  const [players, setPlayers] = useState<PlayerDoc[]>([]);
  const [starting, setStarting] = useState(false);
  const codeInputRef = useRef<TextInput>(null);

  const me = auth.currentUser;
  const isHost = me?.uid && room?.hostUid ? me.uid === room.hostUid : true;

  useEffect(() => {
    if (!code) return;

    const roomRef = doc(db, 'rooms', code);
    const unsubRoom = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as RoomDoc;
        setRoom({
          code: data.code,
          hostUid: data.hostUid,
          status: data.status,
          locked: !!data.locked,
          maxPlayers: typeof data.maxPlayers === 'number' ? data.maxPlayers : 8,
          durationSec: typeof data.durationSec === 'number' ? data.durationSec : 60,
          seed: typeof data.seed === 'number' ? data.seed : null,
        });
      },
      (err) => console.error('Room snapshot error', err)
    );

    const playersRef = collection(db, 'rooms', code, 'players');
    const q = query(playersRef, orderBy('joinedAt', 'asc'));
    const unsubPlayers = onSnapshot(
      q,
      (snap) => {
        const list: PlayerDoc[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            uid: data.uid ?? d.id,
            displayName: data.displayName ?? 'Player',
            isHost: !!data.isHost,
          });
        });
        setPlayers(list);
      },
      (err) => console.error('Players snapshot error', err)
    );

    return () => {
      unsubRoom();
      unsubPlayers();
    };
  }, [code]);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'in_progress' && room.seed && room.durationSec) {
      router.replace({
        pathname: '/game',
        params: {
          duration: String(room.durationSec),
          seed: String(room.seed),
          room: room.code,
        },
      });
    }
    if (room.status === 'ended') {
      router.replace({ pathname: '/room-result', params: { code: room.code } });
    }
  }, [room, router]);

  const selectedId = useMemo(() => {
    const found = DURATION_OPTIONS.find((d) => d.durationSec === (room?.durationSec ?? 60));
    return found?.id ?? 'blitz';
  }, [room?.durationSec]);

  const setDuration = async (durationSec: number) => {
    if (!code || !room || room.status !== 'lobby') return;
    try {
      await updateDoc(doc(db, 'rooms', code), { durationSec, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error('Set duration failed', err);
      Alert.alert('Error', 'Could not update duration. Please try again.');
    }
  };

  const handleCopy = () => {
    codeInputRef.current?.focus();
    Alert.alert('Room code ready', 'Long-press the code to copy.');
  };

  const handleStart = async () => {
    if (!code || !room) return;
    if (!isHost) return;
    if (room.status !== 'lobby' || room.locked) return;
    if (players.length < 2) {
      Alert.alert('Need at least 2 players', 'Ask a friend to join before starting.');
      return;
    }

    setStarting(true);
    try {
      const seed = Math.floor(Math.random() * 2_000_000_000) + 1;
      await updateDoc(doc(db, 'rooms', code), {
        status: 'in_progress',
        locked: true,
        seed,
        playerCount: players.length,
        finishedCount: 0,
        endedReason: null,
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Start game failed', err);
      Alert.alert('Error', 'Could not start game. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleLeaveAsHost = async () => {
    if (!code || !room) {
      router.replace('/(tabs)/home');
      return;
    }
    Alert.alert('Leave room?', 'If you leave, the room will close for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'rooms', code), {
              status: 'ended',
              endedReason: 'host_left',
              endedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              locked: true,
            });
          } catch (err) {
            console.error('Host leave failed', err);
          } finally {
            router.replace({ pathname: '/room-result', params: { code } });
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.bgTop, { backgroundColor: `${theme.primary}22` }]} />
      <View style={[styles.bgBottom, { backgroundColor: 'rgba(18,183,106,0.10)' }]} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 8, 16),
            paddingBottom: Math.max(insets.bottom + 24, 32),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (isHost) {
                handleLeaveAsHost();
              } else {
                router.replace('/(tabs)/home');
              }
            }}
            style={[styles.iconCircle, { backgroundColor: theme.card }]}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <Text style={[styles.topTitle, { color: theme.text }]}>Game Room</Text>
          <Pressable style={[styles.iconCircle, { backgroundColor: theme.card }]}>
            <Ionicons name="share-social-outline" size={20} color={theme.text} />
          </Pressable>
        </View>

        <View style={[styles.codeCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <Text style={[styles.codeLabel, { color: theme.textMuted }]}>ROOM CODE</Text>
          <TextInput
            ref={codeInputRef}
            value={code}
            editable={false}
            selectTextOnFocus
            style={[styles.codeValue, { color: theme.text }]}
          />
          <Text style={[styles.codeHint, { color: theme.textMuted }]}>Share this code with friends to join</Text>
          <Pressable
            onPress={handleCopy}
            style={[styles.copyBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Ionicons name="copy-outline" size={18} color={theme.primary} />
            <Text style={[styles.copyText, { color: theme.primary }]}>Copy Code</Text>
          </Pressable>
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Duration</Text>
          <View style={[styles.pill, { backgroundColor: theme.primaryMuted }]}>
            <Text style={[styles.pillText, { color: theme.primary }]}>Host Settings</Text>
          </View>
        </View>

        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((opt) => {
            const selected = selectedId === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setDuration(opt.durationSec)}
                style={[
                  styles.durationCard,
                  {
                    backgroundColor: selected ? theme.primary : theme.card,
                    borderColor: theme.border,
                    shadowColor: theme.shadow,
                  },
                ]}>
                <View style={[styles.durationIcon, { backgroundColor: selected ? 'rgba(255,255,255,0.18)' : theme.primaryMuted }]}>
                  <MaterialCommunityIcons name={opt.icon} size={22} color={selected ? '#ffffff' : theme.primary} />
                </View>
                <Text style={[styles.durationTop, { color: selected ? '#ffffff' : theme.text }]}>{opt.labelTop}</Text>
                <Text style={[styles.durationBottom, { color: selected ? '#dbe7ff' : theme.textMuted }]}>{opt.labelBottom}</Text>
                {selected ? (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Players</Text>
          <View style={[styles.waitPill, { backgroundColor: 'rgba(18,183,106,0.16)' }]}>
            <View style={styles.waitDot} />
            <Text style={[styles.waitText, { color: '#0f7a41' }]}>{room?.status === 'lobby' ? 'Waiting...' : 'In Game'}</Text>
          </View>
        </View>

        <View style={styles.playerList}>
          {players.map((p) => {
            const isMe = me?.uid === p.uid;
            const initial = (p.displayName || '?').charAt(0).toUpperCase();
            return (
              <View key={p.uid} style={[styles.playerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.playerAvatar, { backgroundColor: theme.primaryMuted }]}>
                  <Text style={[styles.playerInitial, { color: theme.primary }]}>{initial}</Text>
                  {p.isHost ? (
                    <View style={[styles.hostBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.hostText}>HOST</Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.playerName, { color: theme.text }]}>
                    {p.displayName} {isMe ? '(You)' : ''}
                  </Text>
                  <Text style={[styles.playerSub, { color: theme.textMuted }]}>{p.isHost ? 'Ready to start' : 'Joined'}</Text>
                </View>
                <View style={[styles.playerCheck, { backgroundColor: theme.primaryMuted }]}>
                  <Ionicons name="checkmark" size={18} color={theme.primary} />
                </View>
              </View>
            );
          })}

          <View style={[styles.playerPlaceholder, { backgroundColor: `${theme.primaryMuted}88` }]}>
            <View style={[styles.playerPlaceholderIcon, { backgroundColor: theme.primaryMuted }]}>
              <Ionicons name="person-add-outline" size={20} color={theme.icon} />
            </View>
            <Text style={[styles.playerPlaceholderText, { color: theme.textMuted }]}>Waiting for players...</Text>
          </View>
        </View>

        <Pressable
          onPress={handleStart}
          disabled={!isHost || starting || (room?.status !== 'lobby') || players.length < 2}
          style={[
            styles.startBtn,
            {
              backgroundColor: theme.primary,
              opacity: !isHost || starting || (room?.status !== 'lobby') || players.length < 2 ? 0.7 : 1,
              shadowColor: theme.shadow,
            },
          ]}>
          <Ionicons name="play" size={18} color="#ffffff" />
          <Text style={styles.startText}>{starting ? 'Starting...' : 'Start Game'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bgTop: { position: 'absolute', left: 0, right: 0, top: 0, height: 260 },
  bgBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 320 },
  content: { paddingHorizontal: 20, gap: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  topTitle: { fontSize: 18, fontWeight: '900' },
  codeCard: {
    borderRadius: 18,
    padding: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 5,
    alignItems: 'center',
    gap: 10,
  },
  codeLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
  codeValue: {
    width: '100%',
    textAlign: 'center',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 8,
    paddingVertical: 6,
  },
  codeHint: { fontSize: 14, textAlign: 'center' },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    width: '100%',
    marginTop: 6,
  },
  copyText: { fontSize: 16, fontWeight: '800' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  pillText: { fontSize: 13, fontWeight: '800' },
  durationRow: { flexDirection: 'row', gap: 12 },
  durationCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
    position: 'relative',
  },
  durationIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  durationTop: { fontSize: 18, fontWeight: '900' },
  durationBottom: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  checkBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  waitPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  waitDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  waitText: { fontSize: 13, fontWeight: '800' },
  playerList: { gap: 10 },
  playerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 12 },
  playerAvatar: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  playerInitial: { fontSize: 20, fontWeight: '900' },
  hostBadge: { position: 'absolute', bottom: -6, left: -2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  hostText: { color: '#ffffff', fontSize: 11, fontWeight: '900' },
  playerName: { fontSize: 16, fontWeight: '900' },
  playerSub: { fontSize: 13, marginTop: 2 },
  playerCheck: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  playerPlaceholder: { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerPlaceholderIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  playerPlaceholderText: { fontSize: 15, fontWeight: '700' },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    marginTop: 10,
  },
  startText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
