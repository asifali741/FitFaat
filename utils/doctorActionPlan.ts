export type DoctorActionPlan = {
  schemaVersion: 1;
  durationDays: number;
  dietTargets: string;
  waterGoal: string;
  foodsToAvoid: string;
  notes: string;
  nextAppointment: string;
  createdAt: string;
};

export type DoctorActionPlanInput = {
  durationDays?: number;
  dietTargets: string;
  waterGoal: string;
  foodsToAvoid: string;
  notes: string;
  nextAppointment: string;
};

const ACTION_PLAN_PREFIX = "[[FITFAAT_DOCTOR_ACTION_PLAN_V1]]";

const cleanText = (value: string) => value.trim().replace(/\s+/g, " ");

export const createDoctorActionPlan = (input: DoctorActionPlanInput): DoctorActionPlan => ({
  schemaVersion: 1,
  durationDays: Math.max(1, Math.min(30, Math.round(Number(input.durationDays || 7)))),
  dietTargets: cleanText(input.dietTargets),
  waterGoal: cleanText(input.waterGoal),
  foodsToAvoid: cleanText(input.foodsToAvoid),
  notes: cleanText(input.notes),
  nextAppointment: cleanText(input.nextAppointment),
  createdAt: new Date().toISOString(),
});

export const buildDoctorActionPlanPlainText = (plan: DoctorActionPlan) =>
  [
    `Doctor Action Plan (${plan.durationDays} days)`,
    `Diet targets: ${plan.dietTargets || "Follow doctor's diet guidance"}`,
    `Water goal: ${plan.waterGoal || "Keep hydration consistent"}`,
    `Foods to avoid: ${plan.foodsToAvoid || "Not specified"}`,
    `Notes: ${plan.notes || "No extra notes"}`,
    `Next appointment: ${plan.nextAppointment || "Not scheduled"}`,
  ].join("\n");

export const buildDoctorActionPlanMessage = (plan: DoctorActionPlan) =>
  `${ACTION_PLAN_PREFIX}${JSON.stringify(plan)}\n${buildDoctorActionPlanPlainText(plan)}`;

export const parseDoctorActionPlanMessage = (message?: string | null): DoctorActionPlan | null => {
  if (!message?.startsWith(ACTION_PLAN_PREFIX)) return null;

  const firstLine = message.split(/\r?\n/)[0] || "";
  const rawJson = firstLine.slice(ACTION_PLAN_PREFIX.length);

  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || parsed.schemaVersion !== 1) return null;

    return {
      schemaVersion: 1,
      durationDays: Math.max(1, Math.min(30, Math.round(Number(parsed.durationDays || 7)))),
      dietTargets: String(parsed.dietTargets || ""),
      waterGoal: String(parsed.waterGoal || ""),
      foodsToAvoid: String(parsed.foodsToAvoid || ""),
      notes: String(parsed.notes || ""),
      nextAppointment: String(parsed.nextAppointment || ""),
      createdAt: String(parsed.createdAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
};

