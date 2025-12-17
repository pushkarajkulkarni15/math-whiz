import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const StatCard = ({
  label,
  value,
  icon,
  accent,
  theme,
}: {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent?: string;
  theme: typeof Colors['light'];
}) => (
  <View style={[styles.statCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <View style={[styles.statIconWrap, { backgroundColor: accent ?? theme.primaryMuted }]}>
      <MaterialCommunityIcons name={icon} size={22} color={accent ? '#eab308' : theme.primary} />
    </View>
    <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
  </View>
);

export default function ResultScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { score, accuracy, solved, best, delta } = useLocalSearchParams<{
    score?: string;
    accuracy?: string;
    solved?: string;
    best?: string;
    delta?: string;
  }>();

  const totalScore = score ? parseInt(score, 10) : 1240;
  const bestScore = best ? parseInt(best, 10) : Math.max(totalScore, 1500);
  const accuracyValue = accuracy ? parseInt(accuracy, 10) : 92;
  const solvedValue = solved ? parseInt(solved, 10) : 45;
  const deltaValue = delta ? parseInt(delta, 10) : 120;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 8, 16),
            paddingBottom: Math.max(insets.bottom + 20, 30),
          },
        ]}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primaryMuted }]}>
            <MaterialCommunityIcons name="timer-off-outline" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Time&apos;s Up!</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Great mental workout.</Text>
        </View>

        <View style={[styles.scoreCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <Text style={[styles.scoreLabel, { color: theme.textMuted }]}>TOTAL SCORE</Text>
          <Text style={[styles.scoreValue, { color: theme.primary }]}>{totalScore.toLocaleString()}</Text>
          <View style={styles.deltaPill}>
            <Ionicons name="trending-up-outline" size={16} color="#16a34a" />
            <Text style={styles.deltaText}>{deltaValue >= 0 ? `+${deltaValue}` : deltaValue} vs last game</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="ACCURACY" value={`${accuracyValue}%`} icon="progress-check" theme={theme} />
          <StatCard label="SOLVED" value={`${solvedValue}`} icon="check-circle-outline" theme={theme} />
          <StatCard label="BEST" value={bestScore.toLocaleString()} icon="trophy-outline" accent="#fff4d6" theme={theme} />
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}
            onPress={() => router.replace('/game')}>
            <Ionicons name="refresh" size={18} color="#ffffff" />
            <Text style={styles.primaryText}>Play Again</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={() => router.replace('/(tabs)/home')}>
            <Text style={[styles.secondaryText, { color: theme.text }]}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
  },
  scoreCard: {
    width: '100%',
    borderRadius: 30,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  scoreLabel: {
    fontSize: 14,
    letterSpacing: 1,
    color: '#6b7280',
  },
  scoreValue: {
    fontSize: 46,
    fontWeight: '900',
    color: '#1e6dff',
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#e9fbef',
  },
  deltaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginTop: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 5,
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
});
