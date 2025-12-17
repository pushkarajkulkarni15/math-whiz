import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

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

const generateQuestion = (): Question => {
  const op = operations[randInt(0, operations.length - 1)];
  switch (op) {
    case 'add': {
      const a = randInt(25, 150);
      const b = randInt(15, 120);
      return { prompt: `${a} + ${b}`, answer: a + b };
    }
    case 'sub': {
      const a = randInt(80, 180);
      const b = randInt(20, 90);
      const bigger = Math.max(a, b);
      const smaller = Math.min(a, b);
      return { prompt: `${bigger} - ${smaller}`, answer: bigger - smaller };
    }
    case 'mul': {
      const a = randInt(7, 15);
      const b = randInt(6, 14);
      return { prompt: `${a} × ${b}`, answer: a * b };
    }
    case 'div': {
      const divisor = randInt(3, 12);
      const quotient = randInt(4, 16);
      const dividend = divisor * quotient;
      return { prompt: `${dividend} ÷ ${divisor}`, answer: quotient };
    }
    case 'lcm': {
      const a = randInt(4, 12);
      const b = randInt(5, 14);
      return { prompt: `LCM(${a}, ${b})`, answer: lcm(a, b) };
    }
    case 'hcf': {
      const base = randInt(2, 12);
      const a = base * randInt(4, 12);
      const b = base * randInt(3, 11);
      return { prompt: `HCF(${a}, ${b})`, answer: gcd(a, b) };
    }
    case 'hpf': {
      const num = randInt(60, 220);
      return { prompt: `Highest prime factor of ${num}`, answer: highestPrimeFactor(num) };
    }
    case 'square': {
      const isRoot = Math.random() < 0.5;
      if (isRoot) {
        const n = randInt(6, 15);
        return { prompt: `√${n * n}`, answer: n };
      }
      const n = randInt(9, 18);
      return { prompt: `${n}²`, answer: n * n };
    }
    case 'cube': {
      const isRoot = Math.random() < 0.4;
      if (isRoot) {
        const n = randInt(2, 6);
        return { prompt: `∛${n * n * n}`, answer: n };
      }
      const n = randInt(3, 8);
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
  const { duration } = useLocalSearchParams<{ duration?: string }>();

  const totalTime = useMemo(() => {
    const parsed = duration ? parseInt(duration, 10) : 60;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
  }, [duration]);

  const [question, setQuestion] = useState<Question>(generateQuestion());
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const [isWrong, setIsWrong] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => Math.max(t - 1, 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      finishGame();
    }
  }, [timeLeft]);

  const finishGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const accuracy = attempts === 0 ? 0 : Math.round((solved / attempts) * 100);
    router.replace({
      pathname: '/result',
      params: {
        score: String(score),
        accuracy: String(accuracy),
        solved: String(solved),
        best: String(Math.max(score, 1500)),
        delta: String(score - 1120),
      },
    });
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
      setQuestion(generateQuestion());
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

  const progress = 1 - timeLeft / totalTime;
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
          <Pressable style={styles.iconButton} onPress={() => router.replace('/(tabs)/home')}>
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
