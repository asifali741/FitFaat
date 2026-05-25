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
| Steps | 500/day preview | Custom goals, calories, trends | `components/dashboard/StepCounterCard.tsx`, `app/(main)/(steps)/index.tsx` |
| Meal Planner | Basic meals, manual groceries | Macros, notes, ingredients, automated grocery list | `app/(main)/(meal-planner)/index.tsx` |
| Reports Export | Locked | Included | `components/dashboard/DashboardCommandCenter.tsx` |
| Chat History Export | Locked | Included | `app/(main)/(chatbot)/chat-history.tsx` |
| Workout Module | Locked | Full access | `app/(main)/(exercises)/workout.tsx`, `hooks/useRequirePremiumWorkoutAccess.ts` |
| Doctor Appointments | 1 active appointment | Unlimited active appointments | `app/(main)/(conference)/appointment-summary.tsx`, backend `/api/appointments/check-limit` |
| Nutrition Insights | Basic history | Deep insights | `components/dashboard/DashboardCommandCenter.tsx` |
| Personal Coach Feed | Basic tips | Personalized missions | `components/dashboard/PersonalCoachFeed.tsx`, `utils/habitMissions.ts` |
| Adaptive Goals | Basic adjustment | Advanced adjustment | `utils/adaptiveGoals.ts`, dashboard data loaders |
| Readiness Recovery | Basic score | Full recovery cues | `components/dashboard/DashboardCommandCenter.tsx` |
| Mindfulness Library | Core sessions | Full library and history | `app/(main)/(mindfulness)/index.tsx` |
| Heatmap Filters | Basic heatmap | Advanced filters and longer range | `app/(main)/(activity-heatmap)/index.tsx`, `components/dashboard/ActivityHeatmap.tsx` |

## Manual QA

- [ ] Fresh free account sees usable free basics and no Premium-only data leakage.
- [ ] Free account sees locked/upgrade state on exports, workouts, chat export, and pro modules.
- [ ] Free account hits AI and appointment limits with clear upgrade messaging.
- [ ] Premium account sees `Premium` or `Unlimited` badges immediately after payment.
- [ ] Premium account can use all unlocked areas without navigating away and back.
- [ ] Cancelling Premium returns Premium-only surfaces to locked/basic states.
