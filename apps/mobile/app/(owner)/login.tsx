import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Store,
  Phone,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react-native';
import { useOwnerStore } from '../../src/store/useOwnerStore';
import { ownerLogin, ownerSignup, fetchBusinesses } from '../../src/api/client';

export default function OwnerLoginScreen() {
  const router = useRouter();
  const { setAuth } = useOwnerStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const indianMobileRegex = /^[6-9]\d{9}$/;

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!indianMobileRegex.test(mobile)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setErrorMsg('Please enter your full name or merchant title');
      return;
    }

    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      let authRes;
      if (mode === 'signup') {
        authRes = await ownerSignup({
          name: name.trim(),
          mobile: mobile.trim(),
          password,
        });
      } else {
        authRes = await ownerLogin({
          mobile: mobile.trim(),
          password,
        });
      }

      setAuth(authRes.access_token, authRes.owner, authRes.owner.businessId);

      if (authRes.owner.businessId) {
        router.replace('/(owner)/dashboard' as any);
      } else {
        router.replace('/(owner)/onboarding' as any);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMerchant = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      // Try logging in with demo account or create demo
      const demoMobile = '9876543210';
      const demoPass = 'Owner@123456';
      
      try {
        const auth = await ownerLogin({ mobile: demoMobile, password: demoPass });
        setAuth(auth.access_token, auth.owner, auth.owner.businessId);
        if (auth.owner.businessId) {
          router.replace('/(owner)/dashboard' as any);
          return;
        }
      } catch {
        // If demo user does not exist yet, sign them up
        const auth = await ownerSignup({
          name: 'Dr. Ramesh Sharma',
          mobile: demoMobile,
          password: demoPass,
        });
        // Check if there are businesses to connect
        const bizList = await fetchBusinesses().catch(() => []);
        const firstBiz = bizList[0];
        setAuth(auth.access_token, auth.owner, firstBiz?.id);
        if (firstBiz?.id) {
          router.replace('/(owner)/dashboard' as any);
          return;
        } else {
          router.replace('/(owner)/onboarding' as any);
          return;
        }
      }
    } catch (err: any) {
      // Direct bypass to first seed business if offline
      const bizList = await fetchBusinesses().catch(() => []);
      if (bizList.length > 0) {
        const firstBiz = bizList[0];
        setAuth('demo_token', {
          id: 'demo_owner_1',
          name: 'Demo Merchant',
          mobile: '9876543210',
          businessId: firstBiz.id,
          role: 'OWNER',
        }, firstBiz.id);
        router.replace('/(owner)/dashboard' as any);
      } else {
        setErrorMsg('Could not initialize demo merchant. Please register with mobile.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace('/role-select' as any)}
            >
              <ChevronLeft size={24} color="#94A3B8" />
            </TouchableOpacity>
            <View style={styles.badge}>
              <Store size={14} color="#3B82F6" />
              <Text style={styles.badgeText}>MERCHANT CONSOLE</Text>
            </View>
            <Text style={styles.title}>
              {mode === 'login' ? 'Welcome Back, Partner' : 'Create Merchant Account'}
            </Text>
            <Text style={styles.subtitle}>
              Manage your queue live, call tokens with big-thumb actions, and print your acrylic standee QR.
            </Text>
          </View>

          {/* Mode Switch Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => {
                setMode('login');
                setErrorMsg('');
              }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.tabActive]}
              onPress={() => {
                setMode('signup');
                setErrorMsg('');
              }}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                New Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Merchant / Owner Name</Text>
                <View style={styles.inputBox}>
                  <User size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Dr. Rajesh or Sharma Salon"
                    placeholderTextColor="#475569"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>10-Digit Mobile Number</Text>
              <View style={styles.inputBox}>
                <Phone size={18} color="#64748B" style={styles.inputIcon} />
                <Text style={styles.prefix}>+91</Text>
                <TextInput
                  style={styles.input}
                  placeholder="9876543210"
                  placeholderTextColor="#475569"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={mobile}
                  onChangeText={setMobile}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password (Min 6 Characters)</Text>
              <View style={styles.inputBox}>
                <Lock size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#475569"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {mode === 'login' ? 'Login to Console' : 'Proceed to Onboarding'}
                  </Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Quick Demo Merchant Button */}
            <TouchableOpacity
              style={styles.demoButton}
              onPress={handleDemoMerchant}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Sparkles size={18} color="#10B981" />
              <Text style={styles.demoButtonText}>
                1-Tap Demo Merchant (Try Without Sign-Up)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Trust Guarantee */}
          <View style={styles.trustFooter}>
            <ShieldCheck size={16} color="#64748B" />
            <Text style={styles.trustText}>
              256-Bit Encrypted Session • Fast 2-Minute Setup
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  form: {
    gap: 18,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#24324D',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  prefix: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  demoButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  demoButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  trustFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 32,
  },
  trustText: {
    color: '#64748B',
    fontSize: 12,
  },
});
