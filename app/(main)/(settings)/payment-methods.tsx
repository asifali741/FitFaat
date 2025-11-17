import AppHeader from "@/components/AppHeader";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { colorsSheet } from "./_ui_elements";

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4: string;
  brand?: string;
  bankName?: string;
  isDefault: boolean;
  expiryMonth?: string;
  expiryYear?: string;
}

export default function PaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      isDefault: true,
      expiryMonth: '12',
      expiryYear: '25'
    },
    {
      id: '2',
      type: 'card',
      last4: '5555',
      brand: 'Mastercard',
      isDefault: false,
      expiryMonth: '08',
      expiryYear: '24'
    }
  ]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    zipCode: ''
  });

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳'; // In real app, use actual Visa logo
      case 'mastercard':
        return '💳'; // In real app, use actual Mastercard logo
      case 'amex':
        return '💳'; // In real app, use actual Amex logo
      default:
        return '💳';
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validateCard = () => {
    if (cardDetails.cardNumber.replace(/\s/g, '').length !== 16) {
      Alert.alert("Invalid Card", "Please enter a valid 16-digit card number");
      return false;
    }
    if (cardDetails.expiryDate.length !== 5) {
      Alert.alert("Invalid Expiry", "Please enter expiry date in MM/YY format");
      return false;
    }
    if (cardDetails.cvv.length < 3) {
      Alert.alert("Invalid CVV", "Please enter a valid CVV");
      return false;
    }
    if (cardDetails.cardholderName.length < 3) {
      Alert.alert("Invalid Name", "Please enter the cardholder name");
      return false;
    }
    return true;
  };

  const handleAddCard = () => {
    if (!validateCard()) return;
    
    // Simulate adding card via Stripe
    Alert.alert(
      "Add Card",
      "This would connect to Stripe to securely save your card. For demo purposes, the card will be added to the list.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Add Card", 
          onPress: () => {
            const newCard: PaymentMethod = {
              id: Date.now().toString(),
              type: 'card',
              last4: cardDetails.cardNumber.slice(-4),
              brand: 'Visa', // Detect from card number in real app
              isDefault: paymentMethods.length === 0,
              expiryMonth: cardDetails.expiryDate.split('/')[0],
              expiryYear: cardDetails.expiryDate.split('/')[1]
            };
            
            setPaymentMethods([...paymentMethods, newCard]);
            setShowAddModal(false);
            setCardDetails({
              cardNumber: '',
              expiryDate: '',
              cvv: '',
              cardholderName: '',
              zipCode: ''
            });
          }
        }
      ]
    );
  };

  const handleSetDefault = (id: string) => {
    setPaymentMethods(methods => 
      methods.map(method => ({
        ...method,
        isDefault: method.id === id
      }))
    );
    Alert.alert("Success", "Default payment method updated");
  };

  const handleDeleteCard = (id: string) => {
    Alert.alert(
      "Remove Card",
      "Are you sure you want to remove this payment method?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => {
            setPaymentMethods(methods => methods.filter(m => m.id !== id));
          }
        }
      ]
    );
  };

  const PaymentCard = ({ method }: { method: PaymentMethod }) => (
    <View style={styles.paymentCard}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardIcon}>{getCardIcon(method.brand)}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.cardBrand}>
            {method.brand} •••• {method.last4}
          </Text>
          <Text style={styles.cardExpiry}>
            Expires {method.expiryMonth}/{method.expiryYear}
          </Text>
          {method.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardActions}>
        {!method.isDefault && (
          <TouchableOpacity onPress={() => handleSetDefault(method.id)}>
            <Text style={styles.setDefaultText}>Set Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleDeleteCard(method.id)}>
          <Ionicons name="trash-outline" size={20} color={colorsSheet.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Payment Methods"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton={true}
      />

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Stripe Badge */}
          <View style={styles.stripeBadge}>
            <Text style={styles.stripeText}>Powered by</Text>
            <Text style={styles.stripeLogo}>Stripe</Text>
            <Ionicons name="shield-checkmark" size={20} color={colorsSheet.success} />
          </View>

          {/* Payment Methods List */}
          {paymentMethods.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
              {paymentMethods.map(method => (
                <PaymentCard key={method.id} method={method} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={60} color={colorsSheet.textSecondary} />
              <Text style={styles.emptyTitle}>No Payment Methods</Text>
              <Text style={styles.emptySubtitle}>Add a payment method to make purchases</Text>
            </View>
          )}

          {/* Add Payment Method Button */}
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text style={styles.addButtonText}>Add Payment Method</Text>
          </TouchableOpacity>

          {/* Payment Security Info */}
          <View style={styles.securityInfo}>
            <Ionicons name="lock-closed" size={20} color={colorsSheet.primary} />
            <Text style={styles.securityText}>
              Your payment information is encrypted and securely processed through Stripe. 
              We never store your card details on our servers.
            </Text>
          </View>

          {/* Accepted Cards */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accepted Payment Methods</Text>
            <View style={styles.acceptedCards}>
              <View style={styles.acceptedCard}>
                <Text style={styles.cardLogo}>💳</Text>
                <Text style={styles.acceptedCardName}>Visa</Text>
              </View>
              <View style={styles.acceptedCard}>
                <Text style={styles.cardLogo}>💳</Text>
                <Text style={styles.acceptedCardName}>Mastercard</Text>
              </View>
              <View style={styles.acceptedCard}>
                <Text style={styles.cardLogo}>💳</Text>
                <Text style={styles.acceptedCardName}>Amex</Text>
              </View>
              <View style={styles.acceptedCard}>
                <Text style={styles.cardLogo}>💳</Text>
                <Text style={styles.acceptedCardName}>Discover</Text>
              </View>
            </View>
          </View>

          <View style={{ height: hp(4) }} />
        </ScrollView>
      </View>

      {/* Add Card Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Method</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colorsSheet.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Card Number</Text>
                <TextInput
                  style={styles.input}
                  value={cardDetails.cardNumber}
                  onChangeText={(text) => setCardDetails({ 
                    ...cardDetails, 
                    cardNumber: formatCardNumber(text) 
                  })}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={colorsSheet.textSecondary}
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: wp(2) }]}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TextInput
                    style={styles.input}
                    value={cardDetails.expiryDate}
                    onChangeText={(text) => setCardDetails({ 
                      ...cardDetails, 
                      expiryDate: formatExpiryDate(text) 
                    })}
                    placeholder="MM/YY"
                    placeholderTextColor={colorsSheet.textSecondary}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    value={cardDetails.cvv}
                    onChangeText={(text) => setCardDetails({ ...cardDetails, cvv: text })}
                    placeholder="123"
                    placeholderTextColor={colorsSheet.textSecondary}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Cardholder Name</Text>
                <TextInput
                  style={styles.input}
                  value={cardDetails.cardholderName}
                  onChangeText={(text) => setCardDetails({ ...cardDetails, cardholderName: text })}
                  placeholder="John Doe"
                  placeholderTextColor={colorsSheet.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ZIP/Postal Code</Text>
                <TextInput
                  style={styles.input}
                  value={cardDetails.zipCode}
                  onChangeText={(text) => setCardDetails({ ...cardDetails, zipCode: text })}
                  placeholder="12345"
                  placeholderTextColor={colorsSheet.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleAddCard}>
                <Text style={styles.saveButtonText}>Add Card</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsSheet.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  stripeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2),
    marginBottom: hp(2),
  },
  stripeText: {
    fontSize: hp(1.4),
    color: colorsSheet.textSecondary,
    marginRight: wp(1),
  },
  stripeLogo: {
    fontSize: hp(2),
    fontWeight: 'bold',
    color: '#635BFF',
    marginRight: wp(2),
  },
  section: {
    marginHorizontal: wp(5),
    marginTop: hp(2),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: 'bold',
    color: colorsSheet.textPrimary,
    marginBottom: hp(1.5),
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: wp(4),
    borderRadius: hp(1.5),
    marginBottom: hp(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: hp(3),
    marginRight: wp(3),
  },
  cardInfo: {
    flex: 1,
  },
  cardBrand: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: colorsSheet.textPrimary,
    marginBottom: hp(0.3),
  },
  cardExpiry: {
    fontSize: hp(1.4),
    color: colorsSheet.textSecondary,
  },
  defaultBadge: {
    backgroundColor: colorsSheet.primarySoft,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: hp(0.5),
    marginTop: hp(0.5),
    alignSelf: 'flex-start',
  },
  defaultText: {
    fontSize: hp(1.2),
    color: colorsSheet.primary,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  setDefaultText: {
    fontSize: hp(1.4),
    color: colorsSheet.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(8),
  },
  emptyTitle: {
    fontSize: hp(2),
    fontWeight: '600',
    color: colorsSheet.textPrimary,
    marginTop: hp(2),
  },
  emptySubtitle: {
    fontSize: hp(1.6),
    color: colorsSheet.textSecondary,
    marginTop: hp(0.5),
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorsSheet.primary,
    marginHorizontal: wp(5),
    marginTop: hp(3),
    paddingVertical: hp(2),
    borderRadius: hp(1.5),
  },
  addButtonText: {
    color: 'white',
    fontSize: hp(1.8),
    fontWeight: '600',
    marginLeft: wp(2),
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colorsSheet.primarySoft,
    marginHorizontal: wp(5),
    marginTop: hp(3),
    padding: wp(4),
    borderRadius: hp(1.5),
  },
  securityText: {
    flex: 1,
    fontSize: hp(1.4),
    color: colorsSheet.primary,
    marginLeft: wp(2),
    lineHeight: hp(2),
  },
  acceptedCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
  },
  acceptedCard: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: wp(3),
    borderRadius: hp(1),
    minWidth: wp(20),
  },
  cardLogo: {
    fontSize: hp(3),
    marginBottom: hp(0.5),
  },
  acceptedCardName: {
    fontSize: hp(1.2),
    color: colorsSheet.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: hp(3),
    borderTopRightRadius: hp(3),
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
    maxHeight: hp(80),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: colorsSheet.textSecondary + '20',
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: hp(2.2),
    fontWeight: 'bold',
    color: colorsSheet.textPrimary,
  },
  inputGroup: {
    marginBottom: hp(2),
  },
  inputLabel: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: colorsSheet.textPrimary,
    marginBottom: hp(0.8),
  },
  input: {
    borderWidth: 1,
    borderColor: colorsSheet.textSecondary + '30',
    borderRadius: hp(1),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    fontSize: hp(1.8),
    color: colorsSheet.textPrimary,
  },
  row: {
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: colorsSheet.primary,
    paddingVertical: hp(2),
    borderRadius: hp(1.5),
    alignItems: 'center',
    marginTop: hp(2),
  },
  saveButtonText: {
    color: 'white',
    fontSize: hp(1.8),
    fontWeight: '600',
  },
});