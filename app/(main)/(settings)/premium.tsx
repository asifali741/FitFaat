import AppHeader from "@/components/AppHeader";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import {
  FREE_PLAN_LIMITS,
  type PremiumFeature,
} from "@/utils/featureAccess";
import {
  getGoalExperience,
} from "@/utils/goalExperience";
import { getGoalOutcomePremiumCopy } from "@/utils/goalAdaptivePlan";
import { loadGoalSpineKey, type GoalSpineKey } from "@/utils/goalSpine";
import { isPremiumStatusActive } from "@/utils/premiumAccess";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { CardField, useStripe } from "@stripe/stripe-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
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
import { getBackendBaseUrl } from '@/utils/config';

interface PaymentMethod {
  id: string;
  last4: string;
  type?: "card" | "bank";
  cardBrand?: string;
  expiryMonth?: string;
  expiryYear?: string;
  stripePaymentMethodId?: string | null;
  isDefault: boolean;
}

const getSavedPaymentMethodStripeId = (method?: PaymentMethod | null) => {
  if (!method) return null;
  if (method.stripePaymentMethodId) return method.stripePaymentMethodId;
  return method.id?.startsWith("pm_") ? method.id : null;
};

const formatCardBrand = (brand?: string) => {
  if (!brand) return "Card";
  return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
};

const isPaymentIntentSucceeded = (status?: string | null) =>
  String(status || "").toLowerCase() === "succeeded";

const PREMIUM_PLAN_PRICE_DOLLARS = 10;
const PREMIUM_PLAN_PRICE_LABEL = `$${PREMIUM_PLAN_PRICE_DOLLARS}`;
const PREMIUM_PLAN_PRICE_WITH_CENTS = `$${PREMIUM_PLAN_PRICE_DOLLARS.toFixed(2)}`;

const premiumFeatureItems: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  feature: PremiumFeature;
  text?: string;
}[] = [
  { icon: 'trending-up-outline', title: 'Weekly Goal Adjustment Plan', feature: 'adaptiveGoalsPro' },
  { icon: 'analytics-outline', title: 'Deep Nutrition Insights', feature: 'nutritionInsights' },
  { icon: 'barbell-outline', title: 'Goal-Based Workout Progression', feature: 'workoutModule' },
  { icon: 'document-text-outline', title: 'Reports Export', feature: 'reportsExport' },
  { icon: 'download-outline', title: 'Chat History Export', feature: 'chatExport', text: 'Export HeaLora chat history when you need a saved record.' },
  { icon: 'chatbubbles-outline', title: 'Unlimited AI Coach', feature: 'aiCoach', text: `Send more than ${FREE_PLAN_LIMITS.aiCoachDailyMessages} HeaLora messages per day.` },
  { icon: 'calendar-outline', title: 'Unlimited Doctor Bookings', feature: 'appointments', text: `Keep more than ${FREE_PLAN_LIMITS.activeDoctorAppointments} active doctor appointment at a time.` },
];

export default function PremiumScreen() {
  const { colors } = useTheme();
  const { confirmPayment } = useStripe();
  const { sendSubscriptionAlert } = useNotifications();
  const cardFieldRef = useRef(null);

  const API_URL = getBackendBaseUrl();

  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [goalKey, setGoalKey] = useState<GoalSpineKey>("unset");
  const [premiumStatusData, setPremiumStatusData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [cardDetails, setCardDetails] = useState<{
    complete: boolean;
    validCVC?: unknown;
    validExpiryDate?: unknown;
    validNumber?: unknown;
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
  } | null>(null);

  const fetchPaymentMethods = useCallback(async () => {
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
  }, [API_URL]);

  const refreshGoalContext = useCallback(async () => {
    try {
      setGoalKey(await loadGoalSpineKey());
    } catch (error) {
      console.log("Premium goal context unavailable:", error);
      setGoalKey("unset");
    }
  }, []);

  const checkPremiumStatus = useCallback(async () => {
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
        setPremiumStatusData(data);
        setIsPremium(isPremiumStatusActive(data));
      } else {
        setPremiumStatusData(data);
      }
    } catch (error: any) {
      console.error("Error checking premium status:", error.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    checkPremiumStatus();
    fetchPaymentMethods();
    refreshGoalContext();
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync('dark').catch(() => {});
      NavigationBar.setStyle('light');
    }
  }, [checkPremiumStatus, fetchPaymentMethods, refreshGoalContext]);

  useFocusEffect(
    useCallback(() => {
      checkPremiumStatus();
      fetchPaymentMethods();
      refreshGoalContext();
    }, [checkPremiumStatus, fetchPaymentMethods, refreshGoalContext])
  );

  useEffect(() => {
    if (paymentMethods.length === 0) {
      setSelectedPaymentMethodId(null);
      setUseNewCard(true);
      return;
    }

    setSelectedPaymentMethodId((currentId) => {
      const stillExists = paymentMethods.some((method) => method.id === currentId);
      if (stillExists) return currentId;
      return paymentMethods.find((method) => method.isDefault)?.id || paymentMethods[0].id;
    });
    setUseNewCard(false);
  }, [paymentMethods]);

  const handlePurchasePremium = async () => {
    try {
      setProcessing(true);

      const selectedPaymentMethod = paymentMethods.find(
        (method) => method.id === selectedPaymentMethodId
      );
      const selectedStripePaymentMethodId = getSavedPaymentMethodStripeId(selectedPaymentMethod);

      if (useNewCard && !cardDetails?.complete) {
        Alert.alert("Error", "Please enter complete card details");
        setProcessing(false);
        return;
      }

      if (!useNewCard && !selectedPaymentMethod) {
        Alert.alert("Error", "Please select a saved card or use a new card");
        setProcessing(false);
        return;
      }

      if (!useNewCard && !selectedStripePaymentMethodId) {
        Alert.alert(
          "Card Needs Re-Entry",
          "This saved card does not have a Stripe payment token yet. Please choose Use a new card to complete this premium upgrade."
        );
        setUseNewCard(true);
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
      const createIntentBody = useNewCard
        ? undefined
        : JSON.stringify({ paymentMethodId: selectedStripePaymentMethodId });

      const createIntentResponse = await fetch(
        `${API_URL}/api/payment/create-payment-intent`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: createIntentBody,
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

      const confirmParams = useNewCard
        ? { paymentMethodType: "Card" as const }
        : {
            paymentMethodType: "Card" as const,
            paymentMethodData: {
              paymentMethodId: selectedStripePaymentMethodId as string,
            },
          };

      // Step 2: Use Stripe SDK to confirm payment with a saved card or CardField data.
      const { paymentIntent, error } = await confirmPayment(clientSecret, confirmParams);

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
      if (!isPaymentIntentSucceeded(paymentIntent.status)) {
        console.error("❌ Payment status is not Succeeded:", paymentIntent.status);
        Alert.alert(
          "Payment Incomplete",
          `Payment status: ${paymentIntent.status}. Please try again.`
        );
        setProcessing(false);
        return;
      }

      console.log("🔵 Step 3: Confirming payment on backend...");

      const confirmPaymentPayload = { paymentIntentId: paymentIntent.id };

      // Step 3: Notify backend that payment was successful
      const confirmBackendResponse = await fetch(
        `${API_URL}/api/payment/confirm-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(confirmPaymentPayload),
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
      setPremiumStatusData((current: any) => ({
        ...(current || {}),
        success: true,
        isPremium: true,
        memberSince: current?.memberSince || current?.premiumSince || new Date().toISOString(),
      }));
      setShowPaymentForm(false);
      setCardDetails(null);
      setUseNewCard(false);
      await fetchPaymentMethods();
      setTimeout(() => {
        checkPremiumStatus();
      }, 1500);
      setTimeout(() => {
        checkPremiumStatus();
      }, 5000);
      await sendSubscriptionAlert(
        'Premium Activated',
        'Your FitFaat Premium membership is active.'
      ).catch((error) => {
        console.log('Premium activation notification unavailable:', error);
      });

      Alert.alert(
        "Success! 🎉",
        "You are now a Premium Member!\n\nEnjoy all premium features!",
        [
          {
            text: "OK",
            onPress: () => {
              setTimeout(() => {
                checkPremiumStatus();
              }, 1000);
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

              if (!token) {
                Alert.alert("Error", "Authentication token not found. Please login again.");
                return;
              }

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
                setPremiumStatusData((current: any) => ({
                  ...(current || {}),
                  success: true,
                  isPremium: false,
                  status: "cancelled",
                }));
                setShowPaymentForm(false);
                setCardDetails(null);
                await sendSubscriptionAlert(
                  'Premium Cancelled',
                  'Your FitFaat Premium subscription has been cancelled.'
                ).catch((error) => {
                  console.log('Premium cancellation notification unavailable:', error);
                });
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
  const goalExperience = getGoalExperience(goalKey);
  const upgradeButtonIconSize = Math.min(hp(3.2), wp(7));
  const upgradeButtonChevronSize = Math.min(hp(2.8), wp(6.2));
  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.id === selectedPaymentMethodId
  );
  const selectedSavedPaymentStripeId = getSavedPaymentMethodStripeId(selectedPaymentMethod);
  const canPayForPremium = useNewCard
    ? Boolean(cardDetails?.complete)
    : Boolean(selectedSavedPaymentStripeId);
  const subscriptionStatusLabel = isPremium ? "Premium Active" : "Free Plan";
  const subscriptionStatusText = isPremium
    ? "Workouts, deeper insights, exports, unlimited AI, and unlimited active bookings are active."
    : `Free includes the dashboard, steps, charts, meal planning, grocery lists, and mindfulness for ${goalExperience.label}.`;
  const goalPremiumFeatureItems = premiumFeatureItems.map((feature) => ({
    ...feature,
    text: feature.text || getGoalOutcomePremiumCopy(goalKey, feature.feature),
  }));
  const memberSince =
    premiumStatusData?.memberSince ||
    premiumStatusData?.premiumSince ||
    premiumStatusData?.subscription?.createdAt ||
    premiumStatusData?.subscription?.startedAt;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
        <AppHeader title="Premium Membership" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
      <AppHeader title="Premium Membership" />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {!showPaymentForm || isPremium ? (
          <>
            <View style={styles.membershipHero}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroIcon}>
                  <Ionicons name="diamond-outline" size={Math.min(hp(3.8), wp(8.4))} color={colors.textOnPrimary || "#FFFFFF"} />
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroEyebrow}>FitFaat Premium</Text>
                  <Text
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.84}
                    style={styles.heroTitle}
                  >
                    {goalExperience.premium.headline}
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    {goalExperience.premium.body}
                  </Text>
                </View>
              </View>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{subscriptionStatusLabel}</Text>
                  <Text style={styles.heroStatLabel}>{subscriptionStatusText}</Text>
                </View>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{PREMIUM_PLAN_PRICE_LABEL}/mo</Text>
                  <Text style={styles.heroStatLabel}>
                    {isPremium ? "membership active" : `${premiumFeatureItems.length} focused upgrades`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.goalPremiumCard}>
              <View style={styles.goalPremiumHeader}>
                <View style={[styles.goalPremiumIcon, { backgroundColor: `${goalExperience.color}18` }]}>
                  <Ionicons
                    name={goalExperience.icon as keyof typeof Ionicons.glyphMap}
                    size={Math.min(hp(2.8), wp(6.2))}
                    color={goalExperience.color}
                  />
                </View>
                <View style={styles.goalPremiumCopy}>
                  <Text style={[styles.goalPremiumEyebrow, { color: goalExperience.color }]}>
                    Premium for {goalExperience.label}
                  </Text>
                  <Text style={styles.goalPremiumTitle}>{goalExperience.premium.headline}</Text>
                  <Text style={styles.goalPremiumBody}>{goalExperience.premium.body}</Text>
                </View>
              </View>
              <View style={styles.goalPremiumFeatureList}>
                {goalPremiumFeatureItems.slice(0, 5).map((feature) => (
                  <View key={feature.feature} style={styles.goalPremiumFeatureRow}>
                    <Ionicons
                      name={feature.icon}
                      size={Math.min(hp(2), wp(4.5))}
                      color={goalExperience.color}
                    />
                    <Text style={styles.goalPremiumFeatureText}>
                      {feature.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

          </>
        ) : null}

        {!isPremium ? (
          <>
            {!showPaymentForm ? (
              <>
                {/* Price Card */}
                <View style={[styles.card, { borderColor: colors.primary }]}>
                  <Text style={styles.priceLabel}>Monthly Plan</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.currency}>$</Text>
                    <Text style={styles.price}>{PREMIUM_PLAN_PRICE_DOLLARS}</Text>
                    <Text style={styles.period}>/month</Text>
                  </View>
                  <Text style={styles.priceDescription}>
                    Free users already get dashboard journey tools, steps, charts, meal planning, grocery lists, and mindfulness. Premium adds guided workouts, deeper goal review, exports, unlimited AI coaching, and unlimited active bookings.
                  </Text>
                </View>

                {/* Features List */}
                <View style={styles.featuresContainer}>
                  <Text style={styles.featuresTitle}>Premium Benefits Include:</Text>
                  {goalPremiumFeatureItems.map((feature) => (
                    <View key={feature.title} style={styles.featureItem}>
                      <View style={styles.featureIconWrap}>
                        <Ionicons name={feature.icon as any} size={Math.min(hp(2.35), wp(5.2))} color={colors.primary} />
                      </View>
                      <View style={styles.featureCopy}>
                        <Text style={styles.featureText}>{feature.title}</Text>
                        <Text style={styles.featureDescription}>{feature.text}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Payment Info */}
                <View style={styles.card}>
                  <Text style={styles.infoLabel}>Payment Method</Text>
                  <Text style={styles.infoValue}>Credit/Debit Card</Text>
                  <Text style={styles.infoDescription}>
                    We accept all major credit cards. Your payment is processed securely by Stripe.
                  </Text>
                </View>
              </>
            ) : null}

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

                {paymentMethods.length > 0 && (
                  <View style={styles.savedCardsSection}>
                    <View style={styles.paymentSectionHeader}>
                      <Text style={styles.cardInputLabel}>Saved Cards</Text>
                      <Text style={styles.paymentSectionHint}>From Payment Methods</Text>
                    </View>

                    {paymentMethods.map((method) => {
                      const isSelected = !useNewCard && selectedPaymentMethodId === method.id;
                      const hasStripeToken = Boolean(getSavedPaymentMethodStripeId(method));

                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.savedCardOption,
                            isSelected && styles.selectedPaymentOption,
                            !hasStripeToken && styles.unavailablePaymentOption,
                          ]}
                          onPress={() => {
                            setSelectedPaymentMethodId(method.id);
                            setUseNewCard(false);
                          }}
                          activeOpacity={0.85}
                        >
                          <View style={styles.cardCheckbox}>
                            {isSelected && <View style={styles.cardCheckboxDot} />}
                          </View>
                          <View style={styles.savedCardIcon}>
                            <Ionicons name="card" size={22} color={colors.primary} />
                          </View>
                          <View style={styles.cardInfo}>
                            <Text
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.78}
                              style={styles.cardBrand}
                            >
                              {formatCardBrand(method.cardBrand)} ending {method.last4}
                            </Text>
                            <Text style={styles.cardExpiry}>
                              Expires {method.expiryMonth || "--"}/{method.expiryYear || "--"}
                            </Text>
                          </View>
                          {method.isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>Default</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      style={[
                        styles.useNewCardOption,
                        useNewCard && styles.selectedPaymentOption,
                      ]}
                      onPress={() => setUseNewCard(true)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.cardCheckbox}>
                        {useNewCard && <View style={styles.cardCheckboxDot} />}
                      </View>
                      <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                      <Text style={styles.useNewCardText}>Use a new card</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!useNewCard && selectedPaymentMethod && !selectedSavedPaymentStripeId && (
                  <View style={styles.legacyCardNotice}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
                    <Text style={styles.legacyCardNoticeText}>
                      This saved card needs to be re-entered once before it can be used for Premium.
                    </Text>
                  </View>
                )}

                {/* Direct Card Input Section */}
                {(useNewCard || paymentMethods.length === 0) && (
                  <View style={styles.cardInputSection}>
                    <Text style={styles.cardInputLabel}>
                      Card Information
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
                        console.log("🔍 Card details updated:", {
                          complete: details.complete,
                          validCVC: details.validCVC,
                          validExpiryDate: details.validExpiryDate,
                          validNumber: details.validNumber,
                          last4: details.last4,
                          brand: details.brand,
                          expiryMonth: details.expiryMonth,
                          expiryYear: details.expiryYear,
                        });
                        setCardDetails({
                          complete: details.complete,
                          validCVC: details.validCVC,
                          validExpiryDate: details.validExpiryDate,
                          validNumber: details.validNumber,
                          last4: details.last4,
                          brand: details.brand,
                          expiryMonth: details.expiryMonth,
                          expiryYear: details.expiryYear,
                        });
                      }}
                      style={styles.cardField}
                    />
                  </View>
                )}

                {useNewCard && (
                  <View style={styles.cardStatusRow}>
                    <Ionicons
                      name={cardDetails?.complete ? "checkmark-circle" : "information-circle-outline"}
                      size={16}
                      color={cardDetails?.complete ? colors.success : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.cardStatusText,
                        { color: cardDetails?.complete ? colors.success : colors.textSecondary },
                      ]}
                    >
                      {cardDetails?.complete
                        ? "Card ready for secure payment"
                        : "Add card number, expiry date and CVC"}
                    </Text>
                  </View>
                )}

                {/* Price Summary */}
                <View style={styles.priceSummary}>
                  <View>
                    <Text style={styles.summaryLabel}>Premium Plan</Text>
                    <Text style={styles.summaryDescription}>Monthly subscription</Text>
                  </View>
                  <Text style={styles.summaryPrice}>{PREMIUM_PLAN_PRICE_WITH_CENTS}</Text>
                </View>

                {/* Debug: Show card validation status */}
                {false && useNewCard && (
                <View style={{paddingHorizontal: 16, marginBottom: 8}}>
                  <Text style={{fontSize: 12, color: cardDetails?.complete ? '#4CAF50' : '#FF6B6B'}}>
                    {cardDetails?.complete ? '✅ Card complete - ready to pay' : '❌ Card incomplete - fill all fields'}
                  </Text>
                </View>
                )}

                {/* Pay Button */}
                <TouchableOpacity
                  style={[
                    styles.payButton,
                    (!canPayForPremium || processing) && styles.disabledButton,
                  ]}
                  onPress={handlePurchasePremium}
                  disabled={!canPayForPremium || processing}
                >
                  {processing ? (
                    <>
                      <ActivityIndicator color="white" size="small" />
                      <Text style={styles.payButtonText}>Processing...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="card" size={22} color="white" />
                      <Text style={styles.payButtonText}>Pay {PREMIUM_PLAN_PRICE_WITH_CENTS}</Text>
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
                    <Ionicons name="star" size={upgradeButtonIconSize} color={colors.buttonText} />
                    <View style={styles.upgradeButtonTextContainer}>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={styles.upgradeButtonText}
                      >
                        Upgrade to Premium
                      </Text>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                        style={styles.upgradeButtonSubtext}
                      >
                        Unlock deeper tools
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={upgradeButtonChevronSize} color={colors.buttonText} />
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
                Your Premium benefits are active: FitFaat now adds guided workouts, deeper paid insights, exports, unlimited AI coaching, adaptive goal review, and unlimited active bookings.
              </Text>
            </View>

            {/* Subscription Info */}
            <View style={styles.card}>
              <Text style={styles.infoLabel}>Subscription Status</Text>
              <Text style={styles.infoValue}>Active</Text>

              <View style={styles.divider} />

              <Text style={styles.infoLabel}>Plan</Text>
              <Text style={styles.infoValue}>Premium Monthly - {PREMIUM_PLAN_PRICE_LABEL}/month</Text>

              <View style={styles.divider} />

              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {memberSince ? new Date(memberSince).toLocaleDateString() : "Active now"}
              </Text>
            </View>

            {/* Premium Features Available */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Your Premium Benefits:</Text>
              {goalPremiumFeatureItems.map((feature) => (
                <View key={feature.title} style={styles.featureItem}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons name={feature.icon as any} size={Math.min(hp(2.35), wp(5.2))} color={colors.primary} />
                  </View>
                  <View style={styles.featureCopy}>
                    <Text style={styles.featureText}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.text}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.error, borderColor: colors.error }]}
              onPress={handleCancelPremium}
              disabled={processing}
            >
              <Ionicons name="close-circle" size={20} color={colors.buttonText} />
              <Text style={[styles.cancelButtonText, { color: colors.buttonText }]}>Cancel Premium</Text>
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
      backgroundColor: colors.screenColor || '#FFFFFF',
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
    membershipHero: {
      backgroundColor: colors.primary,
      borderRadius: hp(2.4),
      padding: wp(5),
      marginTop: hp(0.5),
      marginBottom: hp(2),
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.26,
      shadowRadius: 14,
      elevation: 6,
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: wp(3),
    },
    heroIcon: {
      width: Math.min(hp(6.4), wp(14)),
      height: Math.min(hp(6.4), wp(14)),
      borderRadius: hp(1.8),
      backgroundColor: "rgba(255, 255, 255, 0.16)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.28)",
      alignItems: "center",
      justifyContent: "center",
    },
    heroCopy: {
      flex: 1,
      minWidth: 0,
    },
    heroEyebrow: {
      color: "rgba(255, 255, 255, 0.78)",
      fontSize: Math.min(hp(1.45), wp(3.25)),
      fontWeight: "800",
      letterSpacing: 0,
      textTransform: "uppercase",
    },
    heroTitle: {
      marginTop: hp(0.45),
      color: colors.textOnPrimary || "#FFFFFF",
      fontSize: Math.min(hp(3), wp(6.4)),
      lineHeight: hp(3.45),
      fontWeight: "900",
      letterSpacing: 0,
    },
    heroSubtitle: {
      marginTop: hp(0.8),
      color: "rgba(255, 255, 255, 0.82)",
      fontSize: Math.min(hp(1.5), wp(3.35)),
      lineHeight: hp(2.15),
      fontWeight: "600",
    },
    heroStatsRow: {
      flexDirection: "row",
      gap: wp(2.5),
      marginTop: hp(2),
    },
    heroStat: {
      flex: 1,
      minWidth: 0,
      borderRadius: hp(1.6),
      paddingHorizontal: wp(3),
      paddingVertical: hp(1.4),
      backgroundColor: "rgba(255, 255, 255, 0.13)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    heroStatValue: {
      color: colors.textOnPrimary || "#FFFFFF",
      fontSize: Math.min(hp(1.75), wp(3.9)),
      fontWeight: "900",
      letterSpacing: 0,
    },
    heroStatLabel: {
      marginTop: hp(0.45),
      color: "rgba(255, 255, 255, 0.78)",
      fontSize: Math.min(hp(1.22), wp(2.85)),
      lineHeight: hp(1.65),
      fontWeight: "700",
    },
    goalPremiumCard: {
      backgroundColor: colors.cardBackground || "#FFFFFF",
      borderRadius: hp(2),
      padding: wp(4),
      marginBottom: hp(2),
      borderWidth: 1,
      borderColor: colors.cardBorder || "#E8EEF3",
      gap: hp(1.2),
    },
    goalPremiumHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: wp(2.8),
    },
    goalPremiumIcon: {
      width: Math.min(hp(5.2), wp(11.5)),
      height: Math.min(hp(5.2), wp(11.5)),
      borderRadius: Math.min(hp(2.6), wp(5.75)),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    goalPremiumCopy: {
      flex: 1,
      minWidth: 0,
    },
    goalPremiumEyebrow: {
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    goalPremiumTitle: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.75), wp(4)),
      lineHeight: hp(2.35),
      fontWeight: "900",
      marginTop: hp(0.25),
    },
    goalPremiumBody: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.22), wp(2.85)),
      lineHeight: hp(1.75),
      fontWeight: "700",
      marginTop: hp(0.35),
    },
    goalPremiumFeatureList: {
      gap: hp(0.75),
    },
    goalPremiumFeatureRow: {
      minHeight: hp(4.6),
      borderRadius: hp(1.25),
      backgroundColor: colors.primarySoft || `${colors.primary}12`,
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
      paddingHorizontal: wp(2.6),
      paddingVertical: hp(0.75),
    },
    goalPremiumFeatureText: {
      flex: 1,
      minWidth: 0,
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.1), wp(2.65)),
      lineHeight: hp(1.55),
      fontWeight: "800",
    },
    trialCard: {
      backgroundColor: colors.cardBackground || "#FFFFFF",
      borderRadius: hp(2),
      padding: wp(4),
      marginBottom: hp(2),
      borderWidth: 1,
      borderColor: colors.cardBorder || "#E8EEF3",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    trialHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: wp(3),
      marginBottom: hp(1.3),
    },
    trialTitle: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(2), wp(4.5)),
      fontWeight: "900",
      letterSpacing: 0,
    },
    trialSubtitle: {
      marginTop: hp(0.5),
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.32), wp(3.05)),
      lineHeight: hp(1.9),
      fontWeight: "600",
      maxWidth: wp(62),
    },
    trialCountPill: {
      minWidth: wp(13),
      borderRadius: hp(1.5),
      paddingHorizontal: wp(2.3),
      paddingVertical: hp(0.8),
      backgroundColor: `${colors.primary}12`,
      alignItems: "center",
      borderWidth: 1,
      borderColor: `${colors.primary}26`,
    },
    trialCountText: {
      color: colors.primary,
      fontSize: Math.min(hp(2), wp(4.4)),
      fontWeight: "900",
      lineHeight: hp(2.2),
    },
    trialCountLabel: {
      color: colors.primary,
      fontSize: Math.min(hp(1.1), wp(2.5)),
      fontWeight: "800",
      textTransform: "uppercase",
    },
    trialRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: hp(1.1),
      borderTopWidth: 1,
      borderTopColor: colors.border || "#EEF2F7",
      gap: wp(2.4),
    },
    trialIconWrap: {
      width: Math.min(hp(4.4), wp(9.5)),
      height: Math.min(hp(4.4), wp(9.5)),
      borderRadius: hp(1.3),
      backgroundColor: `${colors.primary}12`,
      alignItems: "center",
      justifyContent: "center",
    },
    trialCopy: {
      flex: 1,
      minWidth: 0,
    },
    trialFeatureName: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.68), wp(3.8)),
      fontWeight: "900",
      letterSpacing: 0,
    },
    trialFeatureMeta: {
      marginTop: hp(0.25),
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.24), wp(2.9)),
      fontWeight: "700",
      lineHeight: hp(1.7),
    },
    trialBadge: {
      maxWidth: wp(39),
      minWidth: wp(29),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(1),
      borderRadius: hp(1.3),
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.75),
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    trialBadgeActive: {
      backgroundColor: `${colors.primary}10`,
      borderColor: `${colors.primary}30`,
    },
    trialBadgePending: {
      backgroundColor: `${colors.primary}0D`,
      borderColor: `${colors.primary}24`,
    },
    trialBadgePremium: {
      backgroundColor: `${colors.success || colors.primary}12`,
      borderColor: `${colors.success || colors.primary}30`,
    },
    trialBadgeLocked: {
      backgroundColor: "#F8FAFC",
      borderColor: "#E2E8F0",
    },
    trialBadgeText: {
      flex: 1,
      minWidth: 0,
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.18), wp(2.75)),
      fontWeight: "900",
      letterSpacing: 0,
      textAlign: "center",
    },
    trialBadgeTextActive: {
      color: colors.primary,
    },
    trialBadgeTextPremium: {
      color: colors.success || colors.primary,
    },
    trialBadgeTextLocked: {
      color: colors.textSecondary,
    },
    previewHeader: {
      marginBottom: hp(1.5),
      paddingHorizontal: wp(1),
    },
    previewTitle: {
      fontSize: Math.min(hp(2.8), wp(6)),
      fontWeight: "900",
      color: colors.textPrimary,
      letterSpacing: 0,
    },
    previewSubtitle: {
      marginTop: hp(0.5),
      fontSize: Math.min(hp(1.6), wp(3.55)),
      color: colors.textSecondary,
      fontWeight: "600",
      lineHeight: hp(2.3),
    },
    previewGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: hp(2),
      gap: wp(2),
    },
    previewCard: {
      width: "48%",
      minHeight: hp(17),
      backgroundColor: colors.cardBackground || "#FFFFFF",
      borderRadius: hp(1.5),
      padding: wp(3.5),
      borderWidth: 1,
      borderColor: colors.cardBorder || "#F0F0F0",
      overflow: "hidden",
      justifyContent: "flex-start",
    },
    previewCardTitle: {
      marginTop: hp(1),
      fontSize: Math.min(hp(1.75), wp(3.9)),
      fontWeight: "900",
      color: colors.textPrimary,
    },
    previewCardText: {
      marginTop: hp(0.5),
      fontSize: Math.min(hp(1.35), wp(3)),
      color: colors.textSecondary,
      lineHeight: hp(1.9),
      fontWeight: "600",
    },
    previewLockOverlay: {
      position: "absolute",
      top: wp(2.2),
      right: wp(2.2),
      width: hp(3.5),
      height: hp(3.5),
      borderRadius: hp(1.75),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      overflow: "hidden",
    },
    comparisonCard: {
      backgroundColor: colors.cardBackground || "#FFFFFF",
      borderRadius: hp(2.1),
      padding: wp(4),
      marginBottom: hp(2.2),
      borderWidth: 1,
      borderColor: colors.cardBorder || "#E8EEF3",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 4,
    },
    comparisonHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: wp(3),
      marginBottom: hp(1.4),
    },
    comparisonTitleWrap: {
      flex: 1,
      minWidth: 0,
    },
    comparisonEyebrow: {
      color: colors.primary,
      fontSize: Math.min(hp(1.12), wp(2.7)),
      fontWeight: "900",
      letterSpacing: 0,
      textTransform: "uppercase",
    },
    comparisonTitle: {
      marginTop: hp(0.25),
      fontSize: Math.min(hp(2), wp(4.4)),
      fontWeight: "900",
      color: colors.textPrimary,
      letterSpacing: 0,
    },
    comparisonSubtitle: {
      marginTop: hp(0.55),
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.28), wp(3)),
      lineHeight: hp(1.85),
      fontWeight: "700",
    },
    comparisonHeaderIcon: {
      width: Math.min(hp(4.8), wp(10.6)),
      height: Math.min(hp(4.8), wp(10.6)),
      borderRadius: hp(1.45),
      backgroundColor: `${colors.primary}12`,
      borderWidth: 1,
      borderColor: `${colors.primary}28`,
      alignItems: "center",
      justifyContent: "center",
    },
    comparisonLegend: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: wp(1.5),
      paddingVertical: hp(1),
      paddingHorizontal: wp(2.4),
      borderRadius: hp(1.5),
      backgroundColor: colors.surface || "#F8FAFC",
      borderWidth: 1,
      borderColor: colors.border || "#EEF2F7",
      marginBottom: hp(1.4),
    },
    comparisonPlanHeader: {
      flexDirection: "row",
      gap: wp(2.4),
      marginBottom: hp(1.2),
    },
    comparisonPlanHeaderCell: {
      flex: 1,
      minWidth: 0,
      borderRadius: hp(1.5),
      paddingHorizontal: wp(3),
      paddingVertical: hp(1.15),
      backgroundColor: colors.surface || "#F8FAFC",
      borderWidth: 1,
      borderColor: colors.border || "#EEF2F7",
    },
    comparisonPlanHeaderPremiumCell: {
      backgroundColor: `${colors.primary}0F`,
      borderColor: `${colors.primary}2E`,
    },
    comparisonPlanKicker: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0,
    },
    comparisonPlanName: {
      marginTop: hp(0.25),
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.48), wp(3.35)),
      fontWeight: "900",
    },
    comparisonRow: {
      paddingTop: hp(1.25),
      marginTop: hp(0.3),
      borderTopWidth: 1,
      borderTopColor: colors.border || "#EEF2F7",
      gap: hp(0.9),
    },
    comparisonFeatureHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2.1),
    },
    comparisonFeatureIcon: {
      width: Math.min(hp(3.6), wp(8)),
      height: Math.min(hp(3.6), wp(8)),
      borderRadius: hp(1.1),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.primary}12`,
    },
    comparisonLabel: {
      flex: 1,
      minWidth: 0,
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.52), wp(3.45)),
      fontWeight: "900",
    },
    comparisonAccessGrid: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: wp(2.4),
    },
    comparisonAccessCell: {
      flex: 1,
      minWidth: 0,
      borderRadius: hp(1.45),
      paddingHorizontal: wp(2.7),
      paddingVertical: hp(1.15),
      backgroundColor: colors.surface || "#F8FAFC",
      borderWidth: 1,
      borderColor: colors.border || "#EEF2F7",
    },
    comparisonPremiumAccessCell: {
      backgroundColor: `${colors.primary}0B`,
      borderColor: `${colors.primary}24`,
    },
    comparisonAccessHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: wp(1.4),
      marginBottom: hp(0.7),
    },
    comparisonAccessPlan: {
      flexShrink: 1,
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0,
    },
    comparisonFree: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.28), wp(3)),
      fontWeight: "700",
      lineHeight: hp(1.75),
    },
    comparisonPremium: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.28), wp(3)),
      fontWeight: "800",
      lineHeight: hp(1.75),
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
      fontSize: Math.min(hp(2.2), wp(4.8)),
      fontWeight: "900",
      color: colors.textPrimary || colors.text,
      marginBottom: hp(2),
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: hp(1.7),
      gap: wp(2.6),
    },
    featureIconWrap: {
      width: Math.min(hp(4.4), wp(9.8)),
      height: Math.min(hp(4.4), wp(9.8)),
      borderRadius: hp(1.25),
      backgroundColor: `${colors.primary}14`,
      alignItems: "center",
      justifyContent: "center",
    },
    featureCopy: {
      flex: 1,
      minWidth: 0,
    },
    featureText: {
      fontSize: Math.min(hp(1.78), wp(4)),
      color: colors.textPrimary || colors.text,
      fontWeight: "900",
      flex: 1,
    },
    featureDescription: {
      marginTop: hp(0.35),
      fontSize: Math.min(hp(1.34), wp(3.05)),
      color: colors.textSecondary || "#666",
      fontWeight: "600",
      lineHeight: hp(1.95),
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
      paddingHorizontal: 0,
    },
    paymentSectionHeader: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: wp(2),
      marginBottom: hp(1.2),
    },
    paymentSectionHint: {
      flexShrink: 1,
      color: "#94A3B8",
      fontSize: hp(1.35),
      fontWeight: "600",
      textAlign: "right",
    },
    savedCardOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: wp(3.2),
      paddingVertical: hp(1.35),
      marginBottom: hp(1),
      borderRadius: hp(1.4),
      borderWidth: 2,
      borderColor: "#E2E8F0",
      backgroundColor: "#F8FAFC",
    },
    selectedPaymentOption: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    unavailablePaymentOption: {
      opacity: 0.7,
    },
    cardCheckbox: {
      width: hp(2.5),
      height: hp(2.5),
      borderRadius: hp(1.25),
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: "white",
      justifyContent: "center",
      alignItems: "center",
      marginRight: wp(2.4),
    },
    cardCheckboxDot: {
      width: hp(1.15),
      height: hp(1.15),
      borderRadius: hp(0.58),
      backgroundColor: colors.primary,
    },
    savedCardIcon: {
      width: hp(4.2),
      height: hp(4.2),
      borderRadius: hp(1.2),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.primary}14`,
      marginRight: wp(2.6),
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
      marginLeft: wp(1.5),
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
      paddingHorizontal: wp(3.2),
      paddingVertical: hp(1.35),
      borderRadius: hp(1.4),
      borderWidth: 2,
      borderColor: "#E2E8F0",
      backgroundColor: "#F8FAFC",
    },
    useNewCardText: {
      flex: 1,
      minWidth: 0,
      marginLeft: wp(2.4),
      color: colors.textPrimary,
      fontSize: hp(1.75),
      fontWeight: "800",
    },
    cardInputSection: {
      marginBottom: hp(2.5),
      backgroundColor: "#FFFFFF",
      borderRadius: hp(1.8),
      borderWidth: 1.5,
      borderColor: "#E2E8F0",
      padding: wp(4),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 2,
    },
    cardInputLabel: {
      fontSize: hp(1.95),
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: hp(1.2),
      letterSpacing: 0.2,
    },
    cardField: {
      width: "100%",
      height: Math.max(hp(6.4), 54),
      marginTop: hp(0.3),
      marginBottom: hp(0.6),
      borderRadius: hp(1.5),
      backgroundColor: "#FAFAFA",
    },
    legacyCardNotice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: wp(2),
      padding: wp(3),
      borderRadius: hp(1.2),
      backgroundColor: `${colors.warning}12`,
      marginBottom: hp(2),
    },
    legacyCardNoticeText: {
      flex: 1,
      minWidth: 0,
      color: colors.textSecondary,
      fontSize: hp(1.45),
      fontWeight: "600",
      lineHeight: hp(2),
    },
    cardStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      paddingHorizontal: wp(1),
      marginBottom: hp(1.4),
    },
    cardStatusText: {
      flex: 1,
      minWidth: 0,
      fontSize: hp(1.45),
      fontWeight: "700",
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
      justifyContent: "center",
      alignSelf: "center",
      width: "100%",
      minHeight: hp(8.2),
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.8),
      marginBottom: hp(3),
      marginHorizontal: 0,
      marginTop: hp(2),
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.3)",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
      overflow: "hidden",
    },
    upgradeButtonContent: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      gap: wp(2.4),
      paddingHorizontal: 0,
    },
    upgradeButtonTextContainer: {
      flex: 1,
      minWidth: 0,
      justifyContent: "center",
    },
    upgradeButtonText: {
      width: "100%",
      fontSize: hp(2.35),
      fontWeight: "800",
      color: colors.buttonText,
      includeFontPadding: false,
      lineHeight: hp(2.75),
      letterSpacing: 0,
    },
    upgradeButtonSubtext: {
      width: "100%",
      fontSize: hp(1.6),
      color: "rgba(255, 255, 255, 0.85)",
      marginTop: hp(0.5),
      fontWeight: "500",
      includeFontPadding: false,
      lineHeight: hp(1.9),
      letterSpacing: 0,
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
      borderColor: colors.error,
      backgroundColor: colors.error,
      marginBottom: hp(3),
      gap: wp(2),
      shadowColor: colors.error,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.22,
      shadowRadius: 6,
      elevation: 4,
    },
    cancelButtonText: {
      fontSize: hp(2),
      fontWeight: "bold",
      color: colors.buttonText,
    },
  });
