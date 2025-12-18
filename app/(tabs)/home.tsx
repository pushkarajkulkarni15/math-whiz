import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '@/lib/firebase';

type ModeOption = {
  id: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const MODE_OPTIONS: ModeOption[] = [
  { id: 'blitz', title: 'Blitz Mode', subtitle: '1 minute of classic frenzy', durationLabel: '1 min', icon: 'flash-outline' },
  { id: 'standard', title: 'Standard', subtitle: '2 minutes of classic timing', durationLabel: '2 min', icon: 'clock-outline' },
  { id: 'marathon', title: 'Marathon', subtitle: '3 minutes of classic timing', durationLabel: '3 min', icon: 'run' },
];

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedMode, setSelectedMode] = useState<ModeOption['id']>('blitz');
  const insets = useSafeAreaInsets();
  const [userName, setUserName] = useState('Math Whiz');
  const [highScore, setHighScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || 'Math Whiz');
      fetchStats(user.uid);
    } else {
      setUserName('Math Whiz');
      setHighScore(0);
      setGamesPlayed(0);
    }
  }, []);

  const fetchStats = async (uid: string) => {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setHighScore(typeof data.highScore === 'number' ? data.highScore : 0);
        setGamesPlayed(typeof data.gamesPlayed === 'number' ? data.gamesPlayed : 0);
      } else {
        setHighScore(0);
        setGamesPlayed(0);
      }
    } catch (err) {
      console.error('Failed to load home stats', err);
      setHighScore(0);
      setGamesPlayed(0);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 8, Platform.select({ ios: 16, android: 18, default: 18 })),
            paddingBottom: Math.max(insets.bottom + 24, 32),
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.avatarRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>
              <Text style={[styles.avatarInitial, { color: theme.primary }]}>
                {userName.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={[styles.greeting, { color: theme.textMuted }]}>{greeting}</Text>
              <Text style={[styles.username, { color: theme.text }]}>{userName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}>
            <Text style={[styles.statLabel, styles.statLabelLight]}>Highest Score</Text>
            <Text style={[styles.statValue, styles.statValueLight]}>{highScore.toLocaleString()}</Text>
            <Text style={[styles.statSubLabel, styles.statLabelLight]}>All Time</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Games</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{gamesPlayed}</Text>
            <Text style={[styles.statSubLabel, { color: theme.textMuted }]}>Total Played</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Duration</Text>
          </View>

          {MODE_OPTIONS.map((mode) => {
            const isActive = selectedMode === mode.id;
            const duration = mode.id === 'blitz' ? 60 : mode.id === 'standard' ? 120 : 180;
            return (
              <Pressable
                key={mode.id}
                onPress={() => {
                  setSelectedMode(mode.id);
                  router.push({ pathname: '/game', params: { duration: String(duration) } });
                }}
                style={[
                  styles.modeTile,
                  {
                    borderColor: isActive ? theme.primary : theme.border,
                    backgroundColor: isActive ? theme.primaryMuted : theme.inputBackground,
                    shadowColor: theme.shadow,
                  },
                ]}>
                <View
                  style={[
                    styles.modeIconWrap,
                    { backgroundColor: isActive ? theme.primary : theme.card },
                  ]}>
                  <MaterialCommunityIcons
                    name={mode.icon}
                    size={24}
                    color={isActive ? '#ffffff' : theme.primary}
                  />
                </View>
                <View style={styles.modeTextWrap}>
                  <Text style={[styles.modeTitle, { color: theme.text }]}>{mode.title}</Text>
                  <Text style={[styles.modeSubtitle, { color: theme.textMuted }]}>{mode.subtitle}</Text>
                </View>
                <View style={[styles.modeDuration, { backgroundColor: isActive ? theme.primary : theme.card }]}>
                  <Text style={[styles.modeDurationText, { color: isActive ? '#ffffff' : theme.text }]}>
                    {mode.durationLabel}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.friendsButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/friends')}>
          <View style={styles.friendsContent}>
            <View style={[styles.friendsIconWrap, { backgroundColor: theme.card }]}>
              <Ionicons name="people-outline" size={22} color={theme.primary} />
            </View>
            <View style={styles.friendsTextWrap}>
              <Text style={[styles.friendsTitle, { color: '#ffffff' }]}>Play with Friends</Text>
              <Text style={[styles.friendsSubtitle, { color: '#e0e7ff' }]}>Challenge your buddies</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ffffff" />
        </Pressable>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 14,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabelLight: {
    color: '#e6ecff',
  },
  statValue: {
    marginTop: 6,
    fontSize: 26,
    fontWeight: '800',
  },
  statValueLight: {
    color: '#ffffff',
  },
  statSubLabel: {
    marginTop: 4,
    fontSize: 13,
  },
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  modeTile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  modeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modeSubtitle: {
    fontSize: 14,
    marginTop: 3,
  },
  modeDuration: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  modeDurationText: {
    fontSize: 15,
    fontWeight: '800',
  },
  friendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 5,
  },
  friendsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  friendsIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsTextWrap: {},
  friendsTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  friendsSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  bottomSpacer: {
    height: 8,
  },
});
