import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  auth,
  db,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  signOut,
} from '@/lib/firebase';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState('Math Wizard');
  const [email, setEmail] = useState('');
  const [highScore, setHighScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setDisplayName(user.displayName || 'Math Wizard');
      setNameInput(user.displayName || 'Math Wizard');
      setEmail(user.email || '');
      loadStats(user.uid);
    }
  }, []);

  const loadStats = async (uid: string) => {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setHighScore(typeof data.highScore === 'number' ? data.highScore : 0);
        setGamesPlayed(typeof data.gamesPlayed === 'number' ? data.gamesPlayed : 0);
        const totalAttempts = typeof data.totalAttempts === 'number' ? data.totalAttempts : 0;
        const totalCorrect = typeof data.totalCorrect === 'number' ? data.totalCorrect : 0;
        const acc = totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100);
        setAccuracy(acc);
      }
    } catch (err) {
      console.error('Failed to load profile stats', err);
    }
  };

  const handleSaveName = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!nameInput.trim()) {
      Alert.alert('Enter a name', 'Please enter a valid username.');
      return;
    }
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: nameInput.trim() });
      await setDoc(
        doc(db, 'users', user.uid),
        { displayName: nameInput.trim(), updatedAt: new Date() },
        { merge: true }
      );
      setDisplayName(nameInput.trim());
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update name', err);
      Alert.alert('Update failed', 'Could not update username. Try again.');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert('Fill all fields', 'Please enter all password fields.');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Passwords do not match', 'New password and confirm password must match.');
      return;
    }
    setSavingPwd(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPwd);
      Alert.alert('Password updated', 'Your password has been changed.');
      setShowPwdModal(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      console.error('Password change failed', err);
      Alert.alert('Password change failed', 'Check your current password and try again.');
    } finally {
      setSavingPwd(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (err) {
      console.error('Logout failed', err);
      Alert.alert('Logout failed', 'Please try again.');
    }
  };

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
          <Pressable onPress={() => router.canGoBack() && router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>My Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.avatarSection}>
          <View style={[styles.bigAvatar, { backgroundColor: theme.primaryMuted }]}>
            <MaterialCommunityIcons name="account" size={60} color={theme.primary} />
            <View style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="pencil" size={16} color="#ffffff" />
            </View>
          </View>
          <Text style={[styles.nameText, { color: theme.text }]}>{displayName}</Text>
          <Text style={[styles.subText, { color: theme.textMuted }]}>Level 1 • Calculator Rank</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statTile, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <Ionicons name="trophy" size={20} color={theme.primary} />
            <Text style={[styles.statTileValue, { color: theme.text }]}>{highScore.toLocaleString()}</Text>
            <Text style={[styles.statTileLabel, { color: theme.textMuted }]}>HIGH SCORE</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="controller-classic-outline" size={20} color={theme.primary} />
            <Text style={[styles.statTileValue, { color: theme.text }]}>{gamesPlayed}</Text>
            <Text style={[styles.statTileLabel, { color: theme.textMuted }]}>PLAYED</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
            <MaterialCommunityIcons name="check-decagram-outline" size={20} color={theme.primary} />
            <Text style={[styles.statTileValue, { color: theme.text }]}>{accuracy}%</Text>
            <Text style={[styles.statTileLabel, { color: theme.textMuted }]}>ACCURACY</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Details</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Username</Text>
            <View style={[styles.inputShell, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                value={nameInput}
                editable={isEditingName}
                onChangeText={setNameInput}
                placeholder="Username"
                placeholderTextColor={theme.textMuted}
              />
              <Pressable onPress={() => (isEditingName ? handleSaveName() : setIsEditingName(true))}>
                <Ionicons name={isEditingName ? 'checkmark' : 'pencil'} size={18} color={theme.primary} />
              </Pressable>
            </View>
            {isEditingName && (
              <Text style={[styles.helpText, { color: theme.textMuted }]}>
                {savingName ? 'Saving...' : 'Press check to save your username.'}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textMuted }]}>Email Address</Text>
            <View style={[styles.inputShell, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.textMuted }]}
                value={email}
                editable={false}
                placeholder="Email"
                placeholderTextColor={theme.textMuted}
              />
              <Ionicons name="lock-closed-outline" size={18} color={theme.icon} />
            </View>
          </View>

          <Pressable
            style={[styles.actionRow, { backgroundColor: theme.inputBackground }]}
            onPress={() => setShowPwdModal(true)}>
            <View style={[styles.actionIcon, { backgroundColor: theme.primaryMuted }]}>
              <MaterialCommunityIcons name="lock-reset" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.actionText, { color: theme.text }]}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.icon} />
          </Pressable>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showPwdModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Change Password</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
              Enter your current and new password.
            </Text>
            <View style={[styles.modalInput, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
              <TextInput
                secureTextEntry
                placeholder="Current password"
                placeholderTextColor={theme.textMuted}
                style={[styles.modalTextInput, { color: theme.text }]}
                value={currentPwd}
                onChangeText={setCurrentPwd}
              />
            </View>
            <View style={[styles.modalInput, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
              <TextInput
                secureTextEntry
                placeholder="New password"
                placeholderTextColor={theme.textMuted}
                style={[styles.modalTextInput, { color: theme.text }]}
                value={newPwd}
                onChangeText={setNewPwd}
              />
            </View>
            <View style={[styles.modalInput, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
              <TextInput
                secureTextEntry
                placeholder="Confirm new password"
                placeholderTextColor={theme.textMuted}
                style={[styles.modalTextInput, { color: theme.text }]}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: theme.inputBackground }]} onPress={() => setShowPwdModal(false)}>
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                onPress={handleChangePassword}
                disabled={savingPwd}>
                <Text style={[styles.modalBtnText, { color: '#ffffff' }]}>{savingPwd ? 'Saving...' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  avatarSection: {
    alignItems: 'center',
    gap: 6,
  },
  bigAvatar: {
    width: 110,
    height: 110,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
  },
  subText: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  statTileValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statTileLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  helpText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 14,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  modalTextInput: {
    height: 46,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
