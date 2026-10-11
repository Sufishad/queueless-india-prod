import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import {
  Printer,
  Share2,
  Sparkles,
  Store,
  Check,
  Palette,
  Layout,
  Download,
} from 'lucide-react-native';
import { useOwnerStore } from '../../src/store/useOwnerStore';
import { fetchBusinessDetail, BusinessDetail } from '../../src/api/client';

const THEMES = [
  {
    id: 'blue',
    name: 'QueueLess Blue',
    primary: '#2563EB',
    bg: '#0F172A',
    accent: '#60A5FA',
    textColor: '#FFFFFF',
    border: '#3B82F6',
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    primary: '#7C3AED',
    bg: '#1A0B2E',
    accent: '#A78BFA',
    textColor: '#FFFFFF',
    border: '#8B5CF6',
  },
  {
    id: 'slate',
    name: 'Obsidian Slate',
    primary: '#475569',
    bg: '#020617',
    accent: '#CBD5E1',
    textColor: '#FFFFFF',
    border: '#64748B',
  },
  {
    id: 'green',
    name: 'Ayurveda Green',
    primary: '#059669',
    bg: '#042217',
    accent: '#34D399',
    textColor: '#FFFFFF',
    border: '#10B981',
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    primary: '#D97706',
    bg: '#251403',
    accent: '#FBBF24',
    textColor: '#FFFFFF',
    border: '#F59E0B',
  },
];

const COUNTER_PRESETS = ['Counter 1', 'Reception', 'Billing Desk', 'Main Entrance'];

export default function StandeeQRDesignerScreen() {
  const { businessId, owner } = useOwnerStore();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [counterLabel, setCounterLabel] = useState('Counter 1');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (businessId) {
      loadBusiness();
    }
  }, [businessId]);

  const loadBusiness = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const data = await fetchBusinessDetail(businessId);
      setBusiness(data);
    } catch (err) {
      console.log('Error loading business for QR:', err);
    } finally {
      setLoading(false);
    }
  };

  const qrPayloadUrl = `https://queueless.in/join/${businessId || 'demo'}`;
  const shopName = business?.name || owner?.name || 'Local Merchant Clinic';
  const shopAddress = business?.address || 'Main Market, City';
  const upiId = business?.upiId || 'merchant@okaxis';

  // Generate HTML for High-Res Print / PDF Export
  const generateStandeeHtml = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 40px;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: #f1f5f9;
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            }
            .standee-card {
              width: 520px;
              background: ${selectedTheme.bg};
              color: ${selectedTheme.textColor};
              border: 8px solid ${selectedTheme.border};
              border-radius: 32px;
              padding: 40px 36px;
              text-align: center;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            .brand-badge {
              display: inline-block;
              background: ${selectedTheme.primary};
              color: white;
              font-weight: 800;
              font-size: 13px;
              letter-spacing: 2px;
              text-transform: uppercase;
              padding: 8px 18px;
              border-radius: 20px;
              margin-bottom: 24px;
            }
            .shop-title {
              font-size: 32px;
              font-weight: 900;
              margin: 0 0 8px 0;
              line-height: 1.2;
              color: #ffffff;
            }
            .counter-pill {
              display: inline-block;
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              color: ${selectedTheme.accent};
              font-size: 16px;
              font-weight: 700;
              padding: 6px 16px;
              border-radius: 12px;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              background: #ffffff;
              padding: 24px;
              border-radius: 24px;
              display: inline-block;
              margin: 12px 0 24px 0;
              box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            }
            .qr-img {
              width: 260px;
              height: 260px;
            }
            .scan-instructions {
              font-size: 20px;
              font-weight: 800;
              color: #ffffff;
              margin-bottom: 6px;
            }
            .hindi-instruction {
              font-size: 16px;
              color: ${selectedTheme.accent};
              font-weight: 600;
              margin-bottom: 20px;
            }
            .upi-section {
              background: rgba(255, 255, 255, 0.08);
              border-radius: 16px;
              padding: 14px;
              margin-top: 16px;
              border: 1px dashed rgba(255, 255, 255, 0.2);
            }
            .upi-label {
              font-size: 11px;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .upi-val {
              font-size: 15px;
              font-weight: 700;
              color: #38bdf8;
            }
            .footer-guarantee {
              font-size: 12px;
              color: #94a3b8;
              margin-top: 24px;
            }
          </style>
        </head>
        <body>
          <div class="standee-card">
            <div class="brand-badge">⚡ QueueLess India</div>
            <h1 class="shop-title">${shopName}</h1>
            <div class="counter-pill">${counterLabel}</div>
            
            <div class="qr-wrapper">
              <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayloadUrl)}" alt="QR Code" />
            </div>

            <div class="scan-instructions">Scan with Any Camera or Google Lens</div>
            <div class="hindi-instruction">कतार में जुड़ने के लिए QR स्कैन करें • ज़ीरो OTP</div>

            <div class="upi-section">
              <div class="upi-label">Direct UPI Payments Accepted</div>
              <div class="upi-val">${upiId}</div>
            </div>

            <div class="footer-guarantee">
              Time par, line mein nahi. Powered by QueueLess
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPDF = async () => {
    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const html = generateStandeeHtml();
      const { uri } = await Print.printToFileAsync({
        html,
        width: 595,
        height: 842,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: `${shopName} - Standee QR`,
        });
      } else {
        Alert.alert('PDF Generated', `Standee PDF saved to: ${uri}`);
      }
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Could not export standee PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleDirectPrint = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const html = generateStandeeHtml();
      await Print.printAsync({ html });
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Printer unavailable');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Acrylic Standee Designer</Text>
          <Text style={styles.headerSubtitle}>
            Counter Standee QR with Zero-OTP Instant Booking
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.exportBtn, exporting && { opacity: 0.6 }]}
          onPress={handleExportPDF}
          disabled={exporting}
          activeOpacity={0.8}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Download size={16} color="#FFFFFF" />
              <Text style={styles.exportBtnText}>PDF Export</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Picker */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Palette size={16} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Select Theme (5 Colors)</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themeScroll}
          >
            {THEMES.map((theme) => {
              const isSelected = selectedTheme.id === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[
                    styles.themeCard,
                    { backgroundColor: theme.bg, borderColor: theme.border },
                    isSelected && styles.themeCardSelected,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedTheme(theme);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.colorDot, { backgroundColor: theme.primary }]} />
                  <Text style={styles.themeName}>{theme.name}</Text>
                  {isSelected && (
                    <View style={styles.selectedTick}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Counter Presets */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Layout size={16} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Counter / Desk Name</Text>
          </View>
          <View style={styles.presetPillsRow}>
            {COUNTER_PRESETS.map((preset) => {
              const isSelected = counterLabel === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetPill,
                    isSelected && styles.presetPillActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCounterLabel(preset);
                  }}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      isSelected && styles.presetPillTextActive,
                    ]}
                  >
                    {preset}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={styles.customCounterInput}
            value={counterLabel}
            onChangeText={setCounterLabel}
            placeholder="Or type custom counter name..."
            placeholderTextColor="#475569"
          />
        </View>

        {/* LIVE STANDEE PREVIEW CARD */}
        <View style={styles.previewContainer}>
          <Text style={styles.previewHeading}>STAND PREVIEW (ACRYLIC A4 / 5x7)</Text>

          <View
            style={[
              styles.standeeCard,
              {
                backgroundColor: selectedTheme.bg,
                borderColor: selectedTheme.border,
              },
            ]}
          >
            {/* Brand Header */}
            <View
              style={[
                styles.brandBadge,
                { backgroundColor: selectedTheme.primary },
              ]}
            >
              <Sparkles size={12} color="#FFFFFF" />
              <Text style={styles.brandBadgeText}>QueueLess India</Text>
            </View>

            {/* Shop Name */}
            <Text style={styles.standeeShopName} numberOfLines={2}>
              {shopName}
            </Text>

            {/* Counter Pill */}
            <View style={styles.standeeCounterPill}>
              <Text style={[styles.standeeCounterText, { color: selectedTheme.accent }]}>
                {counterLabel.toUpperCase()}
              </Text>
            </View>

            {/* High-Resolution QR Code */}
            <View style={styles.qrCodeWrapper}>
              <QRCode
                value={qrPayloadUrl}
                size={180}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>

            {/* Bilingual Instructions */}
            <Text style={styles.standeeScanEng}>
              Scan with Any Mobile Camera
            </Text>
            <Text style={[styles.standeeScanHindi, { color: selectedTheme.accent }]}>
              कतार में शामिल होने के लिए स्कैन करें (Zero OTP)
            </Text>

            {/* UPI ID Banner */}
            <View style={styles.upiBanner}>
              <Text style={styles.upiLabelText}>MERCHANT UPI ID</Text>
              <Text style={styles.upiValueText}>{upiId}</Text>
            </View>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={styles.printActionBtn}
            onPress={handleDirectPrint}
            activeOpacity={0.8}
          >
            <Printer size={18} color="#FFFFFF" />
            <Text style={styles.printActionText}>Direct Print</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareActionBtn}
            onPress={handleExportPDF}
            activeOpacity={0.8}
          >
            <Share2 size={18} color="#FFFFFF" />
            <Text style={styles.shareActionText}>Share PDF</Text>
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
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  section: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  themeScroll: {
    gap: 10,
    paddingRight: 10,
  },
  themeCard: {
    width: 130,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    gap: 8,
    position: 'relative',
  },
  themeCardSelected: {
    borderColor: '#38BDF8',
    transform: [{ scale: 1.02 }],
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  themeName: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  selectedTick: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetPillActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  presetPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  presetPillTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  customCounterInput: {
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: '#24324D',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    color: '#F8FAFC',
    fontSize: 13,
  },
  previewContainer: {
    alignItems: 'center',
    gap: 12,
  },
  previewHeading: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  standeeCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 4,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  brandBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  standeeShopName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  standeeCounterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 16,
  },
  standeeCounterText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrCodeWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  standeeScanEng: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  standeeScanHindi: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  upiBanner: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  upiLabelText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  upiValueText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  printActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  printActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shareActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
