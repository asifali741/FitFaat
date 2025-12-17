import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import { CardField, useStripe } from "@stripe/stripe-react-native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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

export default function PremiumScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { confirmPayment } = useStripe();
  const cardFieldRef = useRef(null);

  // Get correct API URL based on platform
  const API_URL = Platform.OS === "android"
    ? "http://10.0.2.2:5001"
    : "http://localhost:5001";

  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [cardDetails, setCardDetails] = useState<{
    complete: boolean;
    validCVC: boolean;
    validExpiryDate: boolean;
    validNumber: boolean;
  } | null>(null);

  useEffect(() => {
    checkPremiumStatus();
  }, []);

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
      
      // Validate card details are complete
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
            {/* Premium Badge */}
            <View style={styles.premiumBadgeContainer}>
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={40} color="#FFD700" />
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            </View>

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
              <View style={[styles.card, styles.paymentFormCard]}>
                <Text style={styles.formTitle}>Enter Card Details</Text>
                <Text style={styles.formSubtitle}>
                  Test Card: 4242 4242 4242 4242
                </Text>

                {/* Stripe CardField Component */}
                <CardField
                  ref={cardFieldRef}
                  postalCodeEnabled={true}
                  placeholders={{
                    number: "4242 4242 4242 4242",
                    expiration: "MM/YY",
                    cvc: "CVC",
                    postalCode: "12345",
                  }}
                  onCardChange={(details: any) => {
                    console.log("Card details updated:", {
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
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="card" size={20} color="white" />
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
                style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowPaymentForm(true)}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="star" size={24} color="white" />
                    <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Test Card Info */}
            <View style={[styles.card, styles.testCardInfo]}>
              <Text style={styles.testCardTitle}>🧪 Test Card</Text>
              <Text style={styles.testCardValue}>4242 4242 4242 4242</Text>
              <Text style={styles.testCardDescription}>
                Expiry: Any future date | CVC: Any 3 digits
              </Text>
            </View>
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
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: "#f0f0f0",
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
    },
    formTitle: {
      fontSize: hp(2.2),
      fontWeight: "bold",
      color: colors.text,
      marginBottom: hp(0.5),
    },
    formSubtitle: {
      fontSize: hp(1.6),
      color: "#4A90E2",
      marginBottom: hp(2),
      fontStyle: "italic",
    },
    cardField: {
      width: "100%",
      height: hp(8),
      marginVertical: hp(2),
      marginBottom: hp(2),
    },
    payButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#4CAF50",
      padding: hp(1.8),
      borderRadius: hp(1.2),
      marginTop: hp(1),
      gap: wp(2),
    },
    payButtonText: {
      fontSize: hp(2),
      fontWeight: "bold",
      color: "white",
    },
    cancelFormButton: {
      alignItems: "center",
      padding: hp(1.5),
      marginTop: hp(1),
      borderRadius: hp(1.2),
      borderWidth: 1,
      borderColor: "#ddd",
    },
    cancelFormButtonText: {
      fontSize: hp(1.9),
      color: "#666",
      fontWeight: "600",
    },
    disabledButton: {
      opacity: 0.5,
    },
    upgradeButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: hp(2),
      borderRadius: hp(1.5),
      marginBottom: hp(2),
      gap: wp(2),
    },
    upgradeButtonText: {
      fontSize: hp(2.2),
      fontWeight: "bold",
      color: "white",
    },
    testCardInfo: {
      backgroundColor: "#F0F7FF",
      borderColor: "#4A90E2",
      borderWidth: 1,
    },
    testCardTitle: {
      fontSize: hp(1.8),
      fontWeight: "600",
      color: "#4A90E2",
      marginBottom: hp(0.5),
    },
    testCardValue: {
      fontSize: hp(2.2),
      fontWeight: "bold",
      color: "#1A3A52",
      fontFamily: "Courier New",
      marginBottom: hp(0.5),
    },
    testCardDescription: {
      fontSize: hp(1.6),
      color: "#4A90E2",
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
      backgroundColor: colors.primary + "10",
      borderColor: colors.primary,
      borderWidth: 2,
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
      color: "#666",
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
