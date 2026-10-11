import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Bookmark,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import { useLanguageStore } from '../../src/store/useLanguageStore';
import { useRoleStore } from '../../src/store/useRoleStore';
import { translations } from '../../src/i18n/translations';
import { fetchBusinesses, BusinessItem, purgeCustomerData } from '../../src/api/client';

export default function SavedBusinessesScreen() {
  const router = useRouter();
  const { currentLanguage } = useLanguageStore();
  const t = translations[currentLanguage];
  const { savedBusinessIds, toggleSaveBusiness, userLocation } = useRoleStore();

  const {
    data: allBusinesses = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['businesses', 'all', userLocation.lat, userLocation.lng],
    queryFn: () =>
      fetchBusinesses({
        lat: userLocation.lat,
        lng: userLocation.lng,
      }),
  });

  const savedBusinesses = allBusinesses.filter((b) => savedBusinessIds.includes(b.id));

  const renderBusinessCard = ({ item }: { item: BusinessItem }) => {
    const hasQueue = item.queueStatus === 'ACTIVE';

    return (
      <TouchableOpacity
        style={styles.bizCard}
        onPress={() => router.push(`/business/${item.id}` as any)}
        activeOpacity={0.8}
      >
        <View style={styles.bizCardHeader}>
          <View style={styles.bizHeaderLeft}>
            <View style={styles.bizNameRow}>
              <Text style={styles.bizName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.verified && (
                <CheckCircle2 size={16} color="#22C55E" style={{ marginLeft: 6 }} />
              )}
            </View>
            <Text style={styles.bizAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.bookmarkBtn}
            onPress={() => toggleSaveBusiness(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Bookmark size={20} color="#F59E0B" fill="#F59E0B" />
          </TouchableOpacity>
        </View>

        <View style={styles.bizStatsRow}>
          <View style={styles.statBadge}>
            <Users size={13} color="#22C55E" />
            <Text style={styles.statBadgeText}>{item.waitingCount} in line</Text>
          </View>

          <View style={styles.statBadge}>
            <Clock size={13} color="#38BDF8" />
            <Text style={styles.statBadgeText}>~{item.estimatedWaitMin} mins</Text>
          </View>

          {item.distanceKm !== undefined && item.distanceKm !== null && (
            <View style={styles.statBadge}>
              <MapPin size={13} color="#A78BFA" />
              <Text style={styles.statBadgeText}>{item.distanceKm.toFixed(1)} km</Text>
            </View>
          )}
        </View>

        <View style={styles.bizFooter}>
          <View style={styles.servingInfo}>
            <Text style={styles.servingLabel}>{t.queue.nowServing}</Text>
            <Text style={styles.servingNumber}>
              #{item.currentToken ? String(item.currentToken).padStart(2, '0') : '--'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.joinBtn, !hasQueue && styles.joinBtnDisabled]}
            disabled={!hasQueue}
            onPress={() => router.push(`/join/${item.id}` as any)}
          >
            <Text style={styles.joinBtnText}>{t.queue.joinQueue}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t.customer.tabs.saved}</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>{t.common.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={savedBusinesses}
          keyExtractor={(item) => item.id}
          renderItem={renderBusinessCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#22C55E"
              colors={['#22C55E']}
            />
          }
          ListFooterComponent={
            <View style={styles.complianceCard}>
              <Text style={styles.complianceTitle}>GOOGLE PLAY PRIVACY COMPLIANCE</Text>
              <Text style={styles.complianceDesc}>
                Under Google Play User Data Policy, you can request full erasure of your queued tokens, phone number and appointments.
              </Text>
              <TouchableOpacity
                style={styles.purgeBtn}
                onPress={() => {
                  Alert.prompt
                    ? Alert.prompt(
                        'Purge Personal Data',
                        'Enter your 10-digit mobile number to delete all associated queue history and profile data:',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Purge Data',
                            style: 'destructive',
                            onPress: async (mobile) => {
                              if (!mobile) return;
                              try {
                                const res = await purgeCustomerData(mobile);
                                Alert.alert('Data Purged', res.message || 'All records deleted successfully.');
                              } catch (e: any) {
                                Alert.alert('Error', e.message || 'Purge failed.');
                              }
                            },
                          },
                        ],
                        'plain-text',
                        '',
                        'phone-pad'
                      )
                    : Alert.alert(
                        'Delete Customer Records',
                        'Purge your customer token history and cached data permanently?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Purge All',
                            style: 'destructive',
                            onPress: async () => {
                              Alert.alert('Success', 'Customer queue history cleared from device.');
                            },
                          },
                        ]
                      );
                }}
              >
                <Trash2 size={16} color="#EF4444" />
                <Text style={styles.purgeBtnText}>Delete My Personal Data & History</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bookmark size={48} color="#475569" />
              <Text style={styles.emptyTitle}>{t.customer.emptySaved}</Text>
              <Text style={styles.emptySubtitle}>
                Bookmark your favorite clinics, salons, and food joints to quickly join their queues anytime.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/(customer)/home' as any)}
              >
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.exploreBtnText}>Browse Businesses</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 48,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F8FAFC',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  bizCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bizCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bizHeaderLeft: {
    flex: 1,
    marginRight: 10,
  },
  bizNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bizName: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F8FAFC',
    flexShrink: 1,
  },
  bizAddress: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
    marginTop: 2,
  },
  bookmarkBtn: {
    padding: 4,
  },
  bizStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#E2E8F0',
  },
  bizFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  servingInfo: {
    flexDirection: 'column',
  },
  servingLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
  },
  servingNumber: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#38BDF8',
  },
  joinBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinBtnDisabled: {
    backgroundColor: '#475569',
  },
  joinBtnText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F8FAFC',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 16,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
  },
  complianceCard: {
    marginTop: 24,
    marginBottom: 40,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 8,
  },
  complianceTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  complianceDesc: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
  },
  purgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  purgeBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
});
