import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowRight,
  Clock,
  Globe,
  Sparkles,
  Zap,
  ShieldCheck,
} from 'lucide-react-native';
import { useLanguageStore } from '../src/store/useLanguageStore';
import { useRoleStore } from '../src/store/useRoleStore';
import { LanguageModal } from '../src/components/LanguageModal';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { t, language } = useLanguageStore();
  const { role, activeTokenId } = useRoleStore();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/role-select');
  };

  const currentLangLabel = {
    hi: 'हिन्दी',
    hinglish: 'Hinglish',
    en: 'English',
  }[language];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar with Language Selector */}
      <View style={styles.topBar}>
        <View style={styles.indiaFlagPill}>
          <Text style={styles.indiaFlagText}>🇮🇳 Made for Bharat</Text>
        </View>

        <TouchableOpacity
          style={styles.langButton}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.8}
        >
          <Globe size={16} color="#94A3B8" />
          <Text style={styles.langButtonText}>{currentLangLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Hero & Brand Section */}
      <View style={styles.content}>
        {/* Digital Queue Token Graphic */}
        <View style={styles.badgeContainer}>
          <View style={styles.glowRing} />
          <View style={styles.digitalTokenCard}>
            <View style={styles.tokenCardHeader}>
              <View style={styles.liveIndicatorDot} />
              <Text style={styles.liveText}>LIVE QUEUE</Text>
            </View>
            <Text style={styles.tokenNumber}>#01</Text>
            <Text style={styles.tokenStatusText}>NOW SERVING</Text>
          </View>
        </View>

        {/* Title & Tagline */}
        <View style={styles.textBlock}>
          <Text style={styles.appName}>{t.common.appName}</Text>
          <View style={styles.taglineBox}>
            <Sparkles size={18} color="#F59E0B" />
            <Text style={styles.taglineText}>"{t.common.tagline}"</Text>
          </View>
          <Text style={styles.subTaglineText}>{t.common.subTagline}</Text>
        </View>

        {/* Value Proposition Pills */}
        <View style={styles.featuresRow}>
          <View style={styles.featurePill}>
            <Zap size={14} color="#38BDF8" />
            <Text style={styles.featurePillText}>No OTP</Text>
          </View>
          <View style={styles.featurePill}>
            <Clock size={14} color="#34D399" />
            <Text style={styles.featurePillText}>Live Updates</Text>
          </View>
          <View style={styles.featurePill}>
            <ShieldCheck size={14} color="#A78BFA" />
            <Text style={styles.featurePillText}>100% Free</Text>
          </View>
        </View>
      </View>

      {/* Bottom Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{t.common.continue}</Text>
          <View style={styles.buttonIconCircle}>
            <ArrowRight size={20} color="#0F172A" />
          </View>
        </TouchableOpacity>
      </View>

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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  indiaFlagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  indiaFlagText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  langButton: {
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
  langButtonText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  digitalTokenCard: {
    width: 140,
    height: 140,
    borderRadius: 28,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  tokenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  tokenNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: -1,
    lineHeight: 56,
  },
  tokenStatusText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'SpaceGrotesk-Medium',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 28,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  taglineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  taglineText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  subTaglineText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  featurePillText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  footer: {
    paddingBottom: Platform.OS === 'ios' ? 12 : 20,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  buttonIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
