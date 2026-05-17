export const legalDocuments = {
  terms: {
    title: "Terms of Service",
    body: `FITFAAT TERMS OF SERVICE

Last updated: May 16, 2026

1. Acceptance of Terms
By creating an account or using FitFaat, you agree to these Terms of Service. If you do not agree, please stop using the app.

2. About FitFaat
FitFaat provides fitness tracking, meal logging, diet suggestions, workout tools, progress charts, chat features, video consultation features, and related wellness content.

3. Health Disclaimer
FitFaat is not a replacement for professional medical advice, diagnosis, or treatment. Fitness, diet, hydration, calorie, and workout information is for general wellness support only. Always consult a qualified doctor or health professional before starting a diet, workout plan, supplement routine, or medical treatment.

4. User Accounts
You are responsible for keeping your account details accurate and secure. Do not share your login credentials, impersonate another person, or use another user's account.

5. User Content and Logs
You may add profile details, photos, food logs, water logs, workout data, chat messages, and health preferences. You are responsible for the information you submit and must not upload harmful, illegal, misleading, abusive, or offensive content.

6. Doctors, Consultations, and Communications
Doctor profiles, appointments, chats, and video calls are provided to help users connect with professionals. FitFaat does not guarantee a specific health outcome from any consultation.

7. Payments and Premium Features
Paid features may be processed through third-party payment providers such as Stripe. Prices, features, and availability may change. Payment information is handled by the payment provider according to its own terms and security practices.

8. Acceptable Use
You agree not to misuse the app, attempt unauthorized access, disrupt services, scrape data, upload malicious files, harass users, or use FitFaat for unlawful purposes.

9. Intellectual Property
FitFaat's design, brand, content, code, graphics, and app experience are owned by FitFaat or licensed to FitFaat. You may not copy, sell, or redistribute app content without permission.

10. Limitation of Liability
FitFaat is provided as-is. To the maximum extent allowed by law, FitFaat is not responsible for indirect damages, health outcomes, data loss, service interruptions, or decisions made based on app content.

11. Account Suspension or Termination
We may suspend or terminate accounts that violate these terms, create risk for other users, abuse the platform, or break applicable laws.

12. Changes to These Terms
We may update these terms as the app grows. Continued use of FitFaat after updates means you accept the revised terms.

Contact: fitfaatpro@gmail.com`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `FITFAAT PRIVACY POLICY

Last updated: May 16, 2026

1. Information We Collect
- Account details: name, email, username, password-related authentication data, and profile picture.
- Fitness and nutrition data: goals, weight, calories, hydration, meals, diet preference, workout activity, progress logs, and streaks.
- Health and consultation data: information you choose to share with doctors, appointment details, chat messages, and call-related metadata.
- Device and app data: device type, app usage, crash details, notification preferences, and basic diagnostics.
- Media and permissions: photos, camera access, microphone access, gallery access, and notification access only when you choose to use related features.
- Payment data: premium plan and payment status. Card details are processed by third-party providers such as Stripe and are not stored by FitFaat.

2. How We Use Information
- Create and manage your account.
- Personalize diet, workout, calorie, hydration, and progress experiences.
- Show charts, dashboards, reminders, badges, and history.
- Support doctor appointments, chat, and video call features.
- Improve app performance, security, and reliability.
- Send important account, health tracking, and notification updates.

3. Local and Offline Data
Some data may be stored locally on your device using secure or local app storage so the app can remember preferences, mock/demo data, progress entries, filters, and settings.

4. Sharing of Information
We do not sell your personal data. We may share limited data with:
- Doctors or health professionals when you use consultation features.
- Service providers that help operate the app, authentication, notifications, hosting, analytics, or payments.
- Legal authorities if required by law or needed to protect users and the platform.

5. Data Security
We use reasonable technical and organizational safeguards to protect user data. No app or internet service can guarantee complete security.

6. Your Choices
You may update profile details, control app permissions from your device settings, change notification settings, remove some local data by signing out or clearing app data, and request account or data support by contacting us.

7. Data Retention
We keep information for as long as needed to provide the app, comply with legal obligations, resolve disputes, prevent abuse, and maintain records. Some local data remains on your device until removed.

8. Children's Privacy
FitFaat is not intended for children under 13. If you believe a child has provided personal information, contact us so we can review and remove it where appropriate.

9. Third-Party Services
FitFaat may use third-party services for payments, notifications, maps or media, authentication, video calls, analytics, and infrastructure. Their privacy practices may apply when their services are used.

10. Changes to This Policy
We may update this policy when features, legal requirements, or data practices change. Continued use of FitFaat means you accept the updated policy.

Contact: fitfaatpro@gmail.com`,
  },
  licenses: {
    title: "Open Source Licenses",
    body: `FITFAAT OPEN SOURCE LICENSES

Last updated: May 16, 2026

FitFaat uses open-source software and third-party SDKs. These projects remain owned by their respective authors and are used under their published licenses.

Core app libraries:
- React
- React Native
- Expo SDK
- Expo Router
- TypeScript
- React Navigation
- React Native Reanimated
- React Native Gesture Handler
- React Native Screens
- React Native Safe Area Context
- React Native SVG
- React Native Responsive Screen

Expo and native modules:
- Expo Secure Store
- Expo Notifications
- Expo Image Picker
- Expo Camera
- Expo AV
- Expo Font
- Expo Splash Screen
- Expo Status Bar
- Expo Navigation Bar
- Expo Haptics
- Expo Blur
- Expo Constants

Data, UI, and utility libraries:
- Axios
- Day.js
- AsyncStorage
- NativeWind
- Tailwind CSS
- React Native Chart Kit
- React Native Progress
- React Native WebView
- React Native Vector Icons
- Lucide/vector icon packages where included

Communication and payment SDKs:
- Socket.IO Client
- Stripe React Native
- ZegoCloud/Zego video and chat SDK packages

Development tools:
- Babel
- ESLint
- Prettier
- Metro

Most JavaScript libraries used in this app are distributed under permissive licenses such as MIT, Apache-2.0, or BSD-style licenses. Any proprietary SDKs or services are governed by their own vendor terms.

License notices are retained in package metadata and dependency files. For detailed license text, review the installed package LICENSE files or the official package repositories.`,
  },
} as const;

export type LegalDocumentKey = keyof typeof legalDocuments;
