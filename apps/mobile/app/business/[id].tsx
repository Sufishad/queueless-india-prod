import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Clock,
  Users,
  MapPin,
  CreditCard,
  Check,
  Calendar,
} from 'lucide-react-native';
import { useLanguageStore } from '../../src/store/useLanguageStore';
import { useRoleStore } from '../../src/store/useRoleStore';
import { translations } from '../../src/i18n/translations';
import { fetchBusinessDetail, ServiceItem } from '../../src/api/client';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentLanguage } = useLanguageStore();
  const t = translations[currentLanguage];
  const { savedBusinessIds, toggleSaveBusiness } = useRoleStore();

  const businessId = Array.isArray(id) ? id[0] : id || '';
  const isSaved = savedBusinessIds.includes(businessId);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const { data: business, isLoading, error } = useQuery({
    queryKey: ['business-detail', businessId],
    queryFn: () => fetchBusinessDetail(businessId),
    enabled: !!businessId,
  });

  // Set default service when services load
  React.useEffect(() => {
    if (business?.services && business.services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(business.services[0].id);
    }
  }, [business?.services, selectedServiceId]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>{t.common.loading}</Text>
      </View>
    );
  }

  if (error || !business) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Could not load business details.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t.common.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedService = business.services.find((s) => s.id === selectedServiceId) || business.services[0];
  const isQueueActive = business.queueStatus === 'ACTIVE';

  const handleJoinPress = () => {
    if (!selectedService) return;
    router.push({
      pathname: `/join/${business.id}` as any,
      params: { serviceId: selectedService.id },
    });
  };

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

        <Text style={styles.headerTitle} numberOfLines={1}>
          {business.name}
        </Text>

        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => toggleSaveBusiness(business.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Bookmark
            size={20}
            color={isSaved ? '#F59E0B' : '#94A3B8'}
            fill={isSaved ? '#F59E0B' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Business Title & Badges */}
        <View style={styles.profileSection}>
          <View style={styles.nameRow}>
            <Text style={styles.bizName}>{business.name}</Text>
            {business.verified && <CheckCircle2 size={18} color="#22C55E" />}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{business.category.toUpperCase()}</Text>
            </View>
            <View style={[styles.queuePill, isQueueActive ? styles.pillLive : styles.pillPaused]}>
              <Text style={[styles.queuePillText, isQueueActive ? styles.textLive : styles.textPaused]}>
                {isQueueActive ? '● Queue Open' : '● Queue Paused'}
              </Text>
            </View>
          </View>

          <View style={styles.infoLine}>
            <MapPin size={15} color="#94A3B8" />
            <Text style={styles.infoText}>{business.address}</Text>
          </View>

          {business.openingTime && business.closingTime && (
            <View style={styles.infoLine}>
              <Calendar size={15} color="#94A3B8" />
              <Text style={styles.infoText}>
                Open: {business.openingTime} - {business.closingTime}
              </Text>
            </View>
          )}

          {business.upiId && (
            <View style={styles.infoLine}>
              <CreditCard size={15} color="#94A3B8" />
              <Text style={styles.infoText}>UPI: {business.upiId}</Text>
            </View>
          )}
        </View>

        {/* Live Queue Status Board */}
        <View style={styles.queueBoard}>
          <Text style={styles.boardHeader}>LIVE QUEUE STATUS</Text>
          <View style={styles.boardGrid}>
            <View style={styles.boardCell}>
              <Text style={styles.boardCellLabel}>{t.queue.nowServing}</Text>
              <Text style={styles.boardServingNumber}>
                #{business.queueState?.currentToken ? String(business.queueState.currentToken).padStart(2, '0') : '--'}
              </Text>
            </View>

            <View style={styles.boardDivider} />

            <View style={styles.boardCell}>
              <Text style={styles.boardCellLabel}>People in Line</Text>
              <View style={styles.boardCellRow}>
                <Users size={16} color="#22C55E" />
                <Text style={styles.boardCellVal}>{business.queueState?.waitingCount || 0}</Text>
              </View>
            </View>

            <View style={styles.boardDivider} />

            <View style={styles.boardCell}>
              <Text style={styles.boardCellLabel}>Est. Wait</Text>
              <View style={styles.boardCellRow}>
                <Clock size={16} color="#38BDF8" />
                <Text style={styles.boardCellVal}>
                  ~{(business.queueState?.waitingCount || 0) * 10}m
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Services List Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>{t.customer.servicesOffered}</Text>

          {business.services.map((service) => {
            const isSelected = selectedServiceId === service.id;
            return (
              <TouchableOpacity
                key={service.id}
                style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                onPress={() => setSelectedServiceId(service.id)}
                activeOpacity={0.8}
              >
                <View style={styles.serviceLeft}>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <Check size={12} color="#FFFFFF" />}
                  </View>
                  <View style={styles.serviceDetails}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <View style={styles.serviceMeta}>
                      <Clock size={12} color="#94A3B8" />
                      <Text style={styles.serviceDuration}>
                        {service.estimatedDuration} mins
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.serviceRight}>
                  <Text style={styles.servicePrice}>
                    {service.price > 0 ? `₹${service.price.toFixed(0)}` : 'FREE'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky Bottom Join CTA Bar */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerSummary}>
          <Text style={styles.footerServiceLabel} numberOfLines={1}>
            {selectedService ? selectedService.name : 'Select a service'}
          </Text>
          <Text style={styles.footerPrice}>
            {selectedService && selectedService.price > 0 ? `₹${selectedService.price}` : 'Free'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.footerJoinBtn, !isQueueActive && styles.footerJoinBtnDisabled]}
          disabled={!isQueueActive}
          onPress={handleJoinPress}
          activeOpacity={0.85}
        >
          <Text style={styles.footerJoinBtnText}>{t.queue.joinQueue}</Text>
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
  errorText: {
    color: '#F87171',
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 16,
    backgroundColor: '#1E293B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  profileSection: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bizName: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F8FAFC',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  categoryPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryPillText: {
    color: '#38BDF8',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  queuePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillLive: {
    backgroundColor: '#064E3B',
  },
  pillPaused: {
    backgroundColor: '#450A0A',
  },
  queuePillText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  textLive: {
    color: '#34D399',
  },
  textPaused: {
    color: '#F87171',
  },
  infoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    flex: 1,
  },
  queueBoard: {
    backgroundColor: '#022C22',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#059669',
    marginBottom: 20,
  },
  boardHeader: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#34D399',
    letterSpacing: 1,
    marginBottom: 12,
  },
  boardGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boardCell: {
    flex: 1,
    alignItems: 'center',
  },
  boardCellLabel: {
    fontSize: 11,
    color: '#A7F3D0',
    fontFamily: 'PlusJakartaSans-Regular',
    marginBottom: 4,
  },
  boardServingNumber: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#38BDF8',
  },
  boardCellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  boardCellVal: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#F8FAFC',
  },
  boardDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#065F46',
  },
  servicesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  serviceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  serviceCardSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#132E27',
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E',
  },
  serviceDetails: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#F8FAFC',
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  serviceDuration: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#94A3B8',
  },
  serviceRight: {
    marginLeft: 12,
  },
  servicePrice: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#34D399',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerSummary: {
    flex: 1,
    marginRight: 12,
  },
  footerServiceLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#94A3B8',
  },
  footerPrice: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#22C55E',
  },
  footerJoinBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  footerJoinBtnDisabled: {
    backgroundColor: '#475569',
  },
  footerJoinBtnText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
  },
});
