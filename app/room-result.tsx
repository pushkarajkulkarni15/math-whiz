import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '@/lib/firebase';

type PlayerResult = {
  uid: string;
  displayName: string;
  score: number;
  accuracy: number;
  attempts: number;
};

type RankedPlayer = PlayerResult & { rank: number; isWinner: boolean; isTopAccuracy: boolean; isMe: boolean };

const normalizeCode = (value: string) => value.trim().toUpperCase();

const computeRanks = (players: PlayerResult[], myUid?: string | null): RankedPlayer[] => {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return a.displayName.localeCompare(b.displayName);
  });

  const topAccuracy = sorted.reduce((max, p) => Math.max(max, p.accuracy), 0);

  let lastScore: number | null = null;
  let lastAcc: number | null = null;
  let currentRank = 0;
  return sorted.map((p, index) => {
    if (lastScore === p.score && lastAcc === p.accuracy) {
      // same rank
    } else {
      currentRank = index + 1;
      lastScore = p.score;
      lastAcc = p.accuracy;
    }
    return {
      ...p,
      rank: currentRank,
      isWinner: currentRank === 1,
      isTopAccuracy: p.accuracy === topAccuracy,
      isMe: !!myUid && p.uid === myUid,
    };
  });
};

export default function RoomResultScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code?: string }>();

  const roomCode = useMemo(() => normalizeCode(code ?? ''), [code]);
  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [endedReason, setEndedReason] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    const roomRef = doc(db, 'rooms', roomCode);
    const unsubRoom = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as any;
        setEndedReason(typeof data.endedReason === 'string' ? data.endedReason : null);
      },
      (err) => console.error('Room meta snapshot error', err)
    );
    const playersRef = collection(db, 'rooms', roomCode, 'players');
    const q = query(playersRef, orderBy('joinedAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PlayerResult[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({
            uid: data.uid ?? d.id,
            displayName: data.displayName ?? 'Player',
            score: typeof data.score === 'number' ? data.score : 0,
            accuracy: typeof data.accuracy === 'number' ? data.accuracy : 0,
            attempts: typeof data.attempts === 'number' ? data.attempts : 0,
          });
        });
        setPlayers(list);
      },
      (err) => console.error('Room results snapshot error', err)
    );
    return () => {
      unsubRoom();
      unsub();
    };
  }, [roomCode]);

  const ranked = useMemo(() => computeRanks(players, auth.currentUser?.uid), [players]);
  const winner = ranked.find((p) => p.rank === 1) ?? null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
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
          <Pressable onPress={() => router.replace('/(tabs)/home')} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Match Results</Text>
            <Text style={[styles.headerSubtitle, { color: theme.primary }]}>Room {roomCode}</Text>
          </View>
          <Pressable onPress={() => {}} style={styles.headerIcon}>
            <Ionicons name="share-social-outline" size={22} color={theme.text} />
          </Pressable>
        </View>

        {winner ? (
          <View style={styles.winnerBlock}>
            <View style={[styles.winnerRingOuter, { borderColor: '#f59e0b' }]}>
              <View style={[styles.winnerRingInner, { borderColor: theme.primaryMuted, backgroundColor: theme.card }]}>
                <Text style={[styles.winnerInitial, { color: theme.primary }]}>
                  {(winner.displayName || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.trophyTop}>
                <Ionicons name="trophy" size={20} color="#f59e0b" />
              </View>
            </View>
            <View style={[styles.winnerBadge, { backgroundColor: '#fbbf24' }]}>
              <Text style={styles.winnerBadgeText}>Winner</Text>
            </View>
            <Text style={[styles.winnerName, { color: theme.text }]}>{winner.displayName}</Text>
            <View style={styles.winnerScoreRow}>
              <Text style={[styles.winnerScore, { color: theme.primary }]}>{winner.score.toLocaleString()}</Text>
              <Text style={[styles.winnerPts, { color: theme.textMuted }]}>PTS</Text>
            </View>
          </View>
        ) : (
          <View style={styles.winnerBlock}>
            <Text style={[styles.loadingText, { color: theme.textMuted }]}>Waiting for results…</Text>
          </View>
        )}

        {endedReason === 'host_left' ? (
          <View style={[styles.noticeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.textMuted} />
            <Text style={[styles.noticeText, { color: theme.textMuted }]}>
              Host left the room. Match ended early.
            </Text>
          </View>
        ) : null}

        <View style={styles.leaderHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Leaderboard</Text>
          <View style={styles.accuracyHint}>
            <Ionicons name="information-circle-outline" size={18} color={theme.icon} />
            <Text style={[styles.hintText, { color: theme.textMuted }]}>Accuracy breaks ties</Text>
          </View>
        </View>

        <View style={styles.list}>
          {ranked.map((p) => {
            const highlight = p.isMe ? theme.primaryMuted : theme.card;
            const borderColor = p.isMe ? theme.primary : theme.border;
            return (
              <View
                key={p.uid}
                style={[
                  styles.rowCard,
                  {
                    backgroundColor: highlight,
                    borderColor,
                    shadowColor: theme.shadow,
                  },
                ]}>
                <Text style={[styles.rank, { color: p.isWinner ? '#f59e0b' : theme.textMuted }]}>
                  {p.rank}
                </Text>

                <View style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>
                    {(p.displayName || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.playerName, { color: theme.text }]} numberOfLines={1}>
                    {p.displayName}
                    {p.isMe ? ' (You)' : ''}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.accBadge, { backgroundColor: theme.primaryMuted }]}>
                      <Ionicons name="checkmark-circle" size={14} color={theme.primary} />
                      <Text style={[styles.accText, { color: theme.textMuted }]}>{Math.round(p.accuracy)}%</Text>
                    </View>
                    {p.isWinner ? (
                      <View style={[styles.iconBadge, { backgroundColor: '#fff7ed' }]}>
                        <Ionicons name="trophy" size={14} color="#f59e0b" />
                      </View>
                    ) : null}
                    {p.isTopAccuracy ? (
                      <View style={[styles.iconBadge, { backgroundColor: '#e9fbef' }]}>
                        <Ionicons name="flash" size={14} color="#16a34a" />
                      </View>
                    ) : null}
                  </View>
                </View>

                <Text style={[styles.score, { color: theme.primary }]}>{p.score.toLocaleString()}</Text>
              </View>
            );
          })}
        </View>

        {winner ? (
          <View style={[styles.footerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.footerTitle, { color: theme.textMuted }]}>Congratulate the winner!</Text>
            <Text style={[styles.footerMsg, { color: theme.text }]}>
              Outstanding performance, {winner.displayName}!
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => router.replace('/(tabs)/home')}
          style={[styles.homeBtn, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}>
          <Text style={styles.homeBtnText}>Go to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  headerSubtitle: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  winnerBlock: { alignItems: 'center', gap: 10, paddingTop: 6 },
  winnerRingOuter: { width: 120, height: 120, borderRadius: 60, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  winnerRingInner: { width: 104, height: 104, borderRadius: 52, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  winnerInitial: { fontSize: 38, fontWeight: '900' },
  trophyTop: { position: 'absolute', top: -18, alignSelf: 'center' },
  winnerBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999 },
  winnerBadgeText: { color: '#111827', fontSize: 14, fontWeight: '900' },
  winnerName: { fontSize: 26, fontWeight: '900' },
  winnerScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  winnerScore: { fontSize: 42, fontWeight: '900' },
  winnerPts: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  loadingText: { fontSize: 16, fontWeight: '800', paddingVertical: 40 },
  leaderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  noticeText: { fontSize: 14, fontWeight: '700', flex: 1 },
  sectionTitle: { fontSize: 20, fontWeight: '900' },
  accuracyHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintText: { fontSize: 14, fontWeight: '700' },
  list: { gap: 12 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  rank: { width: 22, textAlign: 'center', fontSize: 18, fontWeight: '900' },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900' },
  playerName: { fontSize: 16, fontWeight: '900' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  accBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  accText: { fontSize: 13, fontWeight: '800' },
  iconBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  score: { fontSize: 18, fontWeight: '900' },
  footerCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 6, marginTop: 6 },
  footerTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  footerMsg: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  homeBtn: {
    marginTop: 6,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  homeBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
});
