import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { CardField, useStripe } from "@stripe/stripe-react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

interface PaymentMethod {
  id: string;
  last4: string;
  cardBrand?: string;
  expiryMonth?: string;
  expiryYear?: string;
  isDefault: boolean;
}

export default function PremiumScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { confirmPayment } = useStripe();
  const cardFieldRef = useRef(null);

  // Get correct API URL based on platform
  const ENV = Constants.expoConfig?.extra;
  const API_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://localhost:5001")).replace(/\/api\/?$/, '');

  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [cardDetails, setCardDetails] = useState<{
    complete: boolean;
    validCVC: boolean;
    validExpiryDate: boolean;
    validNumber: boolean;
  } | null>(null);

  useEffect(() => {
    checkPremiumStatus();
    fetchPaymentMethods();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPaymentMethods();
    }, [])
  );

  const fetchPaymentMethods = async () => {
    try {
      const token = await tokenStorage.getToken();

      if (!token) {
        console.log("No token found, skipping payment methods fetch");
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
      }
    } catch (error: any) {
      console.error("Error fetching payment methods:", error.message);
    }
  };

  const checkPremiumStatus = async () => {
    try {
      setLoading(true);
      const token = await tokenStorage.getToken();

      if (!token) {
        console.log("No token found, skipping premium status check");
        return;
      }

      console.log("Checking premium status with API_URL:", API_URL);

      const response = await fetch(`${API_URL}/api/payment/premium-status`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("Premium status response:", response.status);
      const data = await response.json();
      console.log("Premium status data:", data);

      if (data.success) {
        setIsPremium(data.isPremium);
      }
    } catch (error: any) {
      console.error("Error checking premium status:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePremium = async () => {
    try {
      setProcessing(true);
      
      // Validate card details are complete (we always use the card field)
      if (!cardDetails?.complete) {
        Alert.alert("Error", "Please enter complete card details");
        setProcessing(false);
        return;
      }

      const token = await tokenStorage.getToken();

      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        setProcessing(false);
        return;
      }

      console.log("🔵 Step 1: Creating PaymentIntent on backend...");

      // Step 1: Create PaymentIntent on backend
      const createIntentResponse = await fetch(
        `${API_URL}/api/payment/create-payment-intent`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const intentData = await createIntentResponse.json();

      if (!intentData.success) {
        Alert.alert("Error", intentData.message || "Failed to create payment intent");
        setProcessing(false);
        return;
      }

      const { clientSecret } = intentData;
      console.log("✅ Step 1 Complete: PaymentIntent created");
      console.log("🔵 Step 2: Calling Stripe confirmPayment...");

      // Step 2: Use Stripe SDK to confirm payment with CardField data
      const { paymentIntent, error } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        console.error("❌ Stripe payment failed:", error.message);
        Alert.alert(
          "Payment Failed",
          error.message || "Failed to process payment. Please try again."
        );
        setProcessing(false);
        return;
      }

      if (!paymentIntent) {
        console.error("❌ Payment intent is missing");
        Alert.alert("Error", "Payment intent is missing");
        setProcessing(false);
        return;
      }

      console.log("✅ Stripe payment succeeded");
      console.log("Payment status:", paymentIntent.status);
      console.log("Payment ID:", paymentIntent.id);

      // Only proceed if payment actually succeeded
      if (paymentIntent.status !== "Succeeded") {
        console.error("❌ Payment status is not Succeeded:", paymentIntent.status);
        Alert.alert(
          "Payment Incomplete",
          `Payment status: ${paymentIntent.status}. Please try again.`
        );
        setProcessing(false);
        return;
      }

      console.log("🔵 Step 3: Confirming payment on backend...");

      // Prepare card details to send if new card is used
      let cardDetailsToSave = null;
      if (useNewCard && cardDetails) {
        // Note: We can't extract exact card details from CardField
        // but we can infer last4 from Stripe's payment intent payment method
        cardDetailsToSave = {
          last4: "****",
          cardBrand: "visa",
          expiryMonth: "12",
          expiryYear: "25",
        };
      }

      // Step 3: Notify backend that payment was successful
      const confirmBackendResponse = await fetch(
        `${API_URL}/api/payment/confirm-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            cardDetails: cardDetailsToSave,
          }),
        }
      );

      const backendConfirmData = await confirmBackendResponse.json();

      if (!backendConfirmData.success) {
        console.error("❌ Backend confirmation failed:", backendConfirmData.message);
        Alert.alert("Error", backendConfirmData.message || "Failed to complete purchase");
        setProcessing(false);
        return;
      }

      console.log("✅ Step 3 Complete: Backend verified payment");
      console.log("🎉 Payment completed successfully!");

      setIsPremium(true);
      setShowPaymentForm(false);
      setCardDetails(null);
      setUseNewCard(false);
      await fetchPaymentMethods();

      Alert.alert(
        "Success! 🎉",
        "You are now a Premium Member!\n\nEnjoy all premium features!",
        [
          {
            text: "OK",
            onPress: () => {
              checkPremiumStatus();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("❌ Payment error:", error);
      console.error("Error message:", error.message);
      Alert.alert(
        "Error",
        error.message || "Payment processing failed. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelPremium = async () => {
    Alert.alert(
      "Cancel Premium",
      "Are you sure you want to cancel your premium subscription?",
      [
        { text: "Keep Premium", style: "cancel" },
        {
          text: "Cancel Premium",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);
              const token = await tokenStorage.getToken();

              const response = await fetch(`${API_URL}/api/payment/cancel-premium`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              });

              const data = await response.json();
              if (data.success) {
                setIsPremium(false);
                Alert.alert("Cancelled", "Premium subscription has been cancelled");
              } else {
                Alert.alert("Error", data.message);
              }
            } catch (error) {
              console.error("Error cancelling premium:", error);
              Alert.alert("Error", "Failed to cancel premium subscription");
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const styles = getStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Premium" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Premium Membership" />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {!isPremium ? (
          <>
           
            {/* Price Card */}
            <View style={[styles.card, { borderColor: colors.primary }]}>
              <Text style={styles.priceLabel}>Monthly Plan</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.currency}>$</Text>
                <Text style={styles.price}>10</Text>
                <Text style={styles.period}>/month</Text>
              </View>
              <Text style={styles.priceDescription}>
                Get lifetime access to all premium features
              </Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Premium Features Include:</Text>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Advanced Workout Plans</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Personalized Nutrition Guidance</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Priority Doctor Consultations</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Unlimited Food Analysis</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Weekly Progress Reports</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Ad-Free Experience</Text>
              </View>
            </View>

            {/* Payment Info */}
            <View style={styles.card}>
              <Text style={styles.infoLabel}>Payment Method</Text>
              <Text style={styles.infoValue}>Credit/Debit Card</Text>
              <Text style={styles.infoDescription}>
                We accept all major credit cards. Your payment is processed securely by Stripe.
              </Text>
            </View>

            {/* Payment Form */}
            {showPaymentForm ? (
              <View style={styles.paymentFormCard}>
                {/* Header Section */}
                <View style={styles.paymentHeader}>
                  <View style={styles.headerIconBox}>
                    <Ionicons name="shield-checkmark" size={32} color="white" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formTitle}>Secure Payment</Text>
                    <Text style={styles.formSubtitle}>Complete your premium upgrade</Text>
                  </View>
                </View>

                {/* Security Info */}
                <View style={styles.securityInfo}>
                  <Ionicons name="lock-closed" size={16} color={colors.primary} />
                  <Text style={styles.securityText}>Your payment is encrypted and secure</Text>
                </View>

                {/* Saved Cards Section - REMOVED for simplicity */}

                {/* Card Input Section */}
                <View style={styles.cardInputSection}>
                    <Text style={styles.cardInputLabel}>
                      {paymentMethods.length > 0 ? "New Card Information" : "Card Information"}
                    </Text>
                    
                    {/* Stripe CardField Component */}
                    <CardField
                      ref={cardFieldRef}
                      postalCodeEnabled={false}
                      placeholders={{
                        number: "•••• •••• •••• ••••",
                        expiration: "MM/YY",
                        cvc: "•••",
                      }}
                      onCardChange={(details: any) => {
                        console.log("🔍 Card details updated:", {
                          complete: details.complete,
                          validCVC: details.validCVC,
                          validExpiryDate: details.validExpiryDate,
                          validNumber: details.validNumber,
                        });
                        setCardDetails({
                          complete: details.complete,
                          validCVC: details.validCVC,
                          validExpiryDate: details.validExpiryDate,
                          validNumber: details.validNumber,
                        });
                      }}
                      style={styles.cardField}
                    />
                  </View>

                {/* Price Summary */}
                <View style={styles.priceSummary}>
                  <View>
                    <Text style={styles.summaryLabel}>Premium Plan</Text>
                    <Text style={styles.summaryDescription}>Monthly subscription</Text>
                  </View>
                  <Text style={styles.summaryPrice}>$10.00</Text>
                </View>

                {/* Debug: Show card validation status */}
                <View style={{paddingHorizontal: 16, marginBottom: 8}}>
                  <Text style={{fontSize: 12, color: cardDetails?.complete ? '#4CAF50' : '#FF6B6B'}}>
                    {cardDetails?.complete ? '✅ Card complete - ready to pay' : '❌ Card incomplete - fill all fields'}
                  </Text>
                </View>

                {/* Pay Button */}
                <TouchableOpacity
                  style={[
                    styles.payButton,
                    (!cardDetails?.complete || processing) && styles.disabledButton,
                  ]}
                  onPress={handlePurchasePremium}
                  disabled={!cardDetails?.complete || processing}
                >
                  {processing ? (
                    <>
                      <ActivityIndicator color="white" size="small" />
                      <Text style={styles.payButtonText}>Processing...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="card" size={22} color="white" />
                      <Text style={styles.payButtonText}>Pay $10.00</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.cancelFormButton}
                  onPress={() => {
                    setShowPaymentForm(false);
                    setCardDetails(null);
                  }}
                  disabled={processing}
                >
                  <Text style={styles.cancelFormButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.upgradeButton, { 
                  backgroundColor: colors.primary,
                  borderRadius: hp(2),
                }]}
                onPress={() => setShowPaymentForm(true)}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View style={styles.upgradeButtonContent}>
                    <Ionicons name="star" size={28} color="white" />
                    <View style={styles.upgradeButtonTextContainer}>
                      <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                      <Text style={styles.upgradeButtonSubtext}>Get exclusive benefits</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Test Card Info */}
            {/* Removed test card info box */}
          </>
        ) : (
          <>
            {/* Premium Active Status */}
            <View style={[styles.card, styles.premiumActiveCard]}>
              <View style={styles.premiumActiveHeader}>
                <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
                <Text style={styles.premiumActiveTitle}>You're a Premium Member!</Text>
              </View>
              <Text style={styles.premiumActiveSubtitle}>
                Enjoy all the benefits of premium membership
              </Text>
            </View>

            {/* Subscription Info */}
            <View style={styles.card}>
              <Text style={styles.infoLabel}>Subscription Status</Text>
              <Text style={styles.infoValue}>Active</Text>

              <View style={styles.divider} />

              <Text style={styles.infoLabel}>Plan</Text>
              <Text style={styles.infoValue}>Premium Monthly - $10/month</Text>

              <View style={styles.divider} />

              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {new Date().toLocaleDateString()}
              </Text>
            </View>

            {/* Premium Features Available */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Your Premium Benefits:</Text>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Advanced Workout Plans</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Personalized Nutrition Guidance</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Priority Doctor Consultations</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Unlimited Food Analysis</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Weekly Progress Reports</Text>
              </View>

              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.featureText}>Ad-Free Experience</Text>
              </View>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelPremium}
              disabled={processing}
            >
              <Ionicons name="close-circle" size={20} color="#FF6B6B" />
              <Text style={styles.cancelButtonText}>Cancel Premium</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
      padding: wp(5),
    },
    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    premiumBadgeContainer: {
      alignItems: "center",
      marginBottom: hp(3),
      marginTop: hp(2),
    },
    premiumBadge: {
      width: hp(15),
      height: hp(15),
      borderRadius: hp(7.5),
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
    },
    premiumBadgeText: {
      fontSize: hp(2.5),
      fontWeight: "bold",
      color: colors.primary,
      marginTop: hp(1),
    },
    card: {
      backgroundColor: "white",
      borderRadius: hp(2),
      padding: wp(5),
      marginBottom: hp(2),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
      borderWidth: 1,
      borderColor: "#F5F5F5",
    },
    priceLabel: {
      fontSize: hp(2),
      fontWeight: "600",
      color: "#666",
      marginBottom: hp(1),
    },
    priceContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: hp(2),
    },
    currency: {
      fontSize: hp(3),
      fontWeight: "bold",
      color: colors.primary,
    },
    price: {
      fontSize: hp(5),
      fontWeight: "bold",
      color: colors.primary,
    },
    period: {
      fontSize: hp(2),
      color: "#666",
      marginLeft: wp(1),
    },
    priceDescription: {
      fontSize: hp(1.8),
      color: "#999",
      fontStyle: "italic",
    },
    featuresContainer: {
      backgroundColor: "white",
      borderRadius: hp(2),
      padding: wp(5),
      marginBottom: hp(2),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    featuresTitle: {
      fontSize: hp(2.2),
      fontWeight: "bold",
      color: colors.text,
      marginBottom: hp(2),
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: hp(1.5),
    },
    featureText: {
      fontSize: hp(1.9),
      color: colors.text,
      marginLeft: wp(3),
      flex: 1,
    },
    paymentFormCard: {
      marginBottom: hp(2),
      backgroundColor: "white",
      borderRadius: hp(2.5),
      padding: wp(6),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
      borderWidth: 1,
      borderColor: "#F0F0F0",
    },
    paymentHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: hp(2.5),
      paddingBottom: hp(2),
      borderBottomWidth: 1,
      borderBottomColor: "#F0F0F0",
    },
    headerIconBox: {
      width: hp(5),
      height: hp(5),
      borderRadius: hp(2.5),
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: wp(3),
    },
    formTitle: {
      fontSize: hp(2.6),
      fontWeight: "800",
      color: colors.text,
      marginBottom: hp(0.3),
      letterSpacing: 0.3,
    },
    formSubtitle: {
      fontSize: hp(1.7),
      color: "#666",
      fontWeight: "500",
    },
    securityInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: `${colors.primary}08`,
      paddingHorizontal: wp(3),
      paddingVertical: hp(1.2),
      borderRadius: hp(1),
      marginBottom: hp(2.5),
    },
    securityText: {
      fontSize: hp(1.6),
      color: colors.primary,
      marginLeft: wp(2),
      fontWeight: "500",
    },
    savedCardsSection: {
      marginBottom: hp(2.5),
      paddingHorizontal: wp(2),
    },
    savedCardOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.5),
      marginBottom: hp(1),
      borderRadius: hp(1.2),
      borderWidth: 2,
      borderColor: "#E0E0E0",
      backgroundColor: "#FAFAFA",
    },
    selectedCard: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}08`,
    },
    cardCheckbox: {
      width: hp(2.8),
      height: hp(2.8),
      borderRadius: hp(1.4),
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: "white",
      justifyContent: "center",
      alignItems: "center",
      marginRight: wp(3),
    },
    cardInfo: {
      flex: 1,
    },
    cardBrand: {
      fontSize: hp(1.9),
      fontWeight: "700",
      color: colors.text,
      marginBottom: hp(0.3),
    },
    cardExpiry: {
      fontSize: hp(1.5),
      color: "#999",
      fontWeight: "500",
    },
    defaultBadge: {
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.5),
      borderRadius: hp(0.8),
      backgroundColor: colors.primary,
    },
    defaultBadgeText: {
      fontSize: hp(1.3),
      color: "white",
      fontWeight: "700",
    },
    dividerLine: {
      height: 1,
      backgroundColor: "#E0E0E0",
      marginVertical: hp(1.5),
    },
    useNewCardOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.5),
      borderRadius: hp(1.2),
      borderWidth: 2,
      borderColor: "#E0E0E0",
      backgroundColor: "#FAFAFA",
    },
    cardInputSection: {
      marginBottom: hp(2.5),
    },
    cardInputLabel: {
      fontSize: hp(1.95),
      fontWeight: "700",
      color: colors.text,
      marginBottom: hp(1.2),
      letterSpacing: 0.2,
    },
    cardField: {
      width: "100%",
      height: hp(10),
      marginVertical: hp(0.5),
      borderRadius: hp(1.5),
      backgroundColor: "#FAFAFA",
      borderWidth: 2,
      borderColor: "#E0E0E0",
    },
    priceSummary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#F8F9FA",
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.8),
      borderRadius: hp(1.2),
      marginBottom: hp(2.5),
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    summaryLabel: {
      fontSize: hp(1.9),
      fontWeight: "700",
      color: colors.text,
      marginBottom: hp(0.3),
    },
    summaryDescription: {
      fontSize: hp(1.5),
      color: "#999",
      fontWeight: "400",
    },
    summaryPrice: {
      fontSize: hp(2.8),
      fontWeight: "800",
      color: colors.primary,
      letterSpacing: 0.3,
    },
    payButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingVertical: hp(2),
      borderRadius: hp(1.5),
      marginBottom: hp(1.5),
      gap: wp(2.5),
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
      borderWidth: 1,
      borderColor: `${colors.primary}20`,
    },
    payButtonText: {
      fontSize: hp(2.1),
      fontWeight: "800",
      color: "white",
      letterSpacing: 0.4,
    },
    cancelFormButton: {
      alignItems: "center",
      paddingVertical: hp(1.6),
      marginTop: hp(0.5),
      borderRadius: hp(1.2),
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: "white",
    },
    cancelFormButtonText: {
      fontSize: hp(1.95),
      color: colors.primary,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    disabledButton: {
      opacity: 0.5,
    },
    upgradeButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: wp(5),
      paddingVertical: hp(2.5),
      marginBottom: hp(3),
      marginHorizontal: wp(-5),
      marginTop: hp(2),
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.3)",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    upgradeButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      paddingHorizontal: wp(2),
    },
    upgradeButtonTextContainer: {
      flex: 1,
      marginHorizontal: wp(3),
    },
    upgradeButtonText: {
      fontSize: hp(2.4),
      fontWeight: "800",
      color: "white",
      letterSpacing: 0.4,
    },
    upgradeButtonSubtext: {
      fontSize: hp(1.6),
      color: "rgba(255, 255, 255, 0.85)",
      marginTop: hp(0.5),
      fontWeight: "500",
    },
    testCardInfo: {
      backgroundColor: "#F0F7FF",
      borderColor: colors.primary,
      borderWidth: 2,
      borderStyle: "dashed",
      borderRadius: hp(1.5),
      paddingHorizontal: wp(5),
      paddingVertical: hp(2),
    },
    testCardTitle: {
      fontSize: hp(1.95),
      fontWeight: "700",
      color: colors.primary,
      marginBottom: hp(0.8),
    },
    testCardValue: {
      fontSize: hp(2.4),
      fontWeight: "800",
      color: colors.primary,
      fontFamily: "Courier New",
      marginBottom: hp(0.8),
      letterSpacing: 1,
    },
    testCardDescription: {
      fontSize: hp(1.7),
      color: colors.primary,
      fontWeight: "500",
    },
    infoLabel: {
      fontSize: hp(1.7),
      fontWeight: "600",
      color: "#999",
      marginBottom: hp(0.5),
    },
    infoValue: {
      fontSize: hp(2),
      fontWeight: "bold",
      color: colors.text,
      marginBottom: hp(1.5),
    },
    infoDescription: {
      fontSize: hp(1.6),
      color: "#999",
      lineHeight: hp(2.5),
    },
    divider: {
      height: 1,
      backgroundColor: "#f0f0f0",
      marginVertical: hp(1.5),
    },
    premiumActiveCard: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      alignItems: "center",
      marginBottom: hp(3),
    },
    premiumActiveHeader: {
      alignItems: "center",
      marginBottom: hp(1),
    },
    premiumActiveTitle: {
      fontSize: hp(2.5),
      fontWeight: "bold",
      color: colors.primary,
      marginTop: hp(1),
    },
    premiumActiveSubtitle: {
      fontSize: hp(1.8),
      color: colors.textPrimary,
      textAlign: "center",
    },
    cancelButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: hp(1.8),
      borderRadius: hp(1.2),
      borderWidth: 1.5,
      borderColor: "#FF6B6B",
      marginBottom: hp(3),
      gap: wp(2),
    },
    cancelButtonText: {
      fontSize: hp(2),
      fontWeight: "bold",
      color: "#FF6B6B",
    },
  });
