import { useEffect, useState } from "react";
import {
  getLiveWalkingProgressSnapshot,
  startLiveWalkingProgress,
  subscribeLiveWalkingProgress,
  type WalkingProgressSnapshot,
} from "@/utils/liveWalkingProgress";

export const useLiveWalkingProgress = (
  options: { autoStart?: boolean } = {}
): WalkingProgressSnapshot => {
  const { autoStart = true } = options;
  const [snapshot, setSnapshot] = useState<WalkingProgressSnapshot>(
    getLiveWalkingProgressSnapshot()
  );

  useEffect(() => {
    const unsubscribe = subscribeLiveWalkingProgress(setSnapshot);

    if (autoStart) {
      startLiveWalkingProgress().catch((error) => {
        console.log("[useLiveWalkingProgress] Unable to start live walking progress:", error);
      });
    }

    return unsubscribe;
  }, [autoStart]);

  return snapshot;
};

