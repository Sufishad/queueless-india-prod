import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Search,
  X,
  Bookmark,
  ChevronRight,
  Sparkles,
  Clock,
  Users,
  CheckCircle2,
  Globe,
  Radio,
} from 'lucide-react-native';
import { useLanguageStore } from '../../src/store/useLanguageStore';
import { useRoleStore } from '../../src/store/useRoleStore';
import { translations } from '../../src/i18n/translations';
import { fetchBusinesses, seedDemoData, BusinessItem } from '../../src/api/client';
import { LanguageModal } from '../../src/components/LanguageModal';

const CATEGORIES = [
  { key: 'all', icon: '✨' },
  { key: 'clinic', icon: '🩺' },
  { key: 'salon', icon: '✂️' },
  { key: 'bank', icon: '🏦' },
  { key: 'restaurant', icon: '☕' },
  { key: 'retail', icon: '🛍️' },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentLanguage } = useLanguageStore();
  const t = translations[currentLanguage];
  const {
    activeTokenSummary,
    savedBusinessIds,
    toggleSaveBusiness,
    userLocation,
  } = useRoleStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Fetch businesses with React Query
  const {
    data: businesses = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['businesses', selectedCategory, searchQuery, userLocation.lat, userLocation.lng],
    queryFn: () =>
      fetchBusinesses({
        q: searchQuery,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        lat: userLocation.lat,
        lng: userLocation.lng,
      }),
  });

  // Seed demo mutation
  const seedMutation = useMutation({
    mutationFn: seedDemoData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });

  const renderActiveTokenBanner = () => {
    if (!activeTokenSummary || activeTokenSummary.status === 'COMPLETED' || activeTokenSummary.status === 'CANCELLED') {
      return null;
    }

    const isServing = activeTokenSummary.status === 'SERVING';
    const isNear = activeTokenSummary.peopleAhead <= 2;

    return (
      <TouchableOpacity
        style={[
          styles.activeBanner,
          isServing
            ? styles.activeBannerServing
            : isNear
            ? styles.activeBannerNear
            : styles.activeBannerNormal,
        ]}
        onPress={() => router.push(`/token/${activeTokenSummary.tokenId}` as any)}
        activeOpacity={0.85}
      >
        <View style={styles.activeBannerLeft}>
          <View style={styles.tokenBadge}>
            <Text style={styles.tokenBadgeText}>
              #{String(activeTokenSummary.tokenNumber).padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.bannerInfo}>
            <View style={styles.bannerTitleRow}>
              <Radio size={14} color="#22C55E" />
              <Text style={styles.bannerTitleText} numberOfLines={1}>
                {activeTokenSummary.businessName}
              </Text>
            </View>
            <Text style={styles.bannerSubtitleText}>
              {isServing
                ? t.customer.status.serving
                : `${activeTokenSummary.peopleAhead} ${t.customer.peopleAhead} • ~${activeTokenSummary.peopleAhead * 10} ${t.customer.minsWait}`}
            </Text>
          </View>
        </View>
        <View style={styles.trackLiveBtn}>
          <Text style={styles.trackLiveText}>{t.customer.viewLiveToken}</Text>
          <ChevronRight size={14} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryChip = (cat: { key: string; icon: string }) => {
    const isSelected = selectedCategory === cat.key;
    const catLabel =
      t.customer.categories[cat.key as keyof typeof t.customer.categories] || cat.key;

    return (
      <TouchableOpacity
        key={cat.key}
        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
        onPress={() => setSelectedCategory(cat.key)}
        activeOpacity={0.7}
      >
        <Text style={styles.categoryIcon}>{cat.icon}</Text>
        <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
          {catLabel}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBusinessCard = ({ item }: { item: BusinessItem }) => {
    const isSaved = savedBusinessIds.includes(item.id);
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
            <Bookmark
              size={20}
              color={isSaved ? '#F59E0B' : '#94A3B8'}
              fill={isSaved ? '#F59E0B' : 'transparent'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.bizStatsRow}>
          <View style={styles.statBadge}>
            <Users size={13} color="#22C55E" />
            <Text style={styles.statBadgeText}>
              {item.waitingCount} in line
            </Text>
          </View>

          <View style={styles.statBadge}>
            <Clock size={13} color="#38BDF8" />
            <Text style={styles.statBadgeText}>
              ~{item.estimatedWaitMin} mins
            </Text>
          </View>

          {item.distanceKm !== undefined && item.distanceKm !== null && (
            <View style={styles.statBadge}>
              <MapPin size={13} color="#A78BFA" />
              <Text style={styles.statBadgeText}>
                {item.distanceKm.toFixed(1)} km
              </Text>
            </View>
          )}

          <View style={[styles.statusPill, hasQueue ? styles.pillOpen : styles.pillClosed]}>
            <Text style={[styles.statusPillText, hasQueue ? styles.textOpen : styles.textClosed]}>
              {hasQueue ? 'Live Queue' : 'Paused'}
            </Text>
          </View>
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
      {/* Top Location Bar */}
      <View style={styles.topBar}>
        <View style={styles.locationContainer}>
          <MapPin size={18} color="#22C55E" />
          <View style={styles.locationTextWrapper}>
            <Text style={styles.locationLabel}>{t.customer.locationLabel}</Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {userLocation.area}, {userLocation.city} • {userLocation.pincode}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLangModalVisible(true)}
          activeOpacity={0.7}
        >
          <Globe size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Active Token Sticky Banner */}
      {renderActiveTokenBanner()}

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={t.customer.searchPlaceholder}
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Chips Bar */}
      <View style={styles.categoriesSection}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContent}
          renderItem={({ item }) => renderCategoryChip(item)}
          keyExtractor={(item) => item.key}
        />
      </View>

      {/* Businesses List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.loadingText}>{t.common.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={businesses}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Sparkles size={48} color="#475569" />
              <Text style={styles.emptyTitle}>{t.customer.emptyBusinesses}</Text>
              <Text style={styles.emptySubtitle}>
                No businesses available right now. Tap below to seed demo Indian businesses for testing.
              </Text>
              <TouchableOpacity
                style={styles.seedBtn}
                onPress={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
              >
                {seedMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.seedBtnText}>Seed Demo Indian Businesses</Text>
                )}
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Language Modal */}
      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 48,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationTextWrapper: {
    marginLeft: 8,
    flex: 1,
  },
  locationLabel: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#F8FAFC',
  },
  langBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  activeBannerNormal: {
    backgroundColor: '#064E3B',
    borderColor: '#059669',
  },
  activeBannerNear: {
    backgroundColor: '#78350F',
    borderColor: '#D97706',
  },
  activeBannerServing: {
    backgroundColor: '#15803D',
    borderColor: '#22C55E',
  },
  activeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    color: '#34D399',
  },
  bannerInfo: {
    marginLeft: 10,
    flex: 1,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerTitleText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
  },
  bannerSubtitleText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 2,
  },
  trackLiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  trackLiveText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
    marginRight: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 13,
    marginLeft: 8,
  },
  categoriesSection: {
    marginBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryChipSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  categoryIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#94A3B8',
  },
  categoryLabelSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
    flexWrap: 'wrap',
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
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillOpen: {
    backgroundColor: '#064E3B',
  },
  pillClosed: {
    backgroundColor: '#450A0A',
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  textOpen: {
    color: '#34D399',
  },
  textClosed: {
    color: '#F87171',
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 10,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 20,
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
  seedBtn: {
    marginTop: 18,
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  seedBtnText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
  },
});
