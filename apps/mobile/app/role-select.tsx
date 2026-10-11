import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  ChevronLeft,
  Globe,
  Store,
  User,
  Zap,
  Monitor,
} from 'lucide-react-native';
import { useLanguageStore } from '../src/store/useLanguageStore';
import { useRoleStore } from '../src/store/useRoleStore';
import { LanguageModal } from '../src/components/LanguageModal';

export default function RoleSelectScreen() {
  const router = useRouter();
  const { t, language } = useLanguageStore();
  const { setRole } = useRoleStore();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleSelectRole = (role: 'customer' | 'owner') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRole(role);
    if (role === 'customer') {
      // Sprint 3 will route to /(customer)/home
      router.push('/(customer)/home' as any);
    } else {
      // Sprint 4 will route to /(owner)/dashboard
      router.push('/(owner)/dashboard' as any);
    }
  };

  const currentLangLabel = {
    hi: 'हिन्दी',
    hinglish: 'Hinglish',
    en: 'English',
  }[language];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.langPill}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.8}
        >
          <Globe size={16} color="#94A3B8" />
          <Text style={styles.langText}>{currentLangLabel}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title and Instruction */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>{t.roles.selectRoleTitle}</Text>
          <Text style={styles.subTitle}>{t.roles.selectRoleSubtitle}</Text>
        </View>

        {/* Option 1: Customer Card */}
        <TouchableOpacity
          style={[styles.roleCard, styles.customerCard]}
          onPress={() => handleSelectRole('customer')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, styles.customerIconCircle]}>
              <User size={24} color="#3B82F6" />
            </View>
            <View style={styles.badgePill}>
              <Zap size={12} color="#10B981" />
              <Text style={styles.badgeText}>{t.roles.customerBadge}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>{t.roles.customerTitle}</Text>
          <Text style={styles.cardSubtitle}>{t.roles.customerSubtitle}</Text>

          <View style={styles.cardActionRow}>
            <Text style={styles.actionText}>{t.roles.customerAction}</Text>
            <View style={styles.actionCircle}>
              <ArrowRight size={16} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Option 2: Business Owner Card */}
        <TouchableOpacity
          style={[styles.roleCard, styles.ownerCard]}
          onPress={() => handleSelectRole('owner')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, styles.ownerIconCircle]}>
              <Store size={24} color="#8B5CF6" />
            </View>
            <View style={[styles.badgePill, styles.ownerBadgePill]}>
              <Monitor size={12} color="#8B5CF6" />
              <Text style={[styles.badgeText, styles.ownerBadgeText]}>
                {t.roles.ownerBadge}
              </Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>{t.roles.ownerTitle}</Text>
          <Text style={styles.cardSubtitle}>{t.roles.ownerSubtitle}</Text>

          <View style={styles.cardActionRow}>
            <Text style={[styles.actionText, styles.ownerActionText]}>
              {t.roles.ownerAction}
            </Text>
            <View style={[styles.actionCircle, styles.ownerActionCircle]}>
              <ArrowRight size={16} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Modal */}
      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#1E293B',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  langText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 32,
    gap: 20,
  },
  titleSection: {
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    lineHeight: 34,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 20,
  },
  roleCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
  },
  customerCard: {
    backgroundColor: '#1E293B',
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  ownerCard: {
    backgroundColor: '#1E293B',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerIconCircle: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  ownerIconCircle: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  ownerBadgePill: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  badgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  ownerBadgeText: {
    color: '#A78BFA',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 20,
    marginBottom: 20,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#38BDF8',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  ownerActionText: {
    color: '#A78BFA',
  },
  actionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerActionCircle: {
    backgroundColor: '#8B5CF6',
  },
});
