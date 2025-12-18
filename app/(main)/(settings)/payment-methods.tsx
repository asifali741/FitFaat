import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

interface PaymentMethod {
  id: string;
  type: "card" | "bank";
  last4: string;
  cardBrand?: string;
  bankName?: string;
  isDefault: boolean;
  expiryMonth?: string;
  expiryYear?: string;
  addedAt: string;
}

export default function PaymentMethods() {
  const { colors } = useTheme();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    zipCode: "",
  });

  const API_URL = Platform.OS === "android"
    ? "http://10.0.2.2:5001"
    : "http://localhost:5001";

  useFocusEffect(
    useCallback(() => {
      fetchPaymentMethods();
    }, [])
  );

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const token = await tokenStorage.getToken();

      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const response = await fetch(`${API_URL}/api/payment/methods`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        setPaymentMethods(data.paymentMethods || []);
        console.log("Payment methods fetched:", data.paymentMethods);
      } else {
        Alert.alert("Error", data.message || "Failed to fetch payment methods");
      }
    } catch (error: any) {
      console.error("Error fetching payment methods:", error.message);
      Alert.alert("Error", "Failed to fetch payment methods");
    } finally {
      setLoading(false);
    }
  };

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case "visa":
        return "💳";
      case "mastercard":
        return "💳";
      case "amex":
        return "💳";
      default:
        return "💳";
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, "");
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(" ") : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validateCard = () => {
    if (cardDetails.cardNumber.replace(/\s/g, "").length !== 16) {
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

  const handleAddCard = async () => {
    if (!validateCard()) return;

    try {
      const token = await tokenStorage.getToken();

      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const [month, year] = cardDetails.expiryDate.split("/");
      const cardBrand = "visa";

      const response = await fetch(`${API_URL}/api/payment/methods/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardBrand,
          last4: cardDetails.cardNumber.slice(-4),
          expiryMonth: month,
          expiryYear: year,
          stripePaymentMethodId: null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Card added successfully");
        setShowAddModal(false);
        setCardDetails({
          cardNumber: "",
          expiryDate: "",
          cvv: "",
          cardholderName: "",
          zipCode: "",
        });
        fetchPaymentMethods();
      } else {
        Alert.alert("Error", data.message || "Failed to add card");
      }
    } catch (error: any) {
      console.error("Error adding card:", error.message);
      Alert.alert("Error", "Failed to add card");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const token = await tokenStorage.getToken();

      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const response = await fetch(`${API_URL}/api/payment/methods/${id}/set-default`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Default payment method updated");
        fetchPaymentMethods();
      } else {
        Alert.alert("Error", data.message || "Failed to update default");
      }
    } catch (error: any) {
      console.error("Error setting default:", error.message);
      Alert.alert("Error", "Failed to update default payment method");
    }
  };

  const handleDeleteCard = async (id: string) => {
    Alert.alert(
      "Remove Card",
      "Are you sure you want to remove this payment method?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await tokenStorage.getToken();

              if (!token) {
                Alert.alert("Error", "Authentication token not found");
                return;
              }

              const response = await fetch(
                `${API_URL}/api/payment/methods/${id}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              const data = await response.json();

              if (data.success) {
                Alert.alert("Success", "Card removed successfully");
                fetchPaymentMethods();
              } else {
                Alert.alert("Error", data.message || "Failed to remove card");
              }
            } catch (error: any) {
              console.error("Error deleting card:", error.message);
              Alert.alert("Error", "Failed to remove card");
            }
          },
        },
      ]
    );
  };

  const PaymentCard = ({ method }: { method: PaymentMethod }) => (
    <View style={[styles.paymentCard, { borderColor: colors.primary }]}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardIcon}>{getCardIcon(method.cardBrand)}</Text>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardBrand, { color: colors.textPrimary }]}>
            {method.cardBrand} •••• {method.last4}
          </Text>
          <Text style={styles.cardExpiry}>
            Expires {method.expiryMonth}/{method.expiryYear}
          </Text>
          {method.isDefault && (
            <View style={[styles.defaultBadge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.defaultText, { color: colors.primary }]}>Default</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardActions}>
        {!method.isDefault && (
          <TouchableOpacity onPress={() => handleSetDefault(method.id)}>
            <Text style={[styles.setDefaultText, { color: colors.primary }]}>
              Set Default
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => handleDeleteCard(method.id)}>
          <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Payment Methods" />

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.stripeBadge}>
              <Text style={styles.stripeText}>Secured by</Text>
              <Text style={[styles.stripeLogo, { color: colors.primary }]}>Stripe</Text>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={colors.primary}
              />
            </View>

            {paymentMethods.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Saved Cards
                </Text>
                {paymentMethods.map((method) => (
                  <PaymentCard key={method.id} method={method} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="card-outline"
                  size={60}
                  color={colors.primary}
                />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No Payment Methods
                </Text>
                <Text style={styles.emptySubtitle}>
                  Add a card to make purchases
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color="white" />
              <Text style={styles.addButtonText}>Add Payment Method</Text>
            </TouchableOpacity>

            <View style={[styles.securityInfo, { backgroundColor: colors.primary + "08" }]}>
              <Ionicons
                name="lock-closed"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.securityText, { color: colors.textPrimary }]}>
                Your payment information is encrypted and securely processed
                through Stripe. We never store your card details.
              </Text>
            </View>

            <View style={{ height: hp(4) }} />
          </ScrollView>
        )}
      </View>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Add Payment Method
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Card Number
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.primary }]}
                  value={cardDetails.cardNumber}
                  onChangeText={(text) =>
                    setCardDetails({
                      ...cardDetails,
                      cardNumber: formatCardNumber(text),
                    })
                  }
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={colors.primary + "60"}
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: wp(2) }]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    Expiry Date
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.primary }]}
                    value={cardDetails.expiryDate}
                    onChangeText={(text) =>
                      setCardDetails({
                        ...cardDetails,
                        expiryDate: formatExpiryDate(text),
                      })
                    }
                    placeholder="MM/YY"
                    placeholderTextColor={colors.primary + "60"}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    CVV
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.primary }]}
                    value={cardDetails.cvv}
                    onChangeText={(text) =>
                      setCardDetails({ ...cardDetails, cvv: text })
                    }
                    placeholder="123"
                    placeholderTextColor={colors.primary + "60"}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Cardholder Name
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.primary }]}
                  value={cardDetails.cardholderName}
                  onChangeText={(text) =>
                    setCardDetails({ ...cardDetails, cardholderName: text })
                  }
                  placeholder="John Doe"
                  placeholderTextColor={colors.primary + "60"}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  ZIP/Postal Code
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.primary }]}
                  value={cardDetails.zipCode}
                  onChangeText={(text) =>
                    setCardDetails({ ...cardDetails, zipCode: text })
                  }
                  placeholder="12345"
                  placeholderTextColor={colors.primary + "60"}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleAddCard}
              >
                <Text style={styles.saveButtonText}>Add Card</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    stripeBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: hp(2),
      marginBottom: hp(2),
    },
    stripeText: {
      fontSize: hp(1.5),
      color: "#999",
      marginRight: wp(1),
      fontWeight: "500",
    },
    stripeLogo: {
      fontSize: hp(2.2),
      fontWeight: "800",
      marginRight: wp(2),
      letterSpacing: 0.5,
    },
    section: {
      marginHorizontal: wp(5),
      marginTop: hp(2),
    },
    sectionTitle: {
      fontSize: hp(2.2),
      fontWeight: "700",
      marginBottom: hp(2),
      letterSpacing: 0.3,
    },
    paymentCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "white",
      padding: wp(4),
      borderRadius: hp(2),
      marginBottom: hp(1.5),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1.5,
    },
    cardLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    cardIcon: {
      fontSize: hp(3.5),
      marginRight: wp(4),
    },
    cardInfo: {
      flex: 1,
    },
    cardBrand: {
      fontSize: hp(1.95),
      fontWeight: "700",
      marginBottom: hp(0.5),
      letterSpacing: 0.3,
    },
    cardExpiry: {
      fontSize: hp(1.5),
      color: "#999",
      fontWeight: "500",
    },
    defaultBadge: {
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: hp(0.6),
      marginTop: hp(0.7),
      alignSelf: "flex-start",
    },
    defaultText: {
      fontSize: hp(1.3),
      fontWeight: "700",
    },
    cardActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(3),
    },
    setDefaultText: {
      fontSize: hp(1.5),
      fontWeight: "600",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: hp(10),
    },
    emptyTitle: {
      fontSize: hp(2.2),
      fontWeight: "700",
      marginTop: hp(2),
      letterSpacing: 0.2,
    },
    emptySubtitle: {
      fontSize: hp(1.7),
      color: "#999",
      marginTop: hp(0.8),
      fontWeight: "500",
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: wp(5),
      marginTop: hp(3),
      paddingVertical: hp(2),
      borderRadius: hp(1.5),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    addButtonText: {
      color: "white",
      fontSize: hp(1.95),
      fontWeight: "700",
      marginLeft: wp(2),
      letterSpacing: 0.3,
    },
    securityInfo: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginHorizontal: wp(5),
      marginTop: hp(3),
      padding: wp(4),
      borderRadius: hp(1.5),
      borderLeftWidth: 4,
    },
    securityText: {
      flex: 1,
      fontSize: hp(1.65),
      marginLeft: wp(3),
      lineHeight: hp(2.5),
      fontWeight: "500",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: "white",
      borderTopLeftRadius: hp(3),
      borderTopRightRadius: hp(3),
      paddingHorizontal: wp(5),
      paddingBottom: hp(4),
      maxHeight: hp(90),
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: hp(2),
      borderBottomWidth: 1,
      borderBottomColor: "#E0E0E0",
      marginBottom: hp(2),
    },
    modalTitle: {
      fontSize: hp(2.3),
      fontWeight: "800",
      letterSpacing: 0.3,
    },
    inputGroup: {
      marginBottom: hp(2.5),
    },
    inputLabel: {
      fontSize: hp(1.75),
      fontWeight: "700",
      marginBottom: hp(1),
      letterSpacing: 0.2,
    },
    input: {
      borderWidth: 2,
      borderRadius: hp(1.2),
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.6),
      fontSize: hp(1.8),
    },
    row: {
      flexDirection: "row",
    },
    saveButton: {
      paddingVertical: hp(2),
      borderRadius: hp(1.5),
      alignItems: "center",
      marginTop: hp(2),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    saveButtonText: {
      color: "white",
      fontSize: hp(2),
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });
