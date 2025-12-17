import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '@/lib/firebase';

type GameSummary = {
  id: string;
  score: number;
  accuracy: number;
  durationSec: number;
  endedAt?: Date;
  attempts: number;
};

type Stats = {
  highScore: number;
  gamesPlayed: number;
  totalScore: number;
  totalCorrect: number;
  totalAttempts: number;
  streak: number;
};

const PlaceholderAvatar = ({ name, color }: { name: string; color: string }) => {
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  return (
    <View style={[styles.avatar, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.avatarInitial, { color }]}>{initial}</Text>
    </View>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  pill,
  theme,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  pill?: string;
  theme: typeof Colors['light'];
}) => (
  <View style={[styles.statCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
    <View style={[styles.statIconWrap, { backgroundColor: theme.primaryMuted }]}>
      <MaterialCommunityIcons name={icon} size={20} color={theme.primary} />
    </View>
    <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    <View style={styles.statLabelRow}>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
      {pill ? <Text style={[styles.statPill, { color: '#12b76a' }]}>{pill}</Text> : null}
    </View>
  </View>
);

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<Stats>({
    highScore: 0,
    gamesPlayed: 0,
    totalScore: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    streak: 0,
  });
  const [recentGames, setRecentGames] = useState<GameSummary[]>([]);
  const [displayName, setDisplayName] = useState('Math Wizard');

  const accuracyPct = stats.totalAttempts === 0 ? 0 : Math.round((stats.totalCorrect / stats.totalAttempts) * 100);
  const avgScore = stats.gamesPlayed === 0 ? 0 : Math.round(stats.totalScore / stats.gamesPlayed);
  const avgDuration = useMemo(() => {
    if (recentGames.length === 0) return 0;
    const total = recentGames.reduce((acc, g) => acc + g.durationSec, 0);
    return total / recentGames.length;
  }, [recentGames]);

  const trendPoints = useMemo(() => {
    if (recentGames.length === 0) return [70, 72, 75, 78, 80, 83, 86];
    return recentGames
      .slice()
      .reverse()
      .map((g) => Math.max(0, Math.min(100, Math.round(g.accuracy))));
  }, [recentGames]);

  const fetchData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setDisplayName(user.displayName || 'Math Wizard');

    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<Stats> & Record<string, unknown>;
        setStats((prev) => ({
          ...prev,
          highScore: typeof data.highScore === 'number' ? data.highScore : prev.highScore,
          gamesPlayed: typeof data.gamesPlayed === 'number' ? data.gamesPlayed : prev.gamesPlayed,
          totalScore: typeof data.totalScore === 'number' ? data.totalScore : prev.totalScore,
          totalCorrect: typeof data.totalCorrect === 'number' ? data.totalCorrect : prev.totalCorrect,
          totalAttempts: typeof data.totalAttempts === 'number' ? data.totalAttempts : prev.totalAttempts,
          streak: typeof data.streak === 'number' ? data.streak : prev.streak,
        }));
      }

      const gamesRef = collection(db, 'users', user.uid, 'games');
      const q = query(gamesRef, orderBy('createdAt', 'desc'), limit(7));
      const snapGames = await getDocs(q);
      const list: GameSummary[] = [];
      snapGames.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          score: typeof d.score === 'number' ? d.score : 0,
          accuracy: typeof d.accuracy === 'number' ? d.accuracy : 0,
          durationSec: typeof d.durationSec === 'number' ? d.durationSec : 60,
          endedAt: d.endedAt?.toDate?.() ?? d.createdAt?.toDate?.(),
          attempts: typeof d.attempts === 'number' ? d.attempts : 0,
        });
      });
      setRecentGames(list);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
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
          <View style={styles.userRow}>
            <PlaceholderAvatar name={displayName} color={theme.primary} />
            <View>
              <Text style={[styles.greeting, { color: theme.textMuted }]}>Welcome back,</Text>
              <Text style={[styles.username, { color: theme.text }]}>{displayName}</Text>
            </View>
          </View>
          <Pressable style={[styles.iconCircle, { borderColor: theme.border }]}>
            <Ionicons name="settings-outline" size={20} color={theme.text} />
          </Pressable>
        </View>

        <View style={[styles.highCard, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}>
          <View style={styles.highCardTop}>
            <View style={[styles.badge, { backgroundColor: '#2f7dff' }]}>
              <Ionicons name="trophy" size={18} color="#ffffff" />
            </View>
            <Pressable style={[styles.leaderBtn, { backgroundColor: '#2f7dff' }]}>
              <Text style={styles.leaderText}>View Leaderboard</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </Pressable>
          </View>
          <Text style={styles.highLabel}>All-Time High Score</Text>
          <Text style={styles.highValue}>{stats.highScore.toLocaleString()}</Text>
        </View>

        <View style={styles.gridRow}>
          <StatCard icon="poll" label="Avg. Score" value={avgScore.toLocaleString()} pill="+5%" theme={theme} />
          <StatCard icon="controller-classic-outline" label="Total Games" value={stats.gamesPlayed.toString()} pill="+2" theme={theme} />
        </View>
        <View style={styles.gridRow}>
          <StatCard
            icon="timer-outline"
            label="Avg. Time"
            value={avgDuration ? `${avgDuration.toFixed(1)}s` : '--'}
            pill="+0"
            theme={theme}
          />
          <StatCard icon="fire" label="Streak" value={`${Math.max(stats.streak, 0)} Days`} pill="+1" theme={theme} />
        </View>

        <View style={[styles.chartCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={[styles.chartTitle, { color: theme.text }]}>Accuracy Trend</Text>
              <View style={styles.chartSubRow}>
                <Text style={[styles.chartValue, { color: theme.text }]}>{accuracyPct}%</Text>
                <Text style={styles.chartDelta}>+4%</Text>
              </View>
            </View>
            <View style={[styles.badgeSoft, { backgroundColor: theme.primaryMuted }]}>
              <Text style={[styles.badgeSoftText, { color: theme.primary }]}>Last 7 Games</Text>
            </View>
          </View>
          <View style={styles.chartBody}>
            {trendPoints.map((point, idx) => {
              const x = (idx / Math.max(trendPoints.length - 1, 1)) * 100;
              const y = Math.max(5, Math.min(95, point));
              return (
                <View key={idx} style={[styles.chartDotWrap, { left: `${x}%` }]}>
                  <View style={[styles.chartDot, { bottom: `${y}%`, backgroundColor: theme.primary }]} />
                  {idx > 0 && (
                    <View
                      style={[
                        styles.chartLine,
                        {
                          backgroundColor: theme.primary,
                          width: `${100 / Math.max(trendPoints.length - 1, 1)}%`,
                          left: '-50%',
                          bottom: `${y - 50}%`,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
            <View style={[styles.chartGradient, { backgroundColor: theme.primaryMuted }]} />
          </View>
        </View>

        <View style={styles.recentHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Games</Text>
        </View>
        <View style={styles.recentList}>
          {recentGames.length === 0 ? (
            <Text style={{ color: theme.textMuted }}>No games yet. Play a round to see history.</Text>
          ) : (
            recentGames.map((g) => {
              const dateLabel = g.endedAt
                ? g.endedAt.toLocaleString(undefined, {
                    weekday: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : '—';
              return (
                <View key={g.id} style={[styles.recentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.recentIconWrap}>
                    <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recentTitle, { color: theme.text }]}>Score: {g.score}</Text>
                    <Text style={[styles.recentSubtitle, { color: theme.textMuted }]}>{dateLabel}</Text>
                    <Text style={[styles.recentSubtitle, { color: theme.textMuted }]}>
                      Duration: {Math.round(g.durationSec / 60)} min • Accuracy: {Math.round(g.accuracy)}%
                    </Text>
                  </View>
                  <View style={styles.recentRight}>
                    <Text style={[styles.recentScore, { color: theme.text }]}>Acc: {Math.round(g.accuracy)}%</Text>
                    <Text style={[styles.recentScore, { color: theme.text }]}>Q: {g.attempts}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  greeting: {
    fontSize: 13,
  },
  username: {
    fontSize: 18,
    fontWeight: '800',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highCard: {
    borderRadius: 20,
    padding: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  highCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  leaderText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  highLabel: {
    color: '#dbe7ff',
    marginTop: 10,
    fontSize: 14,
  },
  highValue: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '900',
    marginTop: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
  },
  statPill: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: 18,
    padding: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  chartSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  chartDelta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  badgeSoft: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeSoftText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartBody: {
    marginTop: 12,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  chartDotWrap: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: '100%',
  },
  chartDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    left: -5,
  },
  chartLine: {
    position: 'absolute',
    height: 2,
  },
  chartGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: '40%',
    opacity: 0.25,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  recentList: {
    gap: 10,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  recentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e9f5ec',
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  recentSubtitle: {
    fontSize: 13,
  },
  recentScore: {
    fontSize: 15,
    fontWeight: '800',
  },
  recentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
});
