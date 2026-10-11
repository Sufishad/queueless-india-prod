import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import {
  ArrowLeft,
  Share2,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
  CreditCard,
  WifiOff,
  LogOut,
  Radio,
  ExternalLink,
} from 'lucide-react-native';
import { useLanguageStore } from '../../src/store/useLanguageStore';
import { useRoleStore } from '../../src/store/useRoleStore';
import { translations } from '../../src/i18n/translations';
import {
  fetchLiveToken,
  cancelToken,
  getWebSocketUrl,
  LiveTokenData,
} from '../../src/api/client';

export default function LiveTokenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentLanguage } = useLanguageStore();
  const t = translations[currentLanguage];
  const {
    activeTokenSummary,
    setActiveTokenSummary,
    deviceCustomerId,
  } = useRoleStore();

  const entryId = Array.isArray(id) ? id[0] : id || '';

  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch token status via REST (React Query)
  const {
    data: tokenData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['live-token', entryId],
    queryFn: () => fetchLiveToken(entryId),
    enabled: !!entryId,
    refetchInterval: 12000, // 12-second background fallback poll
  });

  // Track offline fallback using activeTokenSummary if REST fails
  useEffect(() => {
    if (isError && activeTokenSummary?.tokenId === entryId) {
      setOfflineMode(true);
    } else {
      setOfflineMode(false);
    }
  }, [isError, activeTokenSummary, entryId]);

  // Derived token information (combining live API + offline backup)
  const isCurrentSummary = activeTokenSummary && activeTokenSummary.tokenId === entryId;
  const effectiveToken: Partial<LiveTokenData> = tokenData || (isCurrentSummary && activeTokenSummary ? {
    id: activeTokenSummary.tokenId,
    businessId: activeTokenSummary.businessId,
    businessName: activeTokenSummary.businessName,
    businessAddress: 'Locally Saved Business',
    businessUpiId: activeTokenSummary.upiId,
    serviceId: 'service',
    serviceName: activeTokenSummary.serviceName,
    servicePrice: activeTokenSummary.price || 0,
    tokenNumber: activeTokenSummary.tokenNumber,
    currentToken: activeTokenSummary.currentToken,
    status: activeTokenSummary.status,
    peopleAhead: activeTokenSummary.peopleAhead,
    estimatedWaitMin: activeTokenSummary.peopleAhead * 10,
    customerName: activeTokenSummary.customerName,
    customerMobile: activeTokenSummary.customerMobile,
    createdAt: activeTokenSummary.joinedAt || new Date().toISOString(),
  } : {});

  const businessId = effectiveToken.businessId;

  // Sync state back to store
  useEffect(() => {
    if (tokenData) {
      setActiveTokenSummary({
        tokenId: tokenData.id,
        businessId: tokenData.businessId,
        tokenNumber: tokenData.tokenNumber,
        businessName: tokenData.businessName,
        serviceName: tokenData.serviceName,
        peopleAhead: tokenData.peopleAhead,
        currentToken: tokenData.currentToken,
        status: tokenData.status,
        customerMobile: tokenData.customerMobile,
        customerName: tokenData.customerName,
        upiId: tokenData.businessUpiId,
        price: tokenData.servicePrice,
        joinedAt: tokenData.createdAt,
      });
    }
  }, [tokenData, setActiveTokenSummary]);

  // WebSocket Connection for instant realtime updates
  useEffect(() => {
    if (!businessId) return;

    let socket: WebSocket | null = null;
    try {
      const wsUrl = getWebSocketUrl(businessId);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (
            msg.type === 'QUEUE_STATE_CHANGED' ||
            msg.type === 'INITIAL_STATE' ||
            msg.type === 'CUSTOMER_TURN_NEAR'
          ) {
            // Trigger refetch of token
            queryClient.invalidateQueries({ queryKey: ['live-token', entryId] });

            // Trigger turn near haptic alert
            if (msg.type === 'CUSTOMER_TURN_NEAR' || (effectiveToken.peopleAhead !== undefined && effectiveToken.peopleAhead <= 2)) {
              if (Platform.OS !== 'web') {
                try {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                } catch (_) {}
              }
            }
          }
        } catch (_) {}
      };

      socket.onerror = () => {
        setWsConnected(false);
      };

      socket.onclose = () => {
        setWsConnected(false);
      };

      wsRef.current = socket;
    } catch (_) {
      setWsConnected(false);
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [businessId, entryId, queryClient, effectiveToken.peopleAhead]);

  // Trigger turn near alert vibration on peopleAhead <= 2
  const prevAheadRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (
      effectiveToken.peopleAhead !== undefined &&
      effectiveToken.peopleAhead <= 2 &&
      effectiveToken.peopleAhead !== prevAheadRef.current &&
      effectiveToken.status === 'WAITING'
    ) {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (_) {}
      }
    }
    prevAheadRef.current = effectiveToken.peopleAhead;
  }, [effectiveToken.peopleAhead, effectiveToken.status]);

  // Leave queue mutation
  const leaveMutation = useMutation({
    mutationFn: () => cancelToken(businessId || '', entryId, deviceCustomerId),
    onSuccess: () => {
      if (activeTokenSummary?.tokenId === entryId) {
        setActiveTokenSummary(null);
      }
      setLeaveModalVisible(false);
      router.replace('/(customer)/home');
    },
  });

  const handleShare = async () => {
    if (!effectiveToken.tokenNumber) return;
    try {
      await Share.share({
        message: `My QueueLess India Token #${String(effectiveToken.tokenNumber).padStart(2, '0')} at ${effectiveToken.businessName}. Service: ${effectiveToken.serviceName}`,
      });
    } catch (_) {}
  };

  // UPI deep link construction
  const upiId = effectiveToken.businessUpiId || 'paytmqr.queueless@paytm';
  const amount = effectiveToken.servicePrice ? effectiveToken.servicePrice.toFixed(2) : '0';
  const bizName = effectiveToken.businessName || 'QueueLess Partner';
  const tokenNum = effectiveToken.tokenNumber || 0;
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(bizName)}&am=${amount}&tn=QueueLess-Token-${tokenNum}&cu=INR`;

  const handlePayUPI = async () => {
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
      } else {
        await Linking.openURL(upiUrl); // Attempt fallback
      }
    } catch (_) {
      // In web or unsupported env
      alert(`UPI deep link: ${upiUrl}`);
    }
  };

  if (isLoading && !effectiveToken.tokenNumber) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Fetching live token state...</Text>
      </View>
    );
  }

  const isNear = effectiveToken.peopleAhead !== undefined && effectiveToken.peopleAhead <= 2;
  const isServing = effectiveToken.status === 'SERVING';
  const isCompleted = effectiveToken.status === 'COMPLETED';

  // Offline or Verified QR payload
  const qrPayload = JSON.stringify({
    id: entryId,
    token: effectiveToken.tokenNumber,
    biz: effectiveToken.businessId,
    mob: effectiveToken.customerMobile,
    svc: effectiveToken.serviceName,
  });

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

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {effectiveToken.businessName || 'Live Token'}
          </Text>
          <View style={styles.headerLiveIndicator}>
            <Radio size={12} color={wsConnected ? '#22C55E' : '#94A3B8'} />
            <Text style={[styles.headerLiveText, { color: wsConnected ? '#34D399' : '#94A3B8' }]}>
              {wsConnected ? 'LIVE REALTIME' : 'POLLING SYNC'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.iconCircle}
          onPress={handleShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Share2 size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Turn Approaching or Serving Alert Banner */}
        {isServing ? (
          <View style={styles.alertBannerServing}>
            <CheckCircle2 size={22} color="#FFFFFF" />
            <View style={styles.alertTextWrapper}>
              <Text style={styles.alertTitleServing}>YOUR TURN NOW!</Text>
              <Text style={styles.alertSubtitleServing}>
                Please proceed directly to the counter.
              </Text>
            </View>
          </View>
        ) : isNear ? (
          <View style={styles.alertBannerNear}>
            <AlertTriangle size={22} color="#FEF3C7" />
            <View style={styles.alertTextWrapper}>
              <Text style={styles.alertTitleNear}>TURN APPROACHING!</Text>
              <Text style={styles.alertSubtitleNear}>{t.queue.turnNearAlert}</Text>
            </View>
          </View>
        ) : null}

        {/* Offline Banner if running from local state */}
        {offlineMode && (
          <View style={styles.offlineBanner}>
            <WifiOff size={16} color="#FCA5A5" />
            <Text style={styles.offlineBannerText}>{t.customer.offlineQrNotice}</Text>
          </View>
        )}

        {/* Massive Digital Token Card */}
        <View
          style={[
            styles.digitalTokenCard,
            isServing
              ? styles.digitalTokenCardServing
              : isNear
              ? styles.digitalTokenCardNear
              : styles.digitalTokenCardNormal,
          ]}
        >
          <Text style={styles.digitalTokenLabel}>YOUR TOKEN NUMBER</Text>
          <Text style={styles.digitalTokenNumber}>
            #{String(effectiveToken.tokenNumber || 0).padStart(2, '0')}
          </Text>

          <View style={styles.tokenStatusBadge}>
            <Text style={styles.tokenStatusBadgeText}>
              {effectiveToken.status || 'WAITING'}
            </Text>
          </View>

          <View style={styles.tokenDetailsRow}>
            <Text style={styles.tokenServiceName}>{effectiveToken.serviceName}</Text>
            <Text style={styles.tokenPrice}>
              {effectiveToken.servicePrice ? `₹${effectiveToken.servicePrice}` : 'Free'}
            </Text>
          </View>
        </View>

        {/* Live Queue Progress Indicators */}
        <View style={styles.statsCard}>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>{t.queue.nowServing}</Text>
            <Text style={styles.statValHighlight}>
              #{effectiveToken.currentToken ? String(effectiveToken.currentToken).padStart(2, '0') : '--'}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>{t.queue.waitingAhead}</Text>
            <View style={styles.statIconVal}>
              <Users size={16} color="#22C55E" />
              <Text style={styles.statValPrimary}>
                {effectiveToken.peopleAhead ?? '--'}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>{t.queue.estimatedWait}</Text>
            <View style={styles.statIconVal}>
              <Clock size={16} color="#38BDF8" />
              <Text style={styles.statValSecondary}>
                ~{effectiveToken.estimatedWaitMin ?? ((effectiveToken.peopleAhead || 0) * 10)}m
              </Text>
            </View>
          </View>
        </View>

        {/* UPI Payment Card & QR */}
        <View style={styles.upiCard}>
          <View style={styles.upiHeader}>
            <View style={styles.upiHeaderLeft}>
              <CreditCard size={18} color="#34D399" />
              <Text style={styles.upiTitle}>Instant UPI Payment</Text>
            </View>
            <Text style={styles.upiAmount}>
              ₹{effectiveToken.servicePrice ? effectiveToken.servicePrice.toFixed(0) : '0'}
            </Text>
          </View>

          <Text style={styles.upiSubtitle}>
            Scan QR or tap below to pay with Google Pay, PhonePe, Paytm, or BHIM.
          </Text>

          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={upiUrl}
                size={160}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.qrCaption}>UPI ID: {upiId}</Text>
          </View>

          <TouchableOpacity style={styles.upiPayBtn} onPress={handlePayUPI} activeOpacity={0.85}>
            <ExternalLink size={16} color="#FFFFFF" />
            <Text style={styles.upiPayBtnText}>{t.customer.payUpi}</Text>
          </TouchableOpacity>
        </View>

        {/* Offline Counter Check-in QR */}
        <View style={styles.offlineQrCard}>
          <Text style={styles.offlineCardTitle}>OFFLINE VERIFICATION QR</Text>
          <Text style={styles.offlineCardSubtitle}>
            No internet at counter? Show this QR code to the shop operator to verify your turn.
          </Text>
          <View style={styles.offlineQrBox}>
            <QRCode
              value={qrPayload}
              size={120}
              color="#0F172A"
              backgroundColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Leave Queue CTA */}
        {!isCompleted && effectiveToken.status !== 'CANCELLED' && (
          <TouchableOpacity
            style={styles.leaveQueueBtn}
            onPress={() => setLeaveModalVisible(true)}
            activeOpacity={0.8}
          >
            <LogOut size={16} color="#F87171" />
            <Text style={styles.leaveQueueText}>{t.queue.leaveQueue}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Leave Queue Confirmation Modal */}
      <Modal
        visible={leaveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalWarningIcon}>
              <AlertTriangle size={28} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>{t.customer.leaveQueueConfirm}</Text>
            <Text style={styles.modalMessage}>{t.customer.leaveQueueWarning}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLeaveModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>{t.common.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
              >
                {leaveMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>{t.queue.leaveQueue}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  headerLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerLiveText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  alertBannerServing: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  alertTitleServing: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  alertSubtitleServing: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#DCFCE7',
    marginTop: 2,
  },
  alertBannerNear: {
    backgroundColor: '#B45309',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  alertTextWrapper: {
    flex: 1,
  },
  alertTitleNear: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#FEF3C7',
    letterSpacing: 0.5,
  },
  alertSubtitleNear: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#FDE68A',
    marginTop: 2,
  },
  offlineBanner: {
    backgroundColor: '#450A0A',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  offlineBannerText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    flex: 1,
  },
  digitalTokenCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  digitalTokenCardNormal: {
    backgroundColor: '#022C22',
    borderColor: '#10B981',
  },
  digitalTokenCardNear: {
    backgroundColor: '#451A03',
    borderColor: '#F59E0B',
  },
  digitalTokenCardServing: {
    backgroundColor: '#14532D',
    borderColor: '#22C55E',
  },
  digitalTokenLabel: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#34D399',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  digitalTokenNumber: {
    fontSize: 76,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#FFFFFF',
    lineHeight: 84,
  },
  tokenStatusBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  tokenStatusBadgeText: {
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  tokenDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#065F46',
  },
  tokenServiceName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#E2E8F0',
  },
  tokenPrice: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#34D399',
  },
  statsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
    marginBottom: 4,
  },
  statValHighlight: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#38BDF8',
  },
  statIconVal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValPrimary: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#22C55E',
  },
  statValSecondary: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#E2E8F0',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#334155',
  },
  upiCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  upiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  upiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upiTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F8FAFC',
  },
  upiAmount: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#34D399',
  },
  upiSubtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 18,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  qrCaption: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Medium',
    color: '#94A3B8',
    marginTop: 8,
  },
  upiPayBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upiPayBtnText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
  },
  offlineQrCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    marginBottom: 20,
  },
  offlineCardTitle: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 6,
  },
  offlineCardSubtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  offlineQrBox: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  leaveQueueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  leaveQueueText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F87171',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalWarningIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#450A0A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 13,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
  },
});
