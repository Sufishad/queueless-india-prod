import React from 'react';
import { Tabs } from 'expo-router';
import { Compass, Ticket, Bookmark } from 'lucide-react-native';
import { useLanguageStore } from '../../src/store/useLanguageStore';
import { translations } from '../../src/i18n/translations';

export default function CustomerTabsLayout() {
  const { currentLanguage } = useLanguageStore();
  const t = translations[currentLanguage].customer;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#334155',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#22C55E',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans-SemiBold',
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.tabs.explore,
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="my-queue"
        options={{
          title: t.tabs.myQueues,
          tabBarIcon: ({ color, size }) => <Ticket color={color} size={size || 22} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t.tabs.saved,
          tabBarIcon: ({ color, size }) => <Bookmark color={color} size={size || 22} />,
        }}
      />
    </Tabs>
  );
}
