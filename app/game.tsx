import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '@/lib/firebase';

type Question = { prompt: string; answer: number };

const operations = [
  'add',
  'sub',
  'mul',
  'div',
  'lcm',
  'hcf',
  'hpf',
  'square',
  'cube',
] as const;
type Operation = (typeof operations)[number];

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const randInt = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number): number => Math.abs((a * b) / gcd(a, b));
const highestPrimeFactor = (n: number): number => {
  let num = n;
  let maxPrime = -1;
  while (num % 2 === 0) {
    maxPrime = 2;
    num /= 2;
  }
  for (let i = 3; i * i <= num; i += 2) {
    while (num % i === 0) {
      maxPrime = i;
      num /= i;
    }
  }
  if (num > 2) maxPrime = num;
  return maxPrime;
};

const generateQuestion = (rng: () => number): Question => {
  const op = operations[randInt(rng, 0, operations.length - 1)];
  switch (op) {
    case 'add': {
      const a = randInt(rng, 25, 150);
      const b = randInt(rng, 15, 120);
      return { prompt: `${a} + ${b}`, answer: a + b };
    }
    case 'sub': {
      const a = randInt(rng, 80, 180);
      const b = randInt(rng, 20, 90);
      const bigger = Math.max(a, b);
      const smaller = Math.min(a, b);
      return { prompt: `${bigger} - ${smaller}`, answer: bigger - smaller };
    }
    case 'mul': {
      const a = randInt(rng, 7, 15);
      const b = randInt(rng, 6, 14);
      return { prompt: `${a} × ${b}`, answer: a * b };
    }
    case 'div': {
      const divisor = randInt(rng, 3, 12);
      const quotient = randInt(rng, 4, 16);
      const dividend = divisor * quotient;
      return { prompt: `${dividend} ÷ ${divisor}`, answer: quotient };
    }
    case 'lcm': {
      const a = randInt(rng, 4, 12);
      const b = randInt(rng, 5, 14);
      return { prompt: `LCM(${a}, ${b})`, answer: lcm(a, b) };
    }
    case 'hcf': {
      const base = randInt(rng, 2, 12);
      const a = base * randInt(rng, 4, 12);
      const b = base * randInt(rng, 3, 11);
      return { prompt: `HCF(${a}, ${b})`, answer: gcd(a, b) };
    }
    case 'hpf': {
      const num = randInt(rng, 60, 220);
      return { prompt: `Highest prime factor of ${num}`, answer: highestPrimeFactor(num) };
    }
    case 'square': {
      const isRoot = rng() < 0.5;
      if (isRoot) {
        const n = randInt(rng, 6, 15);
        return { prompt: `√${n * n}`, answer: n };
      }
      const n = randInt(rng, 9, 18);
      return { prompt: `${n}²`, answer: n * n };
    }
    case 'cube': {
      const isRoot = rng() < 0.4;
      if (isRoot) {
        const n = randInt(rng, 2, 6);
        return { prompt: `∛${n * n * n}`, answer: n };
      }
      const n = randInt(rng, 3, 8);
      return { prompt: `${n}³`, answer: n * n * n };
    }
    default:
      return { prompt: '12 + 8', answer: 20 };
  }
};

const keypad = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['C', '0', '⌫'],
] as const;

export default function GameScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { duration, seed, room } = useLocalSearchParams<{
    duration?: string;
    seed?: string;
    room?: string;
  }>();

  const totalTime = useMemo(() => {
    const parsed = duration ? parseInt(duration, 10) : 60;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
  }, [duration]);

  const seedNumber = useMemo(() => {
    if (!seed) return null;
    const parsed = parseInt(seed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }, [seed]);

  const rng = useMemo(() => (seedNumber ? mulberry32(seedNumber) : Math.random), [seedNumber]);
  const roomCode = useMemo(() => (room ? String(room).trim().toUpperCase() : null), [room]);

  const [question, setQuestion] = useState<Question>(() => generateQuestion(rng));
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [endTimeMs, setEndTimeMs] = useState<number | null>(null);
  const [isWrong, setIsWrong] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const finishedRef = useRef(false);
  const [roomHostUid, setRoomHostUid] = useState<string | null>(null);

  // Initialize end time for solo play; for rooms it will be set from Firestore snapshot.
  useEffect(() => {
    if (roomCode) return;
    setEndTimeMs(Date.now() + totalTime * 1000);
  }, [roomCode, totalTime]);

  // Drive timer from a shared end timestamp to keep all players in sync.
  useEffect(() => {
    if (!endTimeMs) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const remainingMs = endTimeMs - Date.now();
      const next = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimeLeft(next);
      if (remainingMs <= 0) {
        finishGame();
      }
    }, 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTimeMs]);

  useEffect(() => {
    if (!roomCode) return;
    const roomRef = doc(db, 'rooms', roomCode);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as any;
        setRoomHostUid(typeof data.hostUid === 'string' ? data.hostUid : null);

        // Align end time for all players using the host's startedAt timestamp.
        const startTs = data.startedAt?.toMillis?.();
        const durationDoc = typeof data.durationSec === 'number' ? data.durationSec : totalTime;
        if (startTs) {
          const candidateEnd = startTs + durationDoc * 1000;
          if (!endTimeMs || Math.abs(candidateEnd - endTimeMs) > 1000) {
            setEndTimeMs(candidateEnd);
          }
          startedAtRef.current = startTs;
        } else if (data.status === 'in_progress' && !endTimeMs) {
          // Fallback if startedAt is missing: start now to avoid desync.
          const nowEnd = Date.now() + durationDoc * 1000;
          setEndTimeMs(nowEnd);
          startedAtRef.current = Date.now();
        }

        if (data.status === 'ended' && !finishedRef.current) {
          finishGame();
        }
      },
      (err) => console.error('Room watch error', err)
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, endTimeMs, totalTime]);

  useEffect(() => {
    if (timeLeft === 0) {
      finishGame();
    }
  }, [timeLeft]);

  const finishGame = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const accuracy = attempts === 0 ? 0 : Math.round((solved / attempts) * 100);
    const durationToSave = endTimeMs
      ? Math.max(1, Math.round((endTimeMs - startedAtRef.current) / 1000))
      : totalTime;
    let bestScore = Math.max(score, 0);
    let prevLastScore = 0;

    const user = auth.currentUser;
    if (user) {
      try {
        const uid = user.uid;
        const gameRef = doc(collection(db, 'users', uid, 'games'));
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        const prevHigh =
          userSnap.exists() && typeof userSnap.data().highScore === 'number'
            ? userSnap.data().highScore
            : 0;
        prevLastScore =
          userSnap.exists() && typeof userSnap.data().lastScore === 'number'
            ? userSnap.data().lastScore
            : 0;
        bestScore = Math.max(prevHigh, score);

        await setDoc(
          gameRef,
          {
            score,
            correct: solved,
            attempts,
            accuracy,
            durationSec: durationToSave,
            startedAt: new Date(startedAtRef.current),
            endedAt: new Date(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await setDoc(
          userRef,
          {
            email: user.email ?? '',
            displayName: user.displayName ?? '',
            highScore: bestScore,
            lastScore: score,
            lastAccuracy: accuracy,
            groupGames: userSnap.exists() && typeof userSnap.data().groupGames === 'number' ? userSnap.data().groupGames : 0,
            soloGames: userSnap.exists() && typeof userSnap.data().soloGames === 'number' ? userSnap.data().soloGames : 0,
            createdAt: userSnap.exists()
              ? userSnap.data().createdAt ?? serverTimestamp()
              : serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await updateDoc(userRef, {
          totalScore: increment(score),
          totalCorrect: increment(solved),
          totalAttempts: increment(attempts),
          gamesPlayed: increment(1),
          groupGames: increment(roomCode ? 1 : 0),
          soloGames: increment(roomCode ? 0 : 1),
          highScore: bestScore,
          lastScore: score,
          lastAccuracy: accuracy,
        }).catch(async () => {
          await setDoc(
            userRef,
            {
              totalScore: score,
              totalCorrect: solved,
              totalAttempts: attempts,
              gamesPlayed: 1,
              groupGames: roomCode ? 1 : 0,
              soloGames: roomCode ? 0 : 1,
              highScore: bestScore,
              lastScore: score,
              lastAccuracy: accuracy,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        });

        if (roomCode) {
          await runTransaction(db, async (tx) => {
            const roomRef = doc(db, 'rooms', roomCode);
            const roomSnap = await tx.get(roomRef);
            if (!roomSnap.exists()) return;
            const roomData = roomSnap.data() as any;

            const playerRef = doc(db, 'rooms', roomCode, 'players', uid);
            const playerSnap = await tx.get(playerRef);
            const alreadyFinished = playerSnap.exists() && !!(playerSnap.data() as any).finishedAt;

            tx.set(
              playerRef,
              {
                uid,
                displayName: user.displayName ?? 'Math Wizard',
                score,
                attempts,
                correct: solved,
                accuracy,
                finishedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            if (roomData.status !== 'in_progress') return;
            if (roomData.endedReason) return;
            if (alreadyFinished) return;

            const playerCount = typeof roomData.playerCount === 'number' ? roomData.playerCount : null;
            if (!playerCount) return;

            const finishedCount = typeof roomData.finishedCount === 'number' ? roomData.finishedCount : 0;
            const nextFinished = finishedCount + 1;

            const updates: Record<string, unknown> = {
              finishedCount: nextFinished,
              updatedAt: serverTimestamp(),
            };

            if (nextFinished >= playerCount) {
              updates.status = 'ended';
              updates.endedReason = 'all_finished';
              updates.endedAt = serverTimestamp();
            }

            tx.update(roomRef, updates);
          });
        }
      } catch (err) {
        console.error('Failed to persist game', err);
      }
    }

    if (roomCode) {
      router.replace({ pathname: '/room-result', params: { code: roomCode } });
      return;
    }

    router.replace({
      pathname: '/result',
      params: {
        score: String(score),
        accuracy: String(accuracy),
        solved: String(solved),
        best: String(bestScore),
        delta: String(score - prevLastScore),
      },
    });
  };

  const handleExit = () => {
    if (!roomCode) {
      router.replace('/(tabs)/home');
      return;
    }
    const user = auth.currentUser;
    const isHost = !!user && !!roomHostUid && user.uid === roomHostUid;
    Alert.alert(
      isHost ? 'End match for everyone?' : 'Leave match?',
      isHost
        ? 'If you leave, the match will end for all players.'
        : 'If you leave, your current score will be submitted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isHost ? 'End Match' : 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isHost) {
                await updateDoc(doc(db, 'rooms', roomCode), {
                  status: 'ended',
                  endedReason: 'host_left',
                  endedAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  locked: true,
                });
              }
            } catch (err) {
              console.error('End room failed', err);
            } finally {
              finishGame();
            }
          },
        },
      ]
    );
  };

  const handleKeyPress = (key: string) => {
    if (key === 'C') {
      setInput('');
      return;
    }
    if (key === '⌫') {
      setInput((prev) => prev.slice(0, -1));
      return;
    }
    if (input.length >= 8) return;
    setInput((prev) => (prev === '0' ? key : prev + key));
  };

  const handleSubmit = () => {
    if (!input) return;
    const userAnswer = parseInt(input, 10);
    const isCorrect = userAnswer === question.answer;
    setAttempts((a) => a + 1);
    if (isCorrect) {
      const gain = 10;
      setSolved((c) => c + 1);
      setScore((s) => s + gain);
      setQuestion(generateQuestion(rng));
      setInput('');
    } else {
      setIsWrong(true);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start(() => setIsWrong(false));
      setInput('');
    }
  };

  const effectiveDuration = useMemo(() => {
    if (endTimeMs) {
      const dur = Math.round((endTimeMs - startedAtRef.current) / 1000);
      if (dur > 0) return dur;
    }
    return totalTime;
  }, [endTimeMs, totalTime]);

  const progress = Math.min(1, Math.max(0, 1 - timeLeft / effectiveDuration));
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 8, 16),
            paddingBottom: Math.max(insets.bottom + 10, 16),
            backgroundColor: theme.background,
          },
        ]}>
        <View style={styles.topRow}>
          <Pressable style={styles.iconButton} onPress={handleExit}>
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.topMetrics}>
            <View style={[styles.metricPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="trophy-outline" size={18} color={theme.primary} />
              <Text style={[styles.metricText, { color: theme.text }]}>{score}</Text>
            </View>
            <View style={[styles.metricPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="help-circle-outline" size={18} color={theme.icon} />
              <Text style={[styles.metricText, { color: theme.text }]}>{solved}</Text>
            </View>
          </View>
        </View>

        <View style={styles.timeRow}>
          <Text style={[styles.timeLabel, { color: theme.textMuted }]}>TIME REMAINING</Text>
          <Text style={[styles.timeValue, { color: theme.primary }]}>{timeLabel}</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.inputBackground }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.primary }]} />
        </View>

        <View style={styles.questionBlock}>
          <Text style={[styles.questionText, { color: theme.text }]}>{question.prompt}</Text>
          <Text style={[styles.questionSubtitle, { color: theme.textMuted }]}>Solve the equation</Text>
          <Animated.View
            style={[
              styles.answerBox,
              {
                borderColor: isWrong ? '#ef4444' : theme.primary,
                backgroundColor: isWrong ? 'rgba(239,68,68,0.08)' : theme.inputBackground,
                transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) }],
              },
            ]}>
            <Text style={[styles.answerText, { color: theme.text }]}>{input || ' '}</Text>
          </Animated.View>
        </View>

        <View style={[styles.keypadCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <View style={styles.keypadGrid}>
            {keypad.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keypadRow}>
                {row.map((key) => {
                  const isClear = key === 'C';
                  const isDelete = key === '⌫';
                  const isAction = isClear || isDelete;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => handleKeyPress(key)}
                      style={[
                        styles.keypadKey,
                        {
                          backgroundColor: isClear
                            ? 'rgba(239,68,68,0.12)'
                            : isAction
                              ? theme.inputBackground
                              : theme.inputBackground,
                          borderColor: theme.border,
                        },
                      ]}>
                      {isDelete ? (
                        <MaterialCommunityIcons name="backspace-outline" size={20} color={theme.text} />
                      ) : (
                        <Text
                          style={[
                            styles.keypadText,
                            { color: isClear ? '#ef4444' : theme.text },
                          ]}>
                          {key}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <Pressable onPress={handleSubmit} style={[styles.submitButton, { backgroundColor: theme.primary }]}>
            <Text style={styles.submitText}>Submit Answer</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
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
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMetrics: {
    flexDirection: 'row',
    gap: 10,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  metricText: {
    fontSize: 16,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 12,
    backgroundColor: '#dfe3f0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
  },
  questionBlock: {
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  questionText: {
    fontSize: 38,
    fontWeight: '800',
  },
  questionSubtitle: {
    fontSize: 16,
  },
  answerBox: {
    marginTop: 4,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderRadius: 16,
    minWidth: '70%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerText: {
    fontSize: 28,
    fontWeight: '800',
  },
  keypadCard: {
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#f6f8fc',
    shadowColor: 'rgba(15,23,42,0.08)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 6,
  },
  keypadGrid: {
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 10,
  },
  keypadKey: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  keypadText: {
    fontSize: 18,
    fontWeight: '800',
  },
  submitButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: 'rgba(15,23,42,0.16)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 5,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
});
