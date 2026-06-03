# Premium Feature Access Checklist

Use this checklist whenever a Premium feature is changed or a new screen links to one.

## Single Source Of Truth

- [ ] Feature key exists in `utils/featureAccess.ts`.
- [ ] Free limit or Premium entitlement is defined in `utils/featureAccess.ts`.
- [ ] Screen reads access through `getFeatureAccessStatus`, `getFeatureAccessStatuses`, `getIsPremiumUser`, or a backend limit endpoint.
- [ ] UI shows one of the standard badges: `Free`, `Premium`, `Locked`, or `Unlimited`.
- [ ] Payment success unlocks optimistically, then refreshes backend status.

## Premium Gates

| Feature | Free Rule | Premium Rule | Check |
|---|---|---|---|
| AI Coach | 5 messages/day | Unlimited messages | `Control/controls.tsx`, chatbot intro copy, backend `/api/chatbot/check-limit` |
| Steps | Full step totals, custom goals, step calories, and weekly trends | Included for all users | `components/dashboard/StepCounterCard.tsx`, `app/(main)/(steps)/index.tsx` |
| Charts | Advanced chart sections and weekly interpretation | Included for all users; workout/report/export actions keep their own gates | `app/(main)/(dashboard)/charts.tsx` |
| Meal Planner | Meal plans, macros, notes, ingredients, and automated grocery lists | Included for all users | `app/(main)/(meal-planner)/index.tsx` |
| Reports Export | Locked | Included | `components/dashboard/DashboardCommandCenter.tsx` |
| Chat History Export | Locked | Included | `app/(main)/(chatbot)/chat-history.tsx` |
| Workout Module | Locked | Full access | `app/(main)/(exercises)/workout.tsx`, `hooks/useRequirePremiumWorkoutAccess.ts` |
| Doctor Appointments | 1 active appointment | Unlimited active appointments | `app/(main)/(conference)/appointment-summary.tsx`, backend `/api/appointments/check-limit` |
| Nutrition Insights | Basic history | Deep insights | `components/dashboard/DashboardCommandCenter.tsx` |
| Personal Coach Feed | Basic tips | Personalized missions | `components/dashboard/PersonalCoachFeed.tsx`, `utils/habitMissions.ts` |
| Adaptive Goals | Basic adjustment | Advanced adjustment | `utils/adaptiveGoals.ts`, dashboard data loaders |
| Readiness Recovery | Basic score | Full recovery cues | `components/dashboard/DashboardCommandCenter.tsx` |
| Mindfulness Library | Full library, custom timing, and local session history | Included for all users | `app/(main)/(mindfulness)/index.tsx` |
| Heatmap Filters | Basic heatmap | Advanced filters and longer range | `app/(main)/(activity-heatmap)/index.tsx`, `components/dashboard/ActivityHeatmap.tsx` |

## Manual QA

- [ ] Fresh free account can use full Steps, Charts, Meal Planner, and Mindfulness surfaces without upgrade prompts.
- [ ] Free account sees locked/upgrade state on reports export, workout module, chat export, unlimited AI, unlimited appointments, nutrition insights, coach missions, adaptive goals, readiness recovery, and heatmap filters.
- [ ] Free account hits AI and appointment limits with clear upgrade messaging.
- [ ] Premium account sees `Premium` or `Unlimited` badges immediately after payment.
- [ ] Premium account can use all unlocked areas without navigating away and back.
- [ ] Cancelling Premium returns Premium-only surfaces to locked/basic states.
