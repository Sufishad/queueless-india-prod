import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  UserPlus,
  RotateCcw,
  CreditCard,
  Banknote,
  Clock,
  Phone,
  CheckCircle2,
  X,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import { useOwnerStore } from '../../src/store/useOwnerStore';
import {
  fetchOwnerLiveQueue,
  createWalkInToken,
  ownerUpdatePayment,
  ownerResetDailyQueue,
  fetchOwnerServices,
  OwnerQueueEntry,
  ServiceItem,
} from '../../src/api/client';
import { playSuccessAlert } from '../../src/utils/audioAlert';

export default function QueueManagementScreen() {
  const { ownerToken, businessId } = useOwnerStore();

  const [queueEntries, setQueueEntries] = useState<OwnerQueueEntry[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Walk-in Modal State
  const [walkInModalVisible, setWalkInModalVisible] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInMobile, setWalkInMobile] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [walkInLoading, setWalkInLoading] = useState(false);

  // Daily Reset Modal State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (businessId && ownerToken) {
      loadData();
    }
  }, [businessId, ownerToken]);

  const loadData = async () => {
    if (!businessId || !ownerToken) return;
    try {
      setLoading(true);
      const [qData, sData] = await Promise.all([
        fetchOwnerLiveQueue(ownerToken, businessId),
        fetchOwnerServices(businessId).catch(() => []),
      ]);
      setQueueEntries(qData);
      setServices(sData);
      if (sData.length > 0 && !selectedServiceId) {
        setSelectedServiceId(sData[0].id);
      }
    } catch (err) {
      console.log('Error loading queue:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Toggle Payment Status Cycle: UNPAID -> PAID (CASH) -> PAID (UPI) -> UNPAID
  const handleTogglePayment = async (entry: OwnerQueueEntry) => {
    if (!ownerToken) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let nextStatus: 'PAID' | 'UNPAID' = 'PAID';
    let nextMode: 'CASH' | 'UPI' = 'CASH';

    if (entry.paymentStatus === 'UNPAID') {
      nextStatus = 'PAID';
      nextMode = 'CASH';
    } else if (entry.paymentStatus === 'PAID' && entry.paymentMode === 'CASH') {
      nextStatus = 'PAID';
      nextMode = 'UPI';
    } else {
      nextStatus = 'UNPAID';
      nextMode = 'CASH';
    }

    // Optimistic UI update
    setQueueEntries((prev) =>
      prev.map((item) =>
        item.entryId === entry.entryId
          ? { ...item, paymentStatus: nextStatus, paymentMode: nextMode }
          : item
      )
    );

    try {
      await ownerUpdatePayment(ownerToken, entry.entryId, nextStatus, nextMode);
    } catch {
      // Revert if API fails
      loadData();
    }
  };

  // Walk-in Token Creation
  const handleCreateWalkIn = async () => {
    if (!walkInName.trim()) {
      Alert.alert('Required', 'Please enter the walk-in customer name');
      return;
    }
    if (!businessId) return;

    setWalkInLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await createWalkInToken(businessId, {
        customerName: walkInName.trim(),
        customerMobile: walkInMobile.trim() || undefined,
        serviceId: selectedServiceId || undefined,
      });

      await playSuccessAlert();
      setWalkInModalVisible(false);
      setWalkInName('');
      setWalkInMobile('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create walk-in token');
    } finally {
      setWalkInLoading(false);
    }
  };

  // Safe End-of-Day Queue Reset
  const handleConfirmReset = async () => {
    if (!businessId || !ownerToken) return;
    setResetLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await ownerResetDailyQueue(ownerToken, businessId);
      setResetModalVisible(false);
      loadData();
      Alert.alert('Success', 'Queue counter reset to #0 for the new business day.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reset queue');
    } finally {
      setResetLoading(false);
    }
  };

  const renderQueueItem = ({ item }: { item: OwnerQueueEntry }) => {
    const isServing = item.status.toUpperCase() === 'SERVING';

    return (
      <View style={[styles.entryCard, isServing && styles.entryCardServing]}>
        {/* Token Column */}
        <View style={styles.entryTokenBox}>
          <Text style={[styles.entryTokenText, isServing && styles.entryTokenTextServing]}>
            #{item.tokenNumber}
          </Text>
          <Text style={styles.entryTokenStatus}>
            {isServing ? 'SERVING' : 'WAITING'}
          </Text>
        </View>

        {/* Customer Details */}
        <View style={styles.entryDetails}>
          <Text style={styles.entryCustomerName}>{item.customerName}</Text>
          <View style={styles.entryMetaRow}>
            <Phone size={12} color="#64748B" />
            <Text style={styles.entryPhoneText}>{item.maskedMobile || 'Walk-in'}</Text>
            <Clock size={12} color="#64748B" style={{ marginLeft: 6 }} />
            <Text style={styles.entryWaitText}>{item.waitTimeMin}m wait</Text>
          </View>
          <Text style={styles.entryServiceName}>
            {item.serviceName} • ₹{item.servicePrice}
          </Text>
        </View>

        {/* Payment Toggle Pill */}
        <TouchableOpacity
          style={[
            styles.paymentTogglePill,
            item.paymentStatus === 'PAID'
              ? item.paymentMode === 'UPI'
                ? styles.pillPaidUPI
                : styles.pillPaidCash
              : styles.pillUnpaid,
          ]}
          onPress={() => handleTogglePayment(item)}
          activeOpacity={0.7}
        >
          {item.paymentStatus === 'PAID' ? (
            item.paymentMode === 'UPI' ? (
              <CreditCard size={12} color="#10B981" />
            ) : (
              <Banknote size={12} color="#10B981" />
            )
          ) : (
            <AlertTriangle size={12} color="#EF4444" />
          )}
          <Text
            style={[
              styles.paymentToggleText,
              item.paymentStatus === 'PAID' ? styles.textPaid : styles.textUnpaid,
            ]}
          >
            {item.paymentStatus === 'PAID' ? item.paymentMode : 'UNPAID'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Queue List</Text>
          <Text style={styles.headerSubtitle}>
            {queueEntries.length} Customer(s) in active queue
          </Text>
        </View>

        <View style={styles.headerActions}>
          {/* Walk-in Modal Trigger */}
          <TouchableOpacity
            style={styles.walkInBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setWalkInModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <UserPlus size={16} color="#FFFFFF" />
            <Text style={styles.walkInBtnText}>+ Walk-in</Text>
          </TouchableOpacity>

          {/* Daily Reset Trigger */}
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setResetModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <RotateCcw size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={queueEntries}
          keyExtractor={(item) => item.entryId}
          renderItem={renderQueueItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3B82F6"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={48} color="#334155" />
              <Text style={styles.emptyTitle}>No Customers in Queue</Text>
              <Text style={styles.emptySubtitle}>
                Add senior walk-ins via the "+ Walk-in" button or wait for customers to scan your Standee QR.
              </Text>
            </View>
          }
        />
      )}

      {/* WALK-IN TOKEN MODAL */}
      <Modal
        visible={walkInModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWalkInModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalBadge}>
                <Sparkles size={14} color="#3B82F6" />
                <Text style={styles.modalBadgeText}>INSTANT WALK-IN</Text>
              </View>
              <TouchableOpacity onPress={() => setWalkInModalVisible(false)}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>Issue Walk-in Token</Text>
            <Text style={styles.modalSubtitle}>
              For senior citizens and walk-ins without a smartphone.
            </Text>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Ram Lal Sharma"
                  placeholderTextColor="#475569"
                  value={walkInName}
                  onChangeText={setWalkInName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mobile (Optional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Optional 10-digit mobile"
                  placeholderTextColor="#475569"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={walkInMobile}
                  onChangeText={setWalkInMobile}
                />
              </View>

              {services.length > 0 && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Select Service</Text>
                  <View style={styles.servicePillContainer}>
                    {services.map((svc) => (
                      <TouchableOpacity
                        key={svc.id}
                        style={[
                          styles.servicePill,
                          selectedServiceId === svc.id && styles.servicePillActive,
                        ]}
                        onPress={() => setSelectedServiceId(svc.id)}
                      >
                        <Text
                          style={[
                            styles.servicePillText,
                            selectedServiceId === svc.id && styles.servicePillTextActive,
                          ]}
                        >
                          {svc.name} (₹{svc.price})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalSubmitBtn, walkInLoading && { opacity: 0.6 }]}
                onPress={handleCreateWalkIn}
                disabled={walkInLoading}
                activeOpacity={0.8}
              >
                {walkInLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Generate Token Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DAILY QUEUE RESET MODAL */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: '#EF4444' }]}>
            <View style={[styles.modalBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <AlertTriangle size={14} color="#EF4444" />
              <Text style={[styles.modalBadgeText, { color: '#EF4444' }]}>END OF DAY</Text>
            </View>

            <Text style={styles.modalTitle}>Reset Queue to #0?</Text>
            <Text style={styles.modalSubtitle}>
              This will reset the token counter back to #0 for tomorrow's business day and archive any unserved tokens.
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dangerBtn, resetLoading && { opacity: 0.6 }]}
                onPress={handleConfirmReset}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.dangerBtnText}>Yes, Reset Queue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  walkInBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#24324D',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  entryCardServing: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  entryTokenBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    width: 60,
    height: 60,
  },
  entryTokenText: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '900',
  },
  entryTokenTextServing: {
    color: '#3B82F6',
  },
  entryTokenStatus: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  entryDetails: {
    flex: 1,
    gap: 4,
  },
  entryCustomerName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryPhoneText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  entryWaitText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '600',
  },
  entryServiceName: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '500',
  },
  paymentTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillPaidCash: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pillPaidUPI: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  pillUnpaid: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  paymentToggleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textPaid: {
    color: '#10B981',
  },
  textUnpaid: {
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  modalBadgeText: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: '800',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  modalForm: {
    gap: 14,
    marginTop: 6,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    color: '#F8FAFC',
    fontSize: 14,
  },
  servicePillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  servicePill: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  servicePillActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  servicePillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  servicePillTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: '#2563EB',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
