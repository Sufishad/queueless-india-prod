import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Store,
  ChevronRight,
  Phone,
  UserCheck,
  CheckCircle,
  SkipForward,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  QrCode,
  Users,
  IndianRupee,
} from 'lucide-react-native';
import { useOwnerStore } from '../../src/store/useOwnerStore';
import {
  fetchOwnerDashboard,
  ownerCallNext,
  ownerCompleteToken,
  ownerCancelToken,
  ownerToggleQueuePause,
  ownerToggleBusinessStatus,
  getWebSocketUrl,
  OwnerDashboardData,
  fetchBusinesses,
} from '../../src/api/client';
import {
  playNewCustomerAlert,
  playCallNextAlert,
  playSuccessAlert,
  playSkipWarningAlert,
} from '../../src/utils/audioAlert';

export default function OwnerDashboardScreen() {
  const router = useRouter();
  const {
    ownerToken,
    owner,
    businessId,
    isMuted,
    toggleMute,
    setAuth,
    setBusinessId,
    loadOwnerSession,
    isLoading: isStoreLoading,
  } = useOwnerStore();

  const [dashboardData, setDashboardData] = useState<OwnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Initialize session on mount
  useEffect(() => {
    loadOwnerSession();
  }, []);

  // Fetch or auto-assign business if missing
  useEffect(() => {
    if (!isStoreLoading) {
      if (!ownerToken) {
        // Attempt auto-login or redirect
        handleCheckBusiness();
      } else if (businessId) {
        loadDashboard(businessId, ownerToken);
      } else {
        handleCheckBusiness();
      }
    }
  }, [isStoreLoading, ownerToken, businessId]);

  const handleCheckBusiness = async () => {
    try {
      const bizList = await fetchBusinesses().catch(() => []);
      if (bizList.length > 0) {
        const first = bizList[0];
        setAuth(ownerToken || 'demo_token', {
          id: owner?.id || 'demo_owner_1',
          name: owner?.name || 'Dr. Ramesh Sharma',
          mobile: owner?.mobile || '9876543210',
          businessId: first.id,
          role: 'OWNER',
        }, first.id);
        loadDashboard(first.id, ownerToken || 'demo_token');
      } else {
        router.replace('/(owner)/login' as any);
      }
    } catch {
      router.replace('/(owner)/login' as any);
    }
  };

  const loadDashboard = async (bizId: string, token: string) => {
    try {
      setLoading(true);
      const data = await fetchOwnerDashboard(token, bizId);
      setDashboardData(data);
    } catch (err) {
      console.log('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (businessId && ownerToken) {
      loadDashboard(businessId, ownerToken);
    } else {
      setRefreshing(false);
    }
  };

  // WebSocket for Real-time Queue Updates and Audio Chimes
  useEffect(() => {
    if (!businessId) return;

    let ws: WebSocket;
    try {
      const wsUrl = getWebSocketUrl(businessId);
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'QUEUE_STATE_CHANGED' || msg.type === 'INITIAL_STATE') {
            // Check if waiting count increased -> new customer joined!
            setDashboardData((prev) => {
              if (prev && msg.data?.waiting_count > prev.waitingCount) {
                playNewCustomerAlert();
              }
              if (prev && msg.data) {
                return {
                  ...prev,
                  currentToken: msg.data.current_token ?? prev.currentToken,
                  lastToken: msg.data.last_token ?? prev.lastToken,
                  waitingCount: msg.data.waiting_count ?? prev.waitingCount,
                  stats: {
                    ...prev.stats,
                    waitingCount: msg.data.waiting_count ?? prev.stats.waitingCount,
                  },
                };
              }
              return prev;
            });
            // Re-fetch full dashboard details to update current serving customer
            if (businessId && ownerToken) {
              fetchOwnerDashboard(ownerToken, businessId).then(setDashboardData).catch(() => {});
            }
          }
        } catch (e) {}
      };

      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => setWsConnected(false);
    } catch (err) {}

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [businessId, ownerToken]);

  // Big Thumb Action: CALL NEXT
  const handleCallNext = async () => {
    if (!businessId) return;
    setActionLoading('call-next');
    try {
      await playCallNextAlert();
      await ownerCallNext(businessId);
      if (businessId && ownerToken) {
        const fresh = await fetchOwnerDashboard(ownerToken, businessId);
        setDashboardData(fresh);
      }
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'No more customers in waiting queue');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: COMPLETE SERVICE
  const handleCompleteCurrent = async () => {
    if (!businessId || !dashboardData?.nowServing) return;
    setActionLoading('complete');
    try {
      await playSuccessAlert();
      await ownerCompleteToken(businessId, dashboardData.nowServing.entryId);
      if (businessId && ownerToken) {
        const fresh = await fetchOwnerDashboard(ownerToken, businessId);
        setDashboardData(fresh);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete token');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: SKIP ABSENT CUSTOMER
  const handleSkipCurrent = async () => {
    if (!businessId || !dashboardData?.nowServing) return;
    setActionLoading('skip');
    try {
      await playSkipWarningAlert();
      await ownerCancelToken(businessId, dashboardData.nowServing.entryId, 'Customer absent at counter call');
      if (businessId && ownerToken) {
        const fresh = await fetchOwnerDashboard(ownerToken, businessId);
        setDashboardData(fresh);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to skip token');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle Queue Pause / Resume
  const handleTogglePause = async () => {
    if (!businessId || !ownerToken) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await ownerToggleQueuePause(ownerToken, businessId);
      setDashboardData((prev) => prev ? { ...prev, queueStatus: res.queueStatus } : null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update queue state');
    }
  };

  // Toggle Shop Open / Close
  const handleToggleShopStatus = async () => {
    if (!businessId || !ownerToken) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await ownerToggleBusinessStatus(ownerToken, businessId);
      if (businessId && ownerToken) {
        const fresh = await fetchOwnerDashboard(ownerToken, businessId);
        setDashboardData(fresh);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to toggle shop status');
    }
  };

  if (loading && !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Connecting to Business Console...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPaused = dashboardData?.queueStatus === 'PAUSED';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.businessBadge}>
            <Store size={14} color="#3B82F6" />
            <Text style={styles.businessTitle} numberOfLines={1}>
              {dashboardData?.businessName || 'Merchant Console'}
            </Text>
          </View>
          <View style={styles.statusPillsRow}>
            <View
              style={[
                styles.liveIndicator,
                { backgroundColor: wsConnected ? '#10B981' : '#F59E0B' },
              ]}
            />
            <Text style={styles.liveIndicatorText}>
              {wsConnected ? 'Real-Time Live' : 'Connecting...'}
            </Text>
            {isPaused && (
              <View style={styles.pausedPill}>
                <Text style={styles.pausedPillText}>PAUSED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Header Quick Controls: Audio Mute & Refresh */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconButton, isMuted && styles.iconButtonMuted]}
            onPress={toggleMute}
            activeOpacity={0.7}
          >
            {isMuted ? (
              <VolumeX size={18} color="#EF4444" />
            ) : (
              <Volume2 size={18} color="#10B981" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <RefreshCw size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Paused Queue Banner */}
        {isPaused && (
          <View style={styles.pausedBanner}>
            <AlertTriangle size={18} color="#F59E0B" />
            <Text style={styles.pausedBannerText}>
              Queue is currently Paused (Lunch/Break). New customer entries blocked.
            </Text>
          </View>
        )}

        {/* Live Counters 4-Box Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {dashboardData?.stats.waitingCount ?? 0}
            </Text>
            <Text style={styles.statLabel}>Waiting Now</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {dashboardData?.stats.servedToday ?? 0}
            </Text>
            <Text style={styles.statLabel}>Served Today</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {dashboardData?.stats.skippedToday ?? 0}
            </Text>
            <Text style={styles.statLabel}>Skipped</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#60A5FA' }]}>
              ₹{dashboardData?.stats.totalRevenueToday ?? 0}
            </Text>
            <Text style={styles.statLabel}>Revenue Today</Text>
          </View>
        </View>

        {/* Queue Control Buttons (Pause/Resume & Shop Status) */}
        <View style={styles.quickControlsRow}>
          <TouchableOpacity
            style={[
              styles.controlToggleBtn,
              isPaused && styles.controlToggleBtnActive,
            ]}
            onPress={handleTogglePause}
            activeOpacity={0.8}
          >
            {isPaused ? (
              <>
                <Play size={16} color="#10B981" />
                <Text style={[styles.controlToggleText, { color: '#10B981' }]}>
                  Resume Queue
                </Text>
              </>
            ) : (
              <>
                <Pause size={16} color="#F59E0B" />
                <Text style={styles.controlToggleText}>
                  Pause Queue (Break)
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlToggleBtn}
            onPress={handleToggleShopStatus}
            activeOpacity={0.8}
          >
            <Store size={16} color="#60A5FA" />
            <Text style={styles.controlToggleText}>Toggle Shop Open</Text>
          </TouchableOpacity>
        </View>

        {/* NOW SERVING CARD */}
        <View style={styles.servingCard}>
          <View style={styles.servingCardHeader}>
            <View style={styles.servingCardBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.servingCardBadgeText}>NOW SERVING AT COUNTER</Text>
            </View>
            {dashboardData?.nowServing && (
              <View
                style={[
                  styles.paymentTag,
                  dashboardData.nowServing.paymentStatus === 'PAID'
                    ? styles.paymentTagPaid
                    : styles.paymentTagUnpaid,
                ]}
              >
                <Text
                  style={[
                    styles.paymentTagText,
                    dashboardData.nowServing.paymentStatus === 'PAID'
                      ? styles.paymentTagTextPaid
                      : styles.paymentTagTextUnpaid,
                  ]}
                >
                  {dashboardData.nowServing.paymentStatus === 'PAID'
                    ? `PAID (${dashboardData.nowServing.paymentMode})`
                    : 'UNPAID'}
                </Text>
              </View>
            )}
          </View>

          {dashboardData?.nowServing ? (
            <View style={styles.servingDetails}>
              {/* Giant Token Display */}
              <View style={styles.tokenHeroRow}>
                <View style={styles.tokenBigBadge}>
                  <Text style={styles.tokenPrefix}>TOKEN</Text>
                  <Text style={styles.tokenHeroNumber}>
                    #{dashboardData.nowServing.tokenNumber}
                  </Text>
                </View>

                <View style={styles.customerMeta}>
                  <Text style={styles.customerHeroName}>
                    {dashboardData.nowServing.customerName}
                  </Text>
                  <View style={styles.customerPhoneRow}>
                    <Phone size={13} color="#94A3B8" />
                    <Text style={styles.customerPhoneText}>
                      {dashboardData.nowServing.maskedMobile}
                    </Text>
                  </View>
                  <View style={styles.servicePriceBadge}>
                    <Text style={styles.serviceHeroName}>
                      {dashboardData.nowServing.serviceName}
                    </Text>
                    <Text style={styles.serviceHeroPrice}>
                      • ₹{dashboardData.nowServing.servicePrice}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Service Completion Actions */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={[styles.cardBtn, styles.completeBtn]}
                  onPress={handleCompleteCurrent}
                  disabled={actionLoading === 'complete'}
                  activeOpacity={0.8}
                >
                  {actionLoading === 'complete' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle size={18} color="#FFFFFF" />
                      <Text style={styles.completeBtnText}>Mark Complete</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cardBtn, styles.skipBtn]}
                  onPress={handleSkipCurrent}
                  disabled={actionLoading === 'skip'}
                  activeOpacity={0.8}
                >
                  {actionLoading === 'skip' ? (
                    <ActivityIndicator size="small" color="#F87171" />
                  ) : (
                    <>
                      <SkipForward size={18} color="#F87171" />
                      <Text style={styles.skipBtnText}>Skip / Absent</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.noServingBox}>
              <UserCheck size={36} color="#334155" />
              <Text style={styles.noServingTitle}>Counter is Idle</Text>
              <Text style={styles.noServingSubtitle}>
                {dashboardData?.waitingCount && dashboardData.waitingCount > 0
                  ? `${dashboardData.waitingCount} customer(s) waiting in queue. Tap CALL NEXT below!`
                  : 'No customers currently waiting in queue.'}
              </Text>
            </View>
          )}
        </View>

        {/* BIG THUMB ACTION: CALL NEXT BUTTON */}
        <TouchableOpacity
          style={[
            styles.callNextHeroButton,
            (isPaused || actionLoading === 'call-next') && styles.callNextDisabled,
          ]}
          onPress={handleCallNext}
          disabled={isPaused || actionLoading === 'call-next'}
          activeOpacity={0.85}
        >
          {actionLoading === 'call-next' ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <View style={styles.callNextContent}>
              <View style={styles.callNextIconWrapper}>
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <View style={styles.callNextTextWrapper}>
                <Text style={styles.callNextHeroTitle}>CALL NEXT CUSTOMER</Text>
                <Text style={styles.callNextHeroSubtitle}>
                  Auto-completes current & sends real-time alert
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Quick Screen Navigators */}
        <View style={styles.navCardsRow}>
          <TouchableOpacity
            style={styles.navCard}
            onPress={() => router.push('/(owner)/queue' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.navCardHeader}>
              <View style={[styles.navIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Users size={20} color="#3B82F6" />
              </View>
              <ChevronRight size={18} color="#64748B" />
            </View>
            <Text style={styles.navCardTitle}>Live Queue Manager</Text>
            <Text style={styles.navCardDesc}>
              Walk-in generator, payment status & list
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => router.push('/(owner)/qr' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.navCardHeader}>
              <View style={[styles.navIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <QrCode size={20} color="#10B981" />
              </View>
              <ChevronRight size={18} color="#64748B" />
            </View>
            <Text style={styles.navCardTitle}>Acrylic Standee QR</Text>
            <Text style={styles.navCardDesc}>
              5 themes & High-Res PDF Print
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  businessTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  statusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveIndicatorText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  pausedPill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  pausedPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 16,
  },
  pausedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  pausedBannerText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#24324D',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif-medium',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  quickControlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#24324D',
    borderRadius: 12,
    height: 42,
  },
  controlToggleBtnActive: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  controlToggleText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  servingCard: {
    backgroundColor: '#131D31',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  servingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  servingCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  servingCardBadgeText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paymentTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentTagPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  paymentTagUnpaid: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  paymentTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paymentTagTextPaid: {
    color: '#10B981',
  },
  paymentTagTextUnpaid: {
    color: '#EF4444',
  },
  servingDetails: {
    gap: 16,
  },
  tokenHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tokenBigBadge: {
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 84,
  },
  tokenPrefix: {
    color: '#60A5FA',
    fontSize: 10,
    fontWeight: '700',
  },
  tokenHeroNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  customerMeta: {
    flex: 1,
    gap: 4,
  },
  customerHeroName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  customerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerPhoneText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  servicePriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  serviceHeroName: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  serviceHeroPrice: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cardBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  completeBtn: {
    backgroundColor: '#059669',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  skipBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  skipBtnText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
  },
  noServingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  noServingTitle: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  noServingSubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  callNextHeroButton: {
    backgroundColor: '#16A34A',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  callNextDisabled: {
    backgroundColor: '#1E293B',
    shadowOpacity: 0,
    elevation: 0,
  },
  callNextContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  callNextIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callNextTextWrapper: {
    flex: 1,
    gap: 2,
  },
  callNextHeroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  callNextHeroSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  navCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  navCard: {
    flex: 1,
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#24324D',
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  navCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCardTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  navCardDesc: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 14,
  },
});
