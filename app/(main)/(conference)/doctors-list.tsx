import BackButton from '@/components/BackButton';
import AnimatedPressable from '@/components/common/AnimatedPressable';
import FilterChips from '@/components/common/FilterChips';
import PremiumTeaserCard from '@/components/common/PremiumTeaserCard';
import SmartEmptyState from '@/components/common/SmartEmptyState';
import { theme } from "@/constants/theme";
import { useTheme } from '@/contexts/ThemeContext';
import { getIsPremiumUser } from '@/utils/premiumAccess';
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Doctor, getDoctorsByDate } from "./_doctorsData";

const doctorDiscoveryMeta: Record<string, { symptoms: string[]; visitReasons: string[] }> = {
  Physiotherapist: {
    symptoms: ['back pain', 'knee pain', 'stiffness', 'injury recovery'],
    visitReasons: ['Pain relief', 'Mobility check', 'Rehab plan'],
  },
  Nutritionist: {
    symptoms: ['weight gain', 'low energy', 'cravings', 'meal planning'],
    visitReasons: ['Diet plan', 'Weight goal', 'Macro review'],
  },
  'Sports Medicine': {
    symptoms: ['sports injury', 'muscle strain', 'joint pain', 'performance'],
    visitReasons: ['Injury consult', 'Training clearance', 'Recovery plan'],
  },
  'General Physician': {
    symptoms: ['fatigue', 'routine checkup', 'body pain', 'wellness'],
    visitReasons: ['General consult', 'Health review', 'Follow-up'],
  },
};

const getDoctorMeta = (doctor: Doctor) => (
  doctorDiscoveryMeta[doctor.specialty] || {
    symptoms: doctor.tags.map((tag) => tag.toLowerCase()),
    visitReasons: ['Consultation', 'Follow-up', 'Health review'],
  }
);

const getFeeValue = (fee: string) => Number(String(fee).replace(/[^0-9.]/g, '')) || 0;

const getAvailabilityBucket = (time: string) => {
  const normalized = time.toLowerCase();
  const hourMatch = normalized.match(/(\d{1,2})/);
  const hour = hourMatch ? Number(hourMatch[1]) : 12;
  const isPm = normalized.includes('pm');
  const hour24 = isPm && hour !== 12 ? hour + 12 : !isPm && hour === 12 ? 0 : hour;
  if (hour24 < 12) return 'morning';
  if (hour24 < 17) return 'afternoon';
  return 'evening';
};

export default function DoctorsListScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const doctors = getDoctorsByDate(date);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [visitReasonFilter, setVisitReasonFilter] = useState('all');
  const [symptomFilter, setSymptomFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [feeFilter, setFeeFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getIsPremiumUser().then((premiumActive) => {
      if (isMounted) {
        setIsPremium(premiumActive);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const specialtyOptions = useMemo(() => {
    const specialties = Array.from(new Set(doctors.map((doctor) => doctor.specialty)));
    return [
      { label: 'All', value: 'all', icon: 'medkit-outline' as const, badge: doctors.length },
      ...specialties.map((specialty) => ({
        label: specialty,
        value: specialty.toLowerCase(),
        icon: 'ribbon-outline' as const,
        badge: doctors.filter((doctor) => doctor.specialty === specialty).length,
      })),
    ];
  }, [doctors]);

  const visitReasonOptions = useMemo(() => {
    const reasons = Array.from(new Set(doctors.flatMap((doctor) => getDoctorMeta(doctor).visitReasons)));
    return [
      { label: 'Any reason', value: 'all', icon: 'clipboard-outline' as const, badge: doctors.length },
      ...reasons.map((reason) => ({
        label: reason,
        value: reason.toLowerCase(),
        icon: 'reader-outline' as const,
        badge: doctors.filter((doctor) => getDoctorMeta(doctor).visitReasons.includes(reason)).length,
      })),
    ];
  }, [doctors]);

  const symptomOptions = useMemo(() => {
    const symptoms = Array.from(new Set(doctors.flatMap((doctor) => getDoctorMeta(doctor).symptoms)));
    return [
      { label: 'Any symptom', value: 'all', icon: 'search-outline' as const, badge: doctors.length },
      ...symptoms.slice(0, 8).map((symptom) => ({
        label: symptom.charAt(0).toUpperCase() + symptom.slice(1),
        value: symptom,
        icon: 'pulse-outline' as const,
        badge: doctors.filter((doctor) => getDoctorMeta(doctor).symptoms.includes(symptom)).length,
      })),
    ];
  }, [doctors]);

  const ratingOptions = useMemo(
    () => [
      { label: 'Any rating', value: 'all', icon: 'star-outline' as const, badge: doctors.length },
      { label: '4.5+', value: '4.5', icon: 'star-half-outline' as const, badge: doctors.filter((doctor) => doctor.rating >= 4.5).length },
      { label: '4.8+', value: '4.8', icon: 'star' as const, badge: doctors.filter((doctor) => doctor.rating >= 4.8).length },
    ],
    [doctors]
  );

  const feeOptions = useMemo(
    () => [
      { label: 'Any fee', value: 'all', icon: 'cash-outline' as const, badge: doctors.length },
      { label: 'Budget', value: 'budget', icon: 'wallet-outline' as const, badge: doctors.filter((doctor) => getFeeValue(doctor.consultationFee) <= 45).length },
      { label: 'Standard', value: 'standard', icon: 'card-outline' as const, badge: doctors.filter((doctor) => getFeeValue(doctor.consultationFee) <= 55).length },
      { label: 'Premium', value: 'premium', icon: 'diamond-outline' as const, badge: doctors.filter((doctor) => getFeeValue(doctor.consultationFee) > 55).length },
    ],
    [doctors]
  );

  const availabilityOptions = useMemo(
    () => [
      { label: 'Any time', value: 'all', icon: 'time-outline' as const, badge: doctors.length },
      { label: 'Morning', value: 'morning', icon: 'sunny-outline' as const, badge: doctors.filter((doctor) => doctor.availableTimes.some((time) => getAvailabilityBucket(time) === 'morning')).length },
      { label: 'Afternoon', value: 'afternoon', icon: 'partly-sunny-outline' as const, badge: doctors.filter((doctor) => doctor.availableTimes.some((time) => getAvailabilityBucket(time) === 'afternoon')).length },
      { label: 'Evening', value: 'evening', icon: 'moon-outline' as const, badge: doctors.filter((doctor) => doctor.availableTimes.some((time) => getAvailabilityBucket(time) === 'evening')).length },
    ],
    [doctors]
  );

  const filteredDoctors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const meta = getDoctorMeta(doctor);
      const searchable = [
        doctor.name,
        doctor.email,
        doctor.specialty,
        doctor.experience,
        doctor.consultationFee,
        doctor.rating,
        ...doctor.tags,
        ...meta.symptoms,
        ...meta.visitReasons,
        ...doctor.availableTimes,
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesSpecialty = specialtyFilter === 'all' || doctor.specialty.toLowerCase() === specialtyFilter;
      const matchesVisitReason = visitReasonFilter === 'all' || meta.visitReasons.some((reason) => reason.toLowerCase() === visitReasonFilter);
      const matchesSymptom = symptomFilter === 'all' || meta.symptoms.includes(symptomFilter);
      const matchesRating = ratingFilter === 'all' || doctor.rating >= Number(ratingFilter);
      const feeValue = getFeeValue(doctor.consultationFee);
      const matchesFee =
        feeFilter === 'all' ||
        (feeFilter === 'budget' && feeValue <= 45) ||
        (feeFilter === 'standard' && feeValue <= 55) ||
        (feeFilter === 'premium' && feeValue > 55);
      const matchesAvailability = availabilityFilter === 'all' || doctor.availableTimes.some((time) => getAvailabilityBucket(time) === availabilityFilter);
      return matchesSearch && matchesSpecialty && matchesVisitReason && matchesSymptom && matchesRating && matchesFee && matchesAvailability;
    });
  }, [availabilityFilter, doctors, feeFilter, ratingFilter, searchQuery, specialtyFilter, symptomFilter, visitReasonFilter]);

  const handleDoctorSelect = (doctorId: string) => {
    router.push({
      pathname: "/(main)/(conference)/doctor-details" as any,
      params: { doctorId, date }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton style={styles.backButton} testID="doctorslist-back" />
          <Text style={styles.headerTitle}>Consultants Available</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.dateInfoContainer}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <Text style={styles.dateInfo}>
              {new Date(date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric"
              })}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Consultants Available on this Date:</Text>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search symptom, specialty, doctor"
              placeholderTextColor={colors.textSecondary}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <FilterChips
            options={specialtyOptions}
            selectedValue={specialtyFilter}
            onChange={setSpecialtyFilter}
            colors={colors}
            style={styles.filterChips}
          />

          <Text style={styles.filterLabel}>Visit reason</Text>
          <FilterChips
            options={visitReasonOptions}
            selectedValue={visitReasonFilter}
            onChange={setVisitReasonFilter}
            colors={colors}
            style={styles.filterChips}
          />

          <Text style={styles.filterLabel}>Symptoms</Text>
          <FilterChips
            options={symptomOptions}
            selectedValue={symptomFilter}
            onChange={setSymptomFilter}
            colors={colors}
            style={styles.filterChips}
          />

          <View style={styles.compactFilterGrid}>
            <View style={styles.compactFilterItem}>
              <Text style={styles.filterLabel}>Rating</Text>
              <FilterChips
                options={ratingOptions}
                selectedValue={ratingFilter}
                onChange={setRatingFilter}
                colors={colors}
                style={styles.compactFilterChips}
              />
            </View>
            <View style={styles.compactFilterItem}>
              <Text style={styles.filterLabel}>Fee</Text>
              <FilterChips
                options={feeOptions}
                selectedValue={feeFilter}
                onChange={setFeeFilter}
                colors={colors}
                style={styles.compactFilterChips}
              />
            </View>
          </View>

          <Text style={styles.filterLabel}>Availability</Text>
          <FilterChips
            options={availabilityOptions}
            selectedValue={availabilityFilter}
            onChange={setAvailabilityFilter}
            colors={colors}
            style={styles.filterChips}
          />

          <ScrollView
            style={styles.doctorsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.doctorsListContent}
          >
            {!isPremium ? (
              <PremiumTeaserCard
                compact
                title="Priority Booking"
                subtitle="Preview faster doctor matching, priority slots, and premium booking cues."
                previewTitle="Doctor priority preview"
                icon="calendar-clear-outline"
                metrics={[
                  { label: 'Priority', value: 'Fast', icon: 'flash-outline', color: colors.warning },
                  { label: 'Slots', value: '3+', icon: 'time-outline', color: colors.primary },
                  { label: 'Match', value: '92%', icon: 'medkit-outline', color: colors.success },
                ]}
                bullets={['Early slots', 'Best match', 'Priority cue']}
                style={styles.premiumTeaser}
              />
            ) : null}

            {filteredDoctors.length === 0 ? (
              <SmartEmptyState
                icon="medkit-outline"
                title="No Consultants Found"
                message="Try another specialty, clear search, or choose a different appointment date."
                colors={colors}
                style={styles.emptySmartState}
              />
            ) : (
              filteredDoctors.map((doctor) => {
                const meta = getDoctorMeta(doctor);
                const nextSlots = doctor.availableTimes
                  .filter((time) => availabilityFilter === 'all' || getAvailabilityBucket(time) === availabilityFilter)
                  .slice(0, 3);

                return (
                  <AnimatedPressable
                    key={doctor.id}
                    style={styles.doctorCard}
                    onPress={() => handleDoctorSelect(doctor.id)}
                  >
                    <View style={styles.doctorCardTop}>
                      <View style={styles.avatarContainer}>
                        <Ionicons name="person-circle" size={Math.min(hp(6.8), wp(15))} color={colors.primary} />
                      </View>
                      <View style={styles.doctorInfo}>
                        <View style={styles.doctorNameRow}>
                          <Text style={styles.doctorName} numberOfLines={1}>{doctor.name}</Text>
                          <View style={styles.ratingPill}>
                            <Ionicons name="star" size={Math.min(hp(1.5), wp(3.3))} color={colors.warning} />
                            <Text style={styles.ratingText}>{doctor.rating.toFixed(1)}</Text>
                          </View>
                        </View>
                        <Text style={styles.doctorEmail}>{doctor.specialty} - {doctor.experience}</Text>
                        <Text style={styles.doctorMeta}>{doctor.consultationFee} consultation fee</Text>
                      </View>
                    </View>

                    <View style={styles.reasonRow}>
                      {meta.visitReasons.slice(0, 3).map((reason) => (
                        <Text key={reason} style={styles.reasonPill}>{reason}</Text>
                      ))}
                    </View>

                    <View style={styles.availabilityRow}>
                      <View style={styles.nextAvailableCopy}>
                        <Text style={styles.nextAvailableLabel}>Next available</Text>
                        <Text style={styles.nextAvailableText}>{nextSlots[0] || doctor.availableTimes[0] || 'Ask clinic'}</Text>
                      </View>
                      <View style={styles.slotRow}>
                        {nextSlots.map((slot) => (
                          <Text key={slot} style={styles.slotPill}>{slot}</Text>
                        ))}
                      </View>
                    </View>

                    <View style={styles.doctorCardFooter}>
                      <Text style={styles.symptomText} numberOfLines={1}>
                        Helps with {meta.symptoms.slice(0, 3).join(', ')}
                      </Text>
                      <View style={styles.bookButton}>
                        <Text style={styles.bookButtonText}>Book</Text>
                        <Ionicons name="chevron-forward" size={Math.min(hp(1.8), wp(4))} color={colors.textOnPrimary} />
                      </View>
                    </View>
                  </AnimatedPressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    color: colors.textOnPrimary,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(3),
    paddingHorizontal: wp(6),
  },
  dateInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: 15,
    marginBottom: hp(2),
  },
  dateInfo: {
    fontSize: hp(1.8),
    color: colors.textPrimary,
    fontWeight: "600",
    marginLeft: wp(2),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: hp(2),
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: hp(5.5),
    paddingHorizontal: wp(3.5),
    borderRadius: hp(1.6),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    marginBottom: hp(0.6),
    gap: wp(2),
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.75), wp(3.9)),
    fontWeight: "600",
    paddingVertical: hp(1),
  },
  filterChips: {
    paddingHorizontal: 0,
    paddingBottom: hp(1.2),
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: "900",
    marginTop: hp(0.4),
    marginBottom: hp(0.2),
  },
  compactFilterGrid: {
    gap: hp(0.4),
  },
  compactFilterItem: {
    minWidth: 0,
  },
  compactFilterChips: {
    paddingHorizontal: 0,
    paddingBottom: hp(0.8),
  },
  doctorsList: {
    flex: 1,
  },
  doctorsListContent: {
    paddingBottom: hp(3),
  },
  premiumTeaser: {
    marginBottom: hp(1.5),
  },
  doctorCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.8),
    padding: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: wp(3),
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    flex: 1,
    fontSize: hp(2),
    fontWeight: "900",
    color: colors.textPrimary,
  },
  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
    marginBottom: hp(0.5),
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(0.8),
    borderRadius: hp(1.2),
    paddingHorizontal: wp(1.8),
    paddingVertical: hp(0.35),
    backgroundColor: colors.warning + '18',
  },
  ratingText: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.2), wp(2.8)),
    fontWeight: "900",
  },
  doctorEmail: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
  },
  doctorMeta: {
    marginTop: hp(0.4),
    fontSize: hp(1.35),
    color: colors.primary,
    fontWeight: "800",
  },
  reasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(1.5),
    marginTop: hp(1.4),
  },
  reasonPill: {
    overflow: "hidden",
    borderRadius: hp(1.2),
    paddingHorizontal: wp(2.4),
    paddingVertical: hp(0.55),
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: Math.min(hp(1.15), wp(2.7)),
    fontWeight: "900",
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
    marginTop: hp(1.4),
    paddingTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder || colors.border,
  },
  nextAvailableCopy: {
    flexShrink: 0,
  },
  nextAvailableLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.1), wp(2.6)),
    fontWeight: "800",
  },
  nextAvailableText: {
    marginTop: hp(0.25),
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.55), wp(3.5)),
    fontWeight: "900",
  },
  slotRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: wp(1),
  },
  slotPill: {
    overflow: "hidden",
    borderRadius: hp(1),
    paddingHorizontal: wp(1.8),
    paddingVertical: hp(0.45),
    color: colors.textSecondary,
    backgroundColor: colors.screenColor,
    fontSize: Math.min(hp(1.05), wp(2.45)),
    fontWeight: "800",
  },
  doctorCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(2),
    marginTop: hp(1.4),
  },
  symptomText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.25), wp(2.9)),
    fontWeight: "700",
  },
  bookButton: {
    minHeight: hp(3.8),
    borderRadius: hp(1.2),
    backgroundColor: colors.primary,
    paddingHorizontal: wp(3),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(0.8),
  },
  bookButtonText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.3), wp(3)),
    fontWeight: "900",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(10),
  },
  emptySmartState: {
    marginTop: hp(3),
  },
  emptyText: {
    fontSize: hp(2),
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: hp(2),
  },
  emptySubtext: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
    marginTop: hp(1),
  },
});
