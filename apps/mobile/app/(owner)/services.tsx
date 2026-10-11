import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Plus,
  Clock,
  Edit2,
  Tag,
  CheckCircle2,
  X,
  Sparkles,
  IndianRupee,
} from 'lucide-react-native';
import { useOwnerStore } from '../../src/store/useOwnerStore';
import {
  fetchOwnerServices,
  createOwnerService,
  updateOwnerService,
  ServiceItem,
} from '../../src/api/client';

export default function ServicesManagementScreen() {
  const { ownerToken, businessId } = useOwnerStore();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State for Add / Edit
  const [modalVisible, setModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationMin, setDurationMin] = useState('15');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (businessId) {
      loadServices();
    }
  }, [businessId]);

  const loadServices = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const data = await fetchOwnerServices(businessId);
      setServices(data);
    } catch (err) {
      console.log('Error loading services:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const openAddModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingServiceId(null);
    setName('');
    setPrice('');
    setDurationMin('15');
    setDescription('');
    setModalVisible(true);
  };

  const openEditModal = (svc: ServiceItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingServiceId(svc.id);
    setName(svc.name);
    setPrice(svc.price.toString());
    setDurationMin((svc.duration_min ?? svc.estimatedDuration ?? 15).toString());
    setDescription(svc.description || '');
    setModalVisible(true);
  };

  const handleToggleActive = async (svc: ServiceItem) => {
    if (!ownerToken || !businessId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentActive = svc.is_active ?? svc.active ?? true;
    const newActive = !currentActive;

    // Optimistic UI update
    setServices((prev) =>
      prev.map((s) => (s.id === svc.id ? { ...s, is_active: newActive, active: newActive } : s))
    );

    try {
      await updateOwnerService(ownerToken, businessId, svc.id, {
        is_active: newActive,
      });
    } catch {
      loadServices();
    }
  };

  const handleSaveService = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter service name');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Required', 'Please enter a valid price');
      return;
    }
    const durNum = parseInt(durationMin, 10) || 15;

    if (!ownerToken || !businessId) return;

    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (editingServiceId) {
        await updateOwnerService(ownerToken, businessId, editingServiceId, {
          name: name.trim(),
          price: priceNum,
          duration_min: durNum,
          is_active: true,
        });
      } else {
        await createOwnerService(ownerToken, businessId, {
          name: name.trim(),
          price: priceNum,
          duration_min: durNum,
          description: description.trim() || undefined,
        });
      }

      setModalVisible(false);
      loadServices();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const renderServiceCard = ({ item }: { item: ServiceItem }) => {
    const isActive = item.is_active ?? item.active ?? true;
    const duration = item.duration_min ?? item.estimatedDuration ?? 15;

    return (
      <View style={[styles.serviceCard, !isActive && styles.serviceCardInactive]}>
        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <Text style={styles.serviceName}>{item.name}</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => openEditModal(item)}
            >
              <Edit2 size={15} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {item.description ? (
            <Text style={styles.serviceDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>₹{item.price}</Text>
            </View>

            <View style={styles.durationBadge}>
              <Clock size={12} color="#64748B" />
              <Text style={styles.durationText}>{duration} mins</Text>
            </View>

            <View style={styles.switchWrapper}>
              <Text style={styles.switchLabel}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
              <Switch
                value={isActive}
                onValueChange={() => handleToggleActive(item)}
                trackColor={{ false: '#334155', true: '#2563EB' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Services & Pricing</Text>
          <Text style={styles.headerSubtitle}>
            Configure token fees and service durations
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={openAddModal}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Service</Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={renderServiceCard}
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
              <Tag size={44} color="#334155" />
              <Text style={styles.emptyTitle}>No Services Added Yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your consultation fees or services so customers know what to book.
              </Text>
            </View>
          }
        />
      )}

      {/* ADD / EDIT MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalBadge}>
                <Sparkles size={14} color="#3B82F6" />
                <Text style={styles.modalBadgeText}>
                  {editingServiceId ? 'EDIT SERVICE' : 'NEW SERVICE'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>
              {editingServiceId ? 'Edit Service' : 'Add New Service'}
            </Text>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Service Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Haircut & Beard Trim"
                  placeholderTextColor="#475569"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Fee in ₹ *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="250"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Est. Duration (Mins)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="20"
                    placeholderTextColor="#475569"
                    keyboardType="numeric"
                    value={durationMin}
                    onChangeText={setDurationMin}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60 }]}
                  placeholder="Brief note about this service..."
                  placeholderTextColor="#475569"
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSaveService}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingServiceId ? 'Save Changes' : 'Create Service'}
                  </Text>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  serviceCard: {
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#24324D',
    borderRadius: 16,
    padding: 14,
  },
  serviceCardInactive: {
    opacity: 0.6,
  },
  cardMain: {
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  editBtn: {
    padding: 4,
  },
  serviceDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  priceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 'auto',
  },
  switchLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
