import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { auth, db } from '@/lib/firebase';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const generateRoomCode = () => {
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
};

export default function FriendsModal() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [creating, setCreating] = useState(false);

  const overlay = useMemo(
    () => ({
      backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(15,23,42,0.35)',
    }),
    [colorScheme]
  );

  const createRoom = async () => {
    if (creating) return;
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Not signed in', 'Please log in again.');
      return;
    }

    setCreating(true);
    try {
      let code = '';
      for (let attempt = 0; attempt < 8; attempt++) {
        code = generateRoomCode();
        const roomRef = doc(db, 'rooms', code);
        const roomSnap = await getDoc(roomRef);
        if (!roomSnap.exists()) {
          await setDoc(roomRef, {
            code,
            hostUid: user.uid,
            status: 'lobby',
            locked: false,
            maxPlayers: 8,
            durationSec: 60,
            seed: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          await setDoc(doc(db, 'rooms', code, 'players', user.uid), {
            uid: user.uid,
            displayName: user.displayName ?? 'Math Wizard',
            joinedAt: serverTimestamp(),
            isHost: true,
            score: 0,
            attempts: 0,
            correct: 0,
            accuracy: 0,
          });

          router.replace({ pathname: '/room-host', params: { code } });
          return;
        }
      }
      Alert.alert('Try again', 'Could not create a room. Please try again.');
    } catch (err) {
      console.error('Create room failed', err);
      Alert.alert('Error', 'Could not create a room. Check your connection and try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, overlay]} edges={['top', 'left', 'right']}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />
      <View style={[styles.sheet, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
        <View style={styles.sheetHeader}>
          <View style={[styles.iconBubble, { backgroundColor: theme.primaryMuted }]}>
            <Ionicons name="people" size={20} color={theme.primary} />
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={theme.icon} />
          </Pressable>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Play with Friends</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Challenge your friends to a speed math battle!{'\n'}Create a private room or join an existing one.
        </Text>

        <Pressable
          onPress={createRoom}
          disabled={creating}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: theme.primary,
              opacity: creating ? 0.85 : 1,
              shadowColor: theme.shadow,
            },
          ]}>
          <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
          <Text style={styles.primaryText}>{creating ? 'Creating...' : 'Create a room'}</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/room-join')}
          style={[styles.secondaryBtn, { borderColor: theme.border, backgroundColor: theme.card }]}>
          <Ionicons name="log-in-outline" size={20} color={theme.text} />
          <Text style={[styles.secondaryText, { color: theme.text }]}>Join a room</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 22,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  primaryBtn: {
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
    marginBottom: 12,
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
