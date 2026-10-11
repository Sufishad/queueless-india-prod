import React from 'react';
import { Tabs } from 'expo-router';
import { View, Platform, StyleSheet } from 'react-native';
import {
  SlidersHorizontal,
  Users,
  QrCode,
  Tag,
  BarChart3,
} from 'lucide-react-native';

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans-Medium',
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Console',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeTabIconWrapper : undefined}>
              <SlidersHorizontal size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Live Queue',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeTabIconWrapper : undefined}>
              <Users size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: 'Standee QR',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeTabIconWrapper : undefined}>
              <QrCode size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Services',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeTabIconWrapper : undefined}>
              <Tag size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeTabIconWrapper : undefined}>
              <BarChart3 size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          href: null, // Hide from bottom tab bar
        }}
      />
      <Tabs.Screen
        name="onboarding"
        options={{
          href: null, // Hide from bottom tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeTabIconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
});
