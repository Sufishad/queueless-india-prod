import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Check, Globe, X } from 'lucide-react-native';
import { useLanguageStore } from '../store/useLanguageStore';
import { LanguageCode } from '../i18n/translations';

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  visible,
  onClose,
}) => {
  const { language, setLanguage, t } = useLanguageStore();

  const handleSelect = (lang: LanguageCode) => {
    Haptics.selectionAsync();
    setLanguage(lang);
    onClose();
  };

  const languagesList: { code: LanguageCode; label: string; subLabel: string }[] = [
    {
      code: 'hi',
      label: 'हिन्दी',
      subLabel: 'कतार, टोकन और सूचनाएं हिन्दी में',
    },
    {
      code: 'hinglish',
      label: 'Hinglish',
      subLabel: 'Mix of Hindi & English — Easy to read',
    },
    {
      code: 'en',
      label: 'English',
      subLabel: 'Standard English interface',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Globe size={20} color="#3B82F6" />
              </View>
              <Text style={styles.headerTitle}>{t.common.selectLanguage}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel={t.common.close}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            {languagesList.map((item) => {
              const isSelected = language === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.langItem,
                    isSelected && styles.langItemSelected,
                  ]}
                  onPress={() => handleSelect(item.code)}
                  activeOpacity={0.7}
                >
                  <View style={styles.langTextContainer}>
                    <Text
                      style={[
                        styles.langLabel,
                        isSelected && styles.langLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.langSubLabel}>{item.subLabel}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <Check size={16} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  closeButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  optionsContainer: {
    gap: 12,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  langItemSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  langTextContainer: {
    flex: 1,
  },
  langLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    fontFamily: 'PlusJakartaSans-SemiBold',
    marginBottom: 4,
  },
  langLabelSelected: {
    color: '#1D4ED8',
  },
  langSubLabel: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
