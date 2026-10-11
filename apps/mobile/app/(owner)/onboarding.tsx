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
  MapPin,
  Clock,
  CreditCard,
  Tag,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useOwnerStore } from '../../src/store/useOwnerStore';
import { ownerOnboardBusiness } from '../../src/api/client';

const CATEGORIES = [
  { id: 'clinic', label: 'Doctor / Clinic', icon: '🩺' },
  { id: 'salon', label: 'Salon / Parlour', icon: '✂️' },
  { id: 'restaurant', label: 'Restaurant / Cafe', icon: '🍲' },
  { id: 'bank', label: 'Bank / Post Office', icon: '🏦' },
  { id: 'retail', label: 'Retail / Kirana', icon: '🛍️' },
  { id: 'services', label: 'Services Desk', icon: '⚙️' },
];

export default function MerchantOnboardingScreen() {
  const router = useRouter();
  const { ownerToken, setBusinessId } = useOwnerStore();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1: Business Details
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState('clinic');
  const [description, setDescription] = useState('');

  // Step 2: Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [pincode, setPincode] = useState('110001');

  // Step 3: Payments & Hours
  const [upiId, setUpiId] = useState('');
  const [opensAt, setOpensAt] = useState('09:00 AM');
  const [closesAt, setClosesAt] = useState('08:00 PM');

  // Step 4: Initial Services
  const [services, setServices] = useState([
    { name: 'Standard Consultation', price: '200', duration_min: '15' },
    { name: 'Quick Checkup / Follow-up', price: '100', duration_min: '10' },
  ]);

  const handleAddService = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setServices([...services, { name: '', price: '150', duration_min: '15' }]);
  };

  const handleRemoveService = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (services.length <= 1) return;
    setServices(services.filter((_, i) => i !== index));
  };

  const updateService = (index: number, field: string, val: string) => {
    const updated = [...services];
    (updated[index] as any)[field] = val;
    setServices(updated);
  };

  const handleNextStep = () => {
    setErrorMsg('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (step === 1) {
      if (!shopName.trim()) {
        setErrorMsg('Please enter your business or shop name');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!address.trim()) {
        setErrorMsg('Please enter your physical street address');
        return;
      }
      if (!pincode.trim() || pincode.length !== 6) {
        setErrorMsg('Please enter a valid 6-digit Indian pincode');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!upiId.trim() || !upiId.includes('@')) {
        setErrorMsg('Please enter a valid Merchant UPI ID (e.g. shop@okaxis or name@upi)');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      handleSubmitOnboarding();
    }
  };

  const handleSubmitOnboarding = async () => {
    if (!ownerToken) {
      setErrorMsg('Owner session expired. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const formattedServices = services
        .filter((s) => s.name.trim().length > 0)
        .map((s) => ({
          name: s.name.trim(),
          price: parseFloat(s.price) || 0,
          duration_min: parseInt(s.duration_min, 10) || 15,
        }));

      const res = await ownerOnboardBusiness(ownerToken, {
        shop_name: shopName.trim(),
        category,
        description: description.trim() || `${category} service center`,
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        upi_id: upiId.trim(),
        opens_at: opensAt,
        closes_at: closesAt,
        services: formattedServices.length > 0 ? formattedServices : undefined,
      });

      setBusinessId(res.businessId);
      router.replace('/(owner)/dashboard' as any);
    } catch (err: any) {
      setErrorMsg(err.message || 'Onboarding failed. Please try again.');
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
            <View style={styles.stepIndicator}>
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepBar,
                    s <= step && styles.stepBarActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.stepTitle}>
              Step {step} of 4: {
                step === 1 ? 'Business Identity' :
                step === 2 ? 'Shop Location' :
                step === 3 ? 'Payments & Timing' :
                'Services & Pricing'
              }
            </Text>
            <Text style={styles.stepSubtitle}>
              2-Minute Quick Merchant Setup for QueueLess India
            </Text>
          </View>

          {/* Step 1: Business Identity */}
          {step === 1 && (
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Shop / Business Name *</Text>
                <View style={styles.inputBox}>
                  <Store size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Sharma Family Health Clinic"
                    placeholderTextColor="#475569"
                    value={shopName}
                    onChangeText={setShopName}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.catCard,
                        category === cat.id && styles.catCardActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCategory(cat.id);
                      }}
                    >
                      <Text style={styles.catIcon}>{cat.icon}</Text>
                      <Text
                        style={[
                          styles.catLabel,
                          category === cat.id && styles.catLabelActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Short Description (Optional)</Text>
                <View style={[styles.inputBox, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
                  <TextInput
                    style={[styles.input, { height: 60 }]}
                    placeholder="Specialty, landmark or services provided..."
                    placeholderTextColor="#475569"
                    multiline
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Location */}
          {step === 2 && (
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Street Address & Landmark *</Text>
                <View style={[styles.inputBox, { height: 75, alignItems: 'flex-start', paddingTop: 12 }]}>
                  <MapPin size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { height: 55 }]}
                    placeholder="Shop No. 4, Ground Floor, Market Road..."
                    placeholderTextColor="#475569"
                    multiline
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>City *</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.input}
                      placeholder="City"
                      placeholderTextColor="#475569"
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>6-Digit Pincode *</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.input}
                      placeholder="110001"
                      placeholderTextColor="#475569"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={pincode}
                      onChangeText={setPincode}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Step 3: Payments & Hours */}
          {step === 3 && (
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Merchant UPI ID (For Acrylic Standee QR) *</Text>
                <View style={styles.inputBox}>
                  <CreditCard size={18} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. sharmaclinic@okaxis or shop@upi"
                    placeholderTextColor="#475569"
                    autoCapitalize="none"
                    value={upiId}
                    onChangeText={setUpiId}
                  />
                </View>
                <Text style={styles.hint}>
                  Customers can scan your Standee QR to join the queue and pay fees directly to your UPI.
                </Text>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Opens At</Text>
                  <View style={styles.inputBox}>
                    <Clock size={16} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={opensAt}
                      onChangeText={setOpensAt}
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Closes At</Text>
                  <View style={styles.inputBox}>
                    <Clock size={16} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={closesAt}
                      onChangeText={setClosesAt}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Step 4: Initial Services */}
          {step === 4 && (
            <View style={styles.formSection}>
              <Text style={styles.label}>Services & Fee Structure (Customizable later)</Text>
              {services.map((svc, idx) => (
                <View key={idx} style={styles.serviceItemCard}>
                  <View style={styles.serviceItemHeader}>
                    <Text style={styles.serviceNum}>Service #{idx + 1}</Text>
                    {services.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveService(idx)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TextInput
                    style={styles.serviceInput}
                    placeholder="Service name (e.g. Consultation)"
                    placeholderTextColor="#475569"
                    value={svc.name}
                    onChangeText={(val) => updateService(idx, 'name', val)}
                  />

                  <View style={styles.row}>
                    <View style={[styles.serviceRowField, { flex: 1 }]}>
                      <Text style={styles.fieldSmallLabel}>Fee (₹)</Text>
                      <TextInput
                        style={styles.serviceSmallInput}
                        placeholder="200"
                        placeholderTextColor="#475569"
                        keyboardType="numeric"
                        value={svc.price}
                        onChangeText={(val) => updateService(idx, 'price', val)}
                      />
                    </View>
                    <View style={[styles.serviceRowField, { flex: 1 }]}>
                      <Text style={styles.fieldSmallLabel}>Est. Time (Mins)</Text>
                      <TextInput
                        style={styles.serviceSmallInput}
                        placeholder="15"
                        placeholderTextColor="#475569"
                        keyboardType="numeric"
                        value={svc.duration_min}
                        onChangeText={(val) => updateService(idx, 'duration_min', val)}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addServiceBtn}
                onPress={handleAddService}
              >
                <Plus size={16} color="#3B82F6" />
                <Text style={styles.addServiceText}>Add Another Service</Text>
              </TouchableOpacity>
            </View>
          )}

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Navigation Controls */}
          <View style={styles.actionsRow}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.backStepBtn}
                onPress={() => {
                  setErrorMsg('');
                  setStep(step - 1);
                }}
              >
                <ArrowLeft size={18} color="#94A3B8" />
                <Text style={styles.backStepText}>Previous</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.nextStepBtn,
                step === 1 && { flex: 1 },
                loading && styles.btnDisabled,
              ]}
              onPress={handleNextStep}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.nextStepText}>
                    {step === 4 ? 'Launch Business Console' : 'Continue'}
                  </Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E293B',
  },
  stepBarActive: {
    backgroundColor: '#3B82F6',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  formSection: {
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
  hint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCard: {
    width: '48%',
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#24324D',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  catIcon: {
    fontSize: 18,
  },
  catLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  catLabelActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceItemCard: {
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#24324D',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  serviceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceNum: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700',
  },
  serviceInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#F8FAFC',
    fontSize: 14,
  },
  serviceRowField: {
    gap: 4,
  },
  fieldSmallLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  serviceSmallInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    color: '#F8FAFC',
    fontSize: 14,
  },
  addServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addServiceText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  backStepBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backStepText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  nextStepBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  nextStepText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
