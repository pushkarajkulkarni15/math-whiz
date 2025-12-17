import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: theme.icon,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 12,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
          marginTop: 4,
        },
        tabBarIcon: ({ color, focused }) => {
          const iconName =
            route.name === 'home'
              ? 'house.fill'
              : route.name === 'dashboard'
                ? 'chart.bar.fill'
                : 'person.crop.circle';
          return (
            <View
              style={[
                styles.tabIconWrap,
                {
                  backgroundColor: focused ? theme.primaryDark : 'transparent',
                },
              ]}>
              <IconSymbol size={24} name={iconName as any} color={color} />
            </View>
          );
        },
      })}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
