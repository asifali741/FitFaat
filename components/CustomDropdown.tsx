import { colorsSheet } from '@/app/(main)/(settings)/_ui_elements';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

interface DropdownOption {
  label: string;
  value: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder: string;
  label?: string;
  required?: boolean;
}

export default function CustomDropdown({
  options,
  selectedValue,
  onSelect,
  placeholder,
  label,
  required = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
  };

  const selectedOption = options.find(option => option.value === selectedValue);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[styles.dropdown, isOpen && styles.dropdownOpen]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={[
          styles.dropdownText,
          !selectedOption && styles.placeholderText
        ]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={20}
          color={colorsSheet.textSecondary}
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {label || 'Option'}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <Ionicons name="close" size={24} color={colorsSheet.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    selectedValue === item.value && styles.selectedOption
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedValue === item.value && styles.selectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                  {selectedValue === item.value && (
                    <Ionicons name="checkmark" size={20} color={colorsSheet.primary} />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: hp(2),
  },
  label: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: '600',
    color: colorsSheet.textPrimary,
    marginBottom: hp(1),
  },
  required: {
    color: colorsSheet.error,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colorsSheet.screenColor,
    borderWidth: 1,
    borderColor: colorsSheet.lightGray,
    borderRadius: 10,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    minHeight: hp(6),
  },
  dropdownOpen: {
    borderColor: colorsSheet.primary,
    borderWidth: 2,
  },
  dropdownText: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colorsSheet.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colorsSheet.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  modalContent: {
    backgroundColor: colorsSheet.screenColor,
    borderRadius: 15,
    width: '100%',
    maxHeight: hp(60),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: colorsSheet.lightGray,
  },
  modalTitle: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: 'bold',
    color: colorsSheet.textPrimary,
  },
  closeButton: {
    padding: wp(1),
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    borderBottomWidth: 1,
    borderBottomColor: colorsSheet.lightGray + '50',
  },
  selectedOption: {
    backgroundColor: colorsSheet.primarySoft,
  },
  optionText: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colorsSheet.textPrimary,
    flex: 1,
  },
  selectedOptionText: {
    color: colorsSheet.primary,
    fontWeight: '600',
  },
});
