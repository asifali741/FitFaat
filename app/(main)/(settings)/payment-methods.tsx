import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { CardField, useStripe } from "@stripe/stripe-react-native";
import React, { useCallback, useState, useEffect } from "react";
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBackendBaseUrl } from '@/utils/config';

interface PaymentMethod {
  id: string;
  type: "card" | "bank";
  last4: string;
  cardBrand?: string;
  bankName?: string;
  isDefault: boolean;
  expiryMonth?: string;
  expiryYear?: string;
  stripePaymentMethodId?: string | null;
  addedAt: string;
}

export default function PaymentMethods() {
  const { colors } = useTheme();
  const { createPaymentMethod } = useStripe();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cardDetails, setCardDetails] = useState<{
    complete: boolean;
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
  } | null>(null);

  const API_URL = getBackendBaseUrl();

  const fetchPaymentMethods = useCallback(async () => {
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
  }, [API_URL]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync('dark').catch(() => {});
      NavigationBar.setStyle('light');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPaymentMethods();
    }, [fetchPaymentMethods])
  );

  const getCardIcon = (brand?: string): keyof typeof Ionicons.glyphMap => {
    switch (brand?.toLowerCase()) {
      case "visa":
        return "card-outline";
      case "mastercard":
        return "card-outline";
      case "amex":
        return "card-outline";
      default:
        return "card-outline";
    }
  };

  const handleAddCard = async () => {
    if (!cardDetails?.complete) {
      Alert.alert("Incomplete Card", "Please enter complete card details");
      return;
    }

    try {
      setSavingCard(true);
      const token = await tokenStorage.getToken();

      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        return;
      }

      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: "Card",
      });

      if (error || !paymentMethod) {
        Alert.alert("Card Error", error?.message || "Failed to validate card with Stripe");
        return;
      }

      const stripeCard = paymentMethod.Card;
      const cardBrand = stripeCard?.brand || cardDetails.brand || "card";
      const last4 = stripeCard?.last4 || cardDetails.last4;
      const expiryMonth = stripeCard?.expMonth || cardDetails.expiryMonth;
      const expiryYear = stripeCard?.expYear || cardDetails.expiryYear;

      if (!last4 || !expiryMonth || !expiryYear) {
        Alert.alert("Card Error", "Stripe did not return complete card metadata");
        return;
      }

      const response = await fetch(`${API_URL}/api/payment/methods/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardBrand,
          last4,
          expiryMonth: String(expiryMonth).padStart(2, "0"),
          expiryYear: String(expiryYear).slice(-2),
          stripePaymentMethodId: paymentMethod.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Card added successfully");
        setShowAddModal(false);
        setCardDetails(null);
        fetchPaymentMethods();
      } else {
        Alert.alert("Error", data.message || "Failed to add card");
      }
    } catch (error: any) {
      console.error("Error adding card:", error.message);
      Alert.alert("Error", "Failed to add card");
    } finally {
      setSavingCard(false);
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
        <Ionicons
          name={getCardIcon(method.cardBrand)}
          size={Math.min(hp(3.1), wp(7))}
          color={colors.primary}
          style={styles.cardIcon}
        />
        <View style={styles.cardInfo}>
          <Text style={[styles.cardBrand, { color: colors.textPrimary }]}>
            {method.cardBrand || "Card"} ending {method.last4}
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
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
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
              <View style={styles.stripeCardInputBox}>
                <View style={styles.stripeCardHeader}>
                  <View style={[styles.cardInputIconBox, { backgroundColor: colors.primary + "14" }]}>
                    <Ionicons name="card-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                      Card Information
                    </Text>
                    <Text style={styles.inputHelpText}>
                      Card details are handled securely by Stripe.
                    </Text>
                  </View>
                </View>

                <CardField
                  postalCodeEnabled={false}
                  placeholders={{
                    number: "4242 4242 4242 4242",
                    expiration: "MM/YY",
                    cvc: "CVC",
                  }}
                  cardStyle={{
                    backgroundColor: "#F8FAFC",
                    borderColor: "#E2E8F0",
                    borderRadius: 12,
                    borderWidth: 1,
                    cursorColor: colors.primary,
                    fontSize: 16,
                    placeholderColor: "#94A3B8",
                    textColor: "#0F172A",
                    textErrorColor: colors.error,
                  }}
                  onCardChange={(details: any) => {
                    setCardDetails({
                      complete: details.complete,
                      last4: details.last4,
                      brand: details.brand,
                      expiryMonth: details.expiryMonth,
                      expiryYear: details.expiryYear,
                    });
                  }}
                  style={styles.stripeCardField}
                />

                <View style={styles.cardValidationRow}>
                  <Ionicons
                    name={cardDetails?.complete ? "checkmark-circle" : "information-circle-outline"}
                    size={16}
                    color={cardDetails?.complete ? colors.success : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.cardValidationText,
                      { color: cardDetails?.complete ? colors.success : colors.textSecondary },
                    ]}
                  >
                    {cardDetails?.complete
                      ? "Card ready to save"
                      : "Enter card number, expiry date and CVC"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.primary },
                  (!cardDetails?.complete || savingCard) && styles.disabledButton,
                ]}
                onPress={handleAddCard}
                disabled={!cardDetails?.complete || savingCard}
              >
                {savingCard ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Card</Text>
                )}
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
      backgroundColor: colors.screenColor || '#FFFFFF',
    },
    content: {
      flex: 1,
      backgroundColor: colors.screenColor || '#FFFFFF',
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
    stripeCardInputBox: {
      borderWidth: 1.5,
      borderColor: "#E2E8F0",
      borderRadius: hp(1.8),
      backgroundColor: "#FFFFFF",
      padding: wp(4),
      marginTop: hp(1),
      marginBottom: hp(2.5),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 2,
    },
    stripeCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: hp(1.5),
      gap: wp(3),
    },
    cardInputIconBox: {
      width: hp(4.6),
      height: hp(4.6),
      borderRadius: hp(1.4),
      alignItems: "center",
      justifyContent: "center",
    },
    inputHelpText: {
      color: "#94A3B8",
      fontSize: hp(1.45),
      fontWeight: "600",
      lineHeight: hp(2),
    },
    stripeCardField: {
      width: "100%",
      height: Math.max(hp(6.4), 54),
      borderRadius: hp(1.5),
      backgroundColor: "#F8FAFC",
      marginBottom: hp(1),
    },
    cardValidationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    cardValidationText: {
      flex: 1,
      minWidth: 0,
      fontSize: hp(1.45),
      fontWeight: "700",
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
    disabledButton: {
      opacity: 0.55,
    },
  });
