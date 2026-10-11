import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Ticket,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { useLanguageStore } from '../../src/store/useLanguageStore';
import { useRoleStore } from '../../src/store/useRoleStore';
import { translations } from '../../src/i18n/translations';
import { fetchUserTokens, LiveTokenData } from '../../src/api/client';

type TabType = 'active' | 'completed' | 'cancelled';

export default function MyQueuesScreen() {
  const router = useRouter();
  const { currentLanguage } = useLanguageStore();
  const t = translations[currentLanguage];
  const { customerMobile, deviceCustomerId, activeTokenSummary } = useRoleStore();

  const [activeTab, setActiveTab] = useState<TabType>('active');

  const {
    data: tokens = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['user-tokens', customerMobile, deviceCustomerId, activeTab],
    queryFn: () =>
      fetchUserTokens({
        mobile: customerMobile || undefined,
        sessionId: deviceCustomerId || undefined,
        status:
          activeTab === 'active'
            ? 'WAITING'
            : activeTab === 'completed'
            ? 'COMPLETED'
            : 'CANCELLED',
      }),
  });

  const renderTokenCard = ({ item }: { item: LiveTokenData }) => {
    const isServing = item.status === 'SERVING';
    const isCompleted = item.status === 'COMPLETED';
    const isCancelled = item.status === 'CANCELLED';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/token/${item.id}` as any)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.tokenBadge}>
            <Text style={styles.tokenBadgeText}>
              #{String(item.tokenNumber).padStart(2, '0')}
            </Text>
          </View>

          <View style={styles.cardTitleBox}>
            <Text style={styles.bizName} numberOfLines={1}>
              {item.businessName}
            </Text>
            <Text style={styles.serviceName}>{item.serviceName}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isCompleted
                ? styles.statusCompleted
                : isCancelled
                ? styles.statusCancelled
                : isServing
                ? styles.statusServing
                : styles.statusWaiting,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isCompleted
                  ? styles.textCompleted
                  : isCancelled
                  ? styles.textCancelled
                  : isServing
                  ? styles.textServing
                  : styles.textWaiting,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Clock size={13} color="#94A3B8" />
              <Text style={styles.infoLabel}>
                {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
              </Text>
            </View>

            <Text style={styles.priceTag}>
              {item.servicePrice > 0 ? `₹${item.servicePrice}` : 'Free'}
            </Text>
          </View>
        </View>

        {item.status === 'WAITING' || item.status === 'SERVING' ? (
          <View style={styles.cardFooter}>
            <View style={styles.aheadInfo}>
              <Text style={styles.aheadLabel}>
                {item.peopleAhead} {t.customer.peopleAhead} • ~{item.peopleAhead * 10}m
              </Text>
            </View>
            <View style={styles.trackBtn}>
              <Text style={styles.trackBtnText}>{t.customer.viewLiveToken}</Text>
              <ChevronRight size={14} color="#34D399" />
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t.customer.tabs.myQueues}</Text>
      </View>

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            style={[styles.tabBtnText, activeTab === 'active' && styles.tabBtnTextActive]}
          >
            {t.customer.status.active}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'completed' && styles.tabBtnTextActive,
            ]}
          >
            {t.customer.status.completed}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'cancelled' && styles.tabBtnActive]}
          onPress={() => setActiveTab('cancelled')}
        >
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'cancelled' && styles.tabBtnTextActive,
            ]}
          >
            {t.customer.status.cancelled}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>{t.common.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={tokens}
          keyExtractor={(item) => item.id}
          renderItem={renderTokenCard}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ticket size={48} color="#475569" />
              <Text style={styles.emptyTitle}>{t.customer.emptyQueues}</Text>
              <Text style={styles.emptySubtitle}>
                You have no {activeTab} tokens. Join a queue at any shop to track your live place.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => router.push('/(customer)/home' as any)}
              >
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.exploreBtnText}>Explore Nearby Shops</Text>
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  tabBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  tokenBadge: {
    backgroundColor: '#022C22',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  tokenBadgeText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#34D399',
  },
  cardTitleBox: {
    flex: 1,
  },
  bizName: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F8FAFC',
  },
  serviceName: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusWaiting: {
    backgroundColor: '#064E3B',
  },
  statusServing: {
    backgroundColor: '#15803D',
  },
  statusCompleted: {
    backgroundColor: '#1E293B',
  },
  statusCancelled: {
    backgroundColor: '#450A0A',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  textWaiting: {
    color: '#34D399',
  },
  textServing: {
    color: '#86EFAC',
  },
  textCompleted: {
    color: '#94A3B8',
  },
  textCancelled: {
    color: '#F87171',
  },
  cardBody: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
  },
  priceTag: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#34D399',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  aheadInfo: {
    flex: 1,
  },
  aheadLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#A7F3D0',
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trackBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#34D399',
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
});
