# ✅ PRE-BUILD VERIFICATION CHECKLIST

Use this checklist to verify all fixes are properly applied before rebuilding.

---

## 🔍 **1. app.config.js Verification**

**Check 1.1: Zego Plugin Added**

```bash
# Run this command:
grep -n "@zegocloud/zego-uikit-prebuilt-call-rn/plugin" app.config.js

# Should show:
# Line XX: "@zegocloud/zego-uikit-prebuilt-call-rn/plugin",
```

- [ ] ✅ Plugin found in plugins array

**Check 1.2: MultiDex Enabled**

```bash
# Run this command:
grep -n "multiDexEnabled" app.config.js

# Should show:
# Line XX: multiDexEnabled: true,
```

- [ ] ✅ MultiDex configuration present

**Check 1.3: ProGuard Rules Configured**

```bash
# Run this command:
grep -n "extraProguardRules" app.config.js

# Should show:
# Line XX: extraProguardRules: \`...
```

- [ ] ✅ ProGuard rules added for Zego

---

## 🔍 **2. eas.json Verification**

**Check 2.1: withNativeModules in Android**

```bash
# Run this command:
grep -n "withNativeModules" eas.json

# Should show:
# Line XX: "withNativeModules": true
```

- [ ] ✅ Native modules enabled for Android

**Check 2.2: Cache Settings Present**

```bash
# Run this command:
grep -n "cache" eas.json

# Should show cache configuration
```

- [ ] ✅ Cache configuration present

---

## 🔍 **3. android/app/build.gradle Verification**

**Check 3.1: MultiDex in defaultConfig**

```bash
# Run this command:
grep -n "multiDexEnabled true" android/app/build.gradle

# Should show:
# Line XX: multiDexEnabled true
```

- [ ] ✅ MultiDex enabled in defaultConfig

---

## 🔍 **4. ProGuard Rules Verification**

**Check 4.1: Zego Rules Present**

```bash
# Run this command:
grep -n "com.zegocloud" android/app/proguard-rules.pro

# Should show multiple matches:
# Line XX: -keep class com.zegocloud.** { *; }
# Line XX: -keep class im.zego.** { *; }
# etc.
```

- [ ] ✅ Zego ProGuard rules added
- [ ] ✅ WebRTC rules added
- [ ] ✅ Keep native methods rules added

---

## 🔍 **5. video-call.tsx Verification**

**Check 5.1: Enhanced Error Handling**

```bash
# Run this command:
grep -n "📦 \[ZEGO\]" app/\(main\)/\(conference\)/video-call.tsx

# Should show logging statements:
# Line XX: console.log('📦 [ZEGO] Module loaded, checking exports...');
```

- [ ] ✅ Debug logging added for module loading
- [ ] ✅ Error logging enhanced
- [ ] ✅ Component type validation improved

---

## 🔍 **6. Documentation Files Verification**

- [ ] ✅ QUICK_START_VIDEO_FIX.md exists
- [ ] ✅ ZEGO_VIDEO_CALL_DEBUG_GUIDE.md exists
- [ ] ✅ TECHNICAL_ANALYSIS.md exists
- [ ] ✅ ZEGO_VIDEO_CALL_FIX_SUMMARY.md exists
- [ ] ✅ rebuild-video-call-fix.sh exists (macOS/Linux)
- [ ] ✅ rebuild-video-call-fix.bat exists (Windows)

---

## 🔍 **7. Dependencies Verification**

**Check 7.1: Zego Packages in package.json**

```bash
# Run this command:
grep "@zegocloud/zego-uikit-prebuilt-call-rn" package.json

# Should show:
# "@zegocloud/zego-uikit-prebuilt-call-rn": "^6.7.0",
```

- [ ] ✅ Zego UI Kit Prebuilt Call package present
- [ ] ✅ Zego UI Kit RN package present

---

## 🔍 **8. Android SDK Versions Verification**

**Check 8.1: Gradle Version**

```bash
# These should be auto-set by Expo:
# minSdkVersion: 21+ (required by Zego)
# targetSdkVersion: 34+ (recommended)
```

- [ ] ✅ minSdkVersion is 21 or higher
- [ ] ✅ targetSdkVersion is reasonable

---

## ✅ **ALL CHECKS PASSED?**

If all checkboxes are marked ✅, you're ready to rebuild:

```bash
# Option 1: Use automated script
./rebuild-video-call-fix.sh           # macOS/Linux
rebuild-video-call-fix.bat            # Windows

# Option 2: Manual rebuild
eas build --profile preview --platform android --clean

# Option 3: Local development build
npx expo run:android
```

---

## ⚠️ **IF CHECKS FAILED**

| Check Failed                  | Solution                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Zego Plugin Not Found         | Manually add `@zegocloud/zego-uikit-prebuilt-call-rn/plugin,` to plugins array in app.config.js |
| MultiDex Not Found            | Manually add `multiDexEnabled: true` to android build properties                                |
| withNativeModules Not Found   | Manually add `"withNativeModules": true` to eas.json android config                             |
| ProGuard Rules Missing        | Manually update android/app/proguard-rules.pro with Zego rules                                  |
| build.gradle Missing MultiDex | Manually add `multiDexEnabled true` to defaultConfig                                            |

---

## 🎯 FINAL VERIFICATION

Before submitting to EAS, verify:

- [ ] All configuration checks passed ✅
- [ ] No syntax errors in JSON files (use JSON validator online)
- [ ] Git changes look correct: `git diff app.config.js`
- [ ] Device has USB debugging enabled (for final testing)
- [ ] You have internet connection (builds take time)
- [ ] EAS CLI installed: `eas --version` should show version

---

## 🚀 READY TO BUILD?

Once all checks pass, run:

```bash
eas build --profile preview --platform android --clean
```

And grab a ☕ - your APK will be ready in 10-20 minutes!

---

## 📊 Success Indicators After Build

After APK installs and first launch:

- [ ] No crash on app load
- [ ] No crash when navigating to chat
- [ ] No crash when tapping video call button
- [ ] Permission dialog appears
- [ ] Video call screen loads
- [ ] Other user can see your video
- [ ] Call can be ended successfully

**If all ✅, the fix is working!**
