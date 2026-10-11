import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useLanguageStore } from '../../src/store/useLanguageStore';
import { useRoleStore } from '../../src/store/useRoleStore';
import { translations } from '../../src/i18n/translations';
import { fetchBusinessDetail, joinQueue, JoinQueueResult } from '../../src/api/client';

const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export default function JoinQueueScreen() {
  const { id, serviceId: initialServiceId } = useLocalSearchParams<{
    id: string;
    serviceId?: string;
  }>();
  const router = useRouter();
  const { currentLanguage } = useLanguageStore();
  const t = translations[currentLanguage];
  const {
    deviceCustomerId,
    customerName: storedName,
    customerMobile: storedMobile,
    setCustomerProfile,
    setActiveTokenSummary,
  } = useRoleStore();

  const businessId = Array.isArray(id) ? id[0] : id || '';

  const [name, setName] = useState(storedName || '');
  const [mobile, setMobile] = useState(storedMobile || '');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    initialServiceId ? (Array.isArray(initialServiceId) ? initialServiceId[0] : initialServiceId) : null
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ['business-detail', businessId],
    queryFn: () => fetchBusinessDetail(businessId),
    enabled: !!businessId,
  });

  useEffect(() => {
    if (business?.services && business.services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(business.services[0].id);
    }
  }, [business?.services, selectedServiceId]);

  const joinMutation = useMutation({
    mutationFn: (payload: {
      customerName: string;
      customerMobile: string;
      serviceId: string;
      customerId: string;
    }) => joinQueue(businessId, payload),
    onSuccess: (result: JoinQueueResult) => {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
      }

      // Save user profile for faster 1-tap bookings in the future
      setCustomerProfile(name.trim(), mobile.trim());

      const selectedService = business?.services.find((s) => s.id === result.serviceId);

      // Save active token summary
      setActiveTokenSummary({
        tokenId: result.entryId,
        businessId: result.businessId,
        tokenNumber: result.tokenNumber,
        businessName: business?.name || 'Business',
        serviceName: selectedService?.name || 'Service',
        peopleAhead: result.peopleAhead,
        currentToken: business?.queueState?.currentToken || 0,
        status: result.status,
        customerMobile: result.customerMobile,
        customerName: result.customerName,
        upiId: business?.upiId,
        price: selectedService?.price || 0,
        joinedAt: result.createdAt,
      });

      // Navigate to live token tracker
      router.replace(`/token/${result.entryId}` as any);
    },
    onError: (err: any) => {
      setValidationError(err.message || 'Failed to join queue. Please try again.');
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch (_) {}
      }
    },
  });

  const isMobileValid = INDIAN_MOBILE_REGEX.test(mobile.trim());
  const selectedService = business?.services.find((s) => s.id === selectedServiceId);

  const handleJoin = () => {
    setValidationError(null);

    const cleanName = name.trim();
    const cleanMobile = mobile.trim();

    if (!cleanName) {
      setValidationError(t.customer.nameRequiredError);
      return;
    }

    if (!INDIAN_MOBILE_REGEX.test(cleanMobile)) {
      setValidationError(t.customer.invalidMobileError);
      return;
    }

    if (!selectedServiceId) {
      setValidationError(t.customer.serviceRequiredError);
      return;
    }

    joinMutation.mutate({
      customerName: cleanName,
      customerMobile: cleanMobile,
      serviceId: selectedServiceId,
      customerId: deviceCustomerId,
    });
  };

  if (loadingBusiness) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>{t.common.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.queue.joinQueue}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Business Header Card */}
        {business && (
          <View style={styles.bizMiniCard}>
            <Text style={styles.bizMiniName}>{business.name}</Text>
            <Text style={styles.bizMiniAddress} numberOfLines={1}>
              {business.address}
            </Text>
            <View style={styles.bizMiniStats}>
              <View style={styles.miniStatBadge}>
                <Clock size={12} color="#34D399" />
                <Text style={styles.miniStatText}>
                  Est. Wait: ~{(business.queueState?.waitingCount || 0) * 10}m
                </Text>
              </View>
              <View style={styles.miniStatBadge}>
                <Text style={styles.miniStatText}>
                  {business.queueState?.waitingCount || 0} in line
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Zero-OTP Guarantee Banner */}
        <View style={styles.zeroOtpBanner}>
          <Zap size={20} color="#F59E0B" />
          <View style={styles.zeroOtpTextWrapper}>
            <Text style={styles.zeroOtpTitle}>100% Zero-OTP Booking</Text>
            <Text style={styles.zeroOtpSubtitle}>{t.customer.zeroOtpGuarantee}</Text>
          </View>
        </View>

        {/* Service Selector */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionLabel}>{t.customer.servicesOffered}</Text>
          {business?.services.map((service) => {
            const isSelected = selectedServiceId === service.id;
            return (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceOption, isSelected && styles.serviceOptionSelected]}
                onPress={() => setSelectedServiceId(service.id)}
                activeOpacity={0.8}
              >
                <View style={styles.serviceOptionLeft}>
                  <View
                    style={[
                      styles.serviceOptionRadio,
                      isSelected && styles.serviceOptionRadioSelected,
                    ]}
                  />
                  <Text style={styles.serviceOptionName}>{service.name}</Text>
                </View>
                <Text style={styles.serviceOptionPrice}>
                  {service.price > 0 ? `₹${service.price}` : 'FREE'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Customer Form */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionLabel}>{t.customer.enterName}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#64748B"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.inputSection}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>{t.customer.enterMobile}</Text>
            {isMobileValid && (
              <View style={styles.validMobileBadge}>
                <CheckCircle2 size={12} color="#22C55E" />
                <Text style={styles.validMobileText}>Valid</Text>
              </View>
            )}
          </View>

          <View style={[styles.inputWrapper, mobile.length > 0 && !isMobileValid && styles.inputWrapperError]}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.mobileInput}
              placeholder="9876543210"
              placeholderTextColor="#64748B"
              value={mobile}
              onChangeText={(val) => setMobile(val.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
          <Text style={styles.helperText}>{t.customer.mobileHelper}</Text>
        </View>

        {/* Error Notification */}
        {validationError && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#F87171" />
            <Text style={styles.errorBoxText}>{validationError}</Text>
          </View>
        )}

        {/* Security & Offline note */}
        <View style={styles.guaranteeBox}>
          <ShieldCheck size={16} color="#34D399" />
          <Text style={styles.guaranteeText}>
            Token is cryptographically verified and backed up locally for offline use.
          </Text>
        </View>
      </ScrollView>

      {/* Instant Join CTA Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, joinMutation.isPending && styles.submitBtnDisabled]}
          onPress={handleJoin}
          disabled={joinMutation.isPending}
          activeOpacity={0.85}
        >
          {joinMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.submitBtnContent}>
              <Sparkles size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>{t.customer.instantBooking}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 48,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bizMiniCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  bizMiniName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F8FAFC',
  },
  bizMiniAddress: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
    marginTop: 2,
  },
  bizMiniStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  miniStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  miniStatText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#E2E8F0',
  },
  zeroOtpBanner: {
    backgroundColor: '#78350F',
    borderColor: '#D97706',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  zeroOtpTextWrapper: {
    flex: 1,
  },
  zeroOtpTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FEF3C7',
  },
  zeroOtpSubtitle: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#FDE68A',
    marginTop: 2,
  },
  inputSection: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#E2E8F0',
    marginBottom: 6,
  },
  validMobileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validMobileText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#22C55E',
  },
  inputWrapper: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  countryCode: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#38BDF8',
    marginRight: 10,
  },
  mobileInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#64748B',
    marginTop: 4,
    marginLeft: 4,
  },
  serviceOption: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  serviceOptionSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#132E27',
  },
  serviceOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  serviceOptionRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#64748B',
  },
  serviceOptionRadioSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E',
  },
  serviceOptionName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#F8FAFC',
  },
  serviceOptionPrice: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#34D399',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#450A0A',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 16,
  },
  errorBoxText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#FCA5A5',
    flex: 1,
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F291E',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginTop: 6,
  },
  guaranteeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#6EE7B7',
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    padding: 16,
  },
  submitBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#475569',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
});
