# 🎥 Video Call Crash - Complete Debugging Guide

## **BEFORE REBUILDING - CHECK THESE FIRST**

### ✅ **Step 1: Verify Zego Credentials**

Ensure your `app.config.js` has valid credentials:

```js
ZEGO_APP_ID: process.env.ZEGO_APP_ID || "240147723";
ZEGO_APP_SIGN: process.env.ZEGO_APP_SIGN ||
  "a264c74ba1e0eadd06807711c52d608221385f1af0ed26e0a731458a2b93fa10";
```

- Visit: https://console.zegocloud.com
- Verify these credentials are correct and active
- If credentials are wrong, the app will crash

### ✅ **Step 2: Check Your Device Requirements**

- **Android version**: API 21+ required (your app must have this)
- **RAM**: At least 100MB free RAM
- **Permissions**: Camera & Microphone must be granted
- **Network**: WiFi or strong 4G connection

---

## **THE FIX - REBUILD YOUR APK**

### 🔴 **Critical Changes Made:**

1. ✅ Added `@zegocloud/zego-uikit-prebuilt-call-rn/plugin` to `app.config.js`
2. ✅ Enabled `multiDexEnabled: true` in Android build
3. ✅ Updated `eas.json` with `withNativeModules: true`
4. ✅ Enhanced ProGuard rules in `proguard-rules.pro`
5. ✅ Improved error handling in `video-call.tsx`

### 📱 **Build Commands:**

#### **Option A: Full EAS Preview Build (Recommended)**

```bash
# Clean rebuild (important!)
rm -rf android/build/
rm -rf node_modules/.cache
rm -rf ~/Library/Caches/eas-build/  # macOS
# or: rm -rf $USERPROFILE\.eas-build\  # Windows

# Build new APK
eas build --profile preview --platform android --clean
```

#### **Option B: Development Build (For Testing)**

```bash
eas build --profile development --platform android
```

#### **Option C: Local Development Build**

```bash
npx expo run:android
```

---

## **AFTER BUILDING - INSTALLATION & TESTING**

### 📲 **1. Install the APK**

```bash
# Find your APK file location
# Download from EAS dashboard or:
adb install -r app-release.apk
```

### 📲 **2. Test Video Call Flow**

**Before calling**, check:

- ✅ Appointment is booked
- ✅ Both users are in chat screen
- ✅ Permissions prompt appears and you accept it
- ✅ Chat access is enabled

**To initiate call**:

1. Open Chat Screen
2. Tap **Video Camera Icon** (top-right)
3. Wait for "Preparing video call..." message
4. Check if permissions dialog appears

---

## **IF CRASH PERSISTS - DIAGNOSTIC STEPS**

### 🔍 **Step 1: Check Logcat (Android Logs)**

```bash
# Connect device via USB and enable USB Debugging
adb logcat -s "ReactNative:V" "expo:V" "ZEGO:V"

# Then try to start a video call and check for errors
```

**Look for these error patterns:**

```
# Bad: Module not found
"Cannot find native module: @zegocloud/zego-uikit-prebuilt-call-rn"

# Bad: Permission denied
"Permission denied: CAMERA" or "Permission denied: RECORD_AUDIO"

# Bad: Initialization error
"ZegoCloud initialization failed"

# Good: Component loaded
"✅ [ZEGO] SDK loaded successfully"
```

### 🔍 **Step 2: Enable Debug Logging**

Temporarily add this to `video-call.tsx`:

```tsx
// At top of file, after imports
console.log("🔍 [VIDEO-CALL] Screen mounted");
console.log("🔍 [VIDEO-CALL] isZegoAvailable:", isZegoAvailable);
console.log(
  "🔍 [VIDEO-CALL] ZegoUIKitPrebuiltCall type:",
  typeof ZegoUIKitPrebuiltCall,
);
console.log("🔍 [VIDEO-CALL] Error:", sdkLoadError);
```

### 🔍 **Step 3: Check Device Settings**

On your Android device:

1. **Settings → Apps → FitFaat**
2. Check **Permissions**:
   - ✅ Camera: ALLOWED
   - ✅ Microphone: ALLOWED
3. Check **Battery Optimization**: EXCLUDE FitFaat from battery optimization
4. Check **Overlay Permission** (if not already granted):
   - Settings → Apps → Special app access → Draw over other apps → Enable FitFaat

### 🔍 **Step 4: Network & Firewall Check**

Zego uses specific ports:

```
TCP: 2000, 2001, 4000, 4001, 4002, 4003, 4004, 4005, 8000, 8001, 8008, 8080, 8081, 8082, 8083, 8084, 8085, 8086, 8087, 8090, 8091, 8092, 8093, 8094, 8095, 9000, 9001, 9002, 9003, 9004, 9005, 9010, 9011, 9012, 9092, 9093, 9094, 9095, 9096, 9097, 9098, 9099, 10000, 11000, 13000, 15000, 21000, 21001, 21002, 21003, 21004, 21005, 21006, 21007, 21008, 21009, 21010, 21011, 21012, 21013, 21014, 21015, 21016, 21017, 21018, 21019, 21020
UDP: 4000, 4001, 4002, 4003, 8000, 8001, 8082, 8083, 8084, 8085, 8086, 8087, 8088, 8089, 8090, 8091, 9000, 9001, 10000, 11000, 13000, 15000, 20000, 21000
```

Check if your network allows these ports.

---

## **COMMON CRASH SCENARIOS & SOLUTIONS**

### ❌ **Crash 1: "Module not found" or App immediately closes**

**Cause**: Zego native module not linked
**Solution**:

```bash
# These are critical for the APK to include Zego:
# 1. Ensure @zegocloud/zego-uikit-prebuilt-call-rn/plugin is in plugins[] of app.config.js
# 2. Ensure eas.json has withNativeModules: true
# 3. Rebuild with: eas build --clean
```

### ❌ **Crash 2: Permission dialog appears then crashes**

**Cause**: Permissions not properly handled
**Solution**:

1. Check `app.config.js` has camera/microphone permissions
2. Grant all permissions when prompted
3. Check Android device Settings → Apps → Permissions

### ❌ **Crash 3: "Zego initialization failed"**

**Cause**: Invalid APP_ID or APP_SIGN
**Solution**:

1. Go to https://console.zegocloud.com
2. Verify APP_ID and APP_SIGN are correct
3. Check they're set in environment variables OR `app.config.js`
4. Rebuild APK

### ❌ **Crash 4: App works locally but crashes on APK**

**Cause**: Missing native modules in APK
**Solution**:

```bash
# Ensure you're building with:
eas build --profile preview --platform android --clean

# Not: npx expo run:android (dev build, not APK)
```

### ❌ **Crash 5: "Only self in room" then exits**

**Cause**: Other participant not connecting
**Solution**:

1. Check both users are in chat screen
2. Check network connection (both devices need good WiFi/4G)
3. Check Zego credentials are same on both devices
4. Try calling again after 10 seconds

---

## **VERIFICATION CHECKLIST**

After rebuilding, verify:

- [ ] `app.config.js` has `@zegocloud/zego-uikit-prebuilt-call-rn/plugin` in plugins array
- [ ] `app.config.js` has `multiDexEnabled: true` in android.build-properties
- [ ] `eas.json` has `withNativeModules: true` in android config
- [ ] `android/app/build.gradle` has `multiDexEnabled true` in defaultConfig
- [ ] `android/app/proguard-rules.pro` has Zego rules
- [ ] APK is built with `eas build --profile preview --platform android --clean`
- [ ] Device has Camera & Microphone permissions granted
- [ ] Device is on Android API 21+
- [ ] Zego APP_ID and APP_SIGN are correct
- [ ] Network allows Zego ports (check firewall)

---

## **QUICK RESTART SOLUTION**

If you've made changes and want to rebuild quickly:

```bash
# 1. Clear everything
npm run reset-project

# 2. Reinstall dependencies
npm install

# 3. Rebuild APK
eas build --profile preview --platform android --clean

# 4. Download and install new APK
adb install -r path/to/new-apk.apk
```

---

## **FOR ZEGO SUPPORT**

If issues persist, contact Zego with:

1. **Logcat output** (adb logcat)
2. **App ID and Sign** (from console.zegocloud.com)
3. **Device info**: `adb shell getprop | grep -E "model|version|sdk"`
4. **Error message** from crash logs

---

## **IMPORTANT NOTES**

🔴 **DO NOT**:

- Use Expo Go for video calls (it doesn't include native modules)
- Skip the `--clean` flag when rebuilding
- Change Zego SDK versions without testing
- Use HTTP (unencrypted) connections with newer Zego SDKs

✅ **DO**:

- Always rebuild APK after changing `app.config.js`
- Test on actual device, not emulator (better for video calls)
- Keep Zego SDK packages up to date
- Monitor network bandwidth during calls
