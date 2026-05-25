import { getIsPremiumUser } from "@/utils/premiumAccess";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";

const WORKOUT_LOCK_ROUTE = "/(main)/(exercises)/workout";

export const useRequirePremiumWorkoutAccess = () => {
  const router = useRouter();
  const [checkingPremiumAccess, setCheckingPremiumAccess] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const checkAccess = async () => {
        setCheckingPremiumAccess(true);
        const hasPremiumAccess = await getIsPremiumUser();

        if (!isActive) {
          return;
        }

        if (!hasPremiumAccess) {
          router.replace(WORKOUT_LOCK_ROUTE);
          return;
        }

        setCheckingPremiumAccess(false);
      };

      checkAccess();

      return () => {
        isActive = false;
      };
    }, [router])
  );

  return checkingPremiumAccess;
};
