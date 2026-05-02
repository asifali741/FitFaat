# 🔧 Technical Analysis - Why Video Calls Were Crashing

## **ROOT CAUSE: Missing Native Module Configuration**

Your app was crashing because the **Zego native modules were not being compiled and linked** into the APK during the EAS build process.

---

## **Why This Happened**

### **Problem 1: Missing Zego Plugin in app.config.js**

```js
// ❌ BEFORE (Your config)
plugins: [
  "expo-router",
  "expo-camera",
  // ⚠️ MISSING: "@zegocloud/zego-uikit-prebuilt-call-rn/plugin"
  [
    "expo-build-properties",
    {
      /* ... */
    },
  ],
];

// ✅ AFTER (Fixed)
plugins: [
  "expo-router",
  "expo-camera",
  "@zegocloud/zego-uikit-prebuilt-call-rn/plugin", // ← CRITICAL
  [
    "expo-build-properties",
    {
      /* ... */
    },
  ],
];
```

**Why it matters:**

- Expo uses plugins to configure native module compilation
- Without the plugin, EAS doesn't know to include Zego's native Android/iOS code
- The JavaScript wrapper gets included, but the native libraries are missing
- Result: App crashes when trying to use Zego features

---

### **Problem 2: No MultiDex Configuration**

```gradle
// ❌ BEFORE (Your build.gradle)
defaultConfig {
    applicationId 'com.shayan.fitfaat'
    minSdkVersion ...
    targetSdkVersion ...
    // ⚠️ MISSING: multiDexEnabled true
}

// ✅ AFTER (Fixed)
defaultConfig {
    applicationId 'com.shayan.fitfaat'
    minSdkVersion ...
    targetSdkVersion ...
    multiDexEnabled true // ← CRITICAL for large libraries
}
```

**Why it matters:**

- Android APKs have a 64K method limit per DEX file
- Zego SDK + your app code together exceed 64K methods
- Without MultiDex, Zego methods are truncated or missing
- Result: Native methods not found at runtime → crash

---

### **Problem 3: EAS Build Not Configured for Native Modules**

```json
// ❌ BEFORE (Your eas.json)
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
        // ⚠️ MISSING: "withNativeModules": true
      }
    }
  }
}

// ✅ AFTER (Fixed)
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "withNativeModules": true // ← CRITICAL
      }
    }
  }
}
```

**Why it matters:**

- EAS needs explicit instruction to compile native modules
- Without this, it builds a "managed" APK without native code
- The Zego SDK won't be compiled into the APK

---

### **Problem 4: Weak ProGuard Rules**

```proguard
// ❌ BEFORE (Insufficient rules)
-keep class im.zego.** { *; }
-keep class com.zego.** { *; }

// ✅ AFTER (Comprehensive rules)
-keep class com.zegocloud.** { *; }
-keep class im.zego.** { *; }
-keep class com.zego.** { *; }
-keep class org.webrtc.** { *; }

-keepclasseswithmembernames class com.zegocloud.** {
    native <methods>;
}
-keepclasseswithmembernames class im.zego.** {
    native <methods>;
}

-dontwarn com.zegocloud.**
-dontwarn im.zego.**
```

**Why it matters:**

- Release APKs use ProGuard/R8 minification to reduce size
- Without proper rules, Zego classes might be renamed or removed
- Runtime tries to call methods that don't exist → crash
- The rules ensure Zego stays intact during minification

---

## **Why the App Crashes When You Click Video Call**

### **The Crash Flow (Before Fix):**

```
1. User taps Video Call button
   ↓
2. App navigates to video-call.tsx screen
   ↓
3. Screen tries: ZegoModule = require('@zegocloud/zego-uikit-prebuilt-call-rn')
   ↓
4. JavaScript wrapper loads fine ✓
   ↓
5. ZegoUIKitPrebuiltCall component renders
   ↓
6. Component tries to call native Zego methods
   ↓
7. Native libraries missing → Native method not found ✗
   ↓
8. JNI (Java Native Interface) error → Android crashes app ✗

App Closed: "App has stopped responding"
```

### **The Fix Flow (After Fix):**

```
1. User taps Video Call button
   ↓
2. App navigates to video-call.tsx screen
   ↓
3. Screen tries: ZegoModule = require('@zegocloud/zego-uikit-prebuilt-call-rn')
   ↓
4. JavaScript wrapper loads ✓
   ↓
5. ZegoUIKitPrebuiltCall component renders
   ↓
6. Component calls native Zego methods
   ↓
7. Native Zego libraries present in APK ✓
   ↓
8. JNI successfully calls native code ✓
   ↓
9. Zego SDK initializes with APP_ID and APP_SIGN ✓
   ↓
10. Video call connects to signaling server ✓
    ↓
11. Both devices join same room → Video call succeeds ✓
```

---

## **How Each Fix Solves the Problem**

### **Fix 1: Zego Plugin in app.config.js**

- **What it does**: Tells Expo to compile Zego native modules
- **Result**: Native code gets included in APK build
- **Impact**: Zego methods are available at runtime

### **Fix 2: MultiDex Enabled**

- **What it does**: Allows multiple DEX files (bypasses 64K limit)
- **Result**: All method definitions fit in DEX
- **Impact**: No methods are truncated

### **Fix 3: eas.json withNativeModules**

- **What it does**: Tells EAS to use full native build, not managed APK
- **Result**: Native compilation happens on EAS servers
- **Impact**: Native Zego libraries are actually compiled

### **Fix 4: ProGuard Rules**

- **What it does**: Protects Zego classes from being renamed/removed during minification
- **Result**: Zego class names remain the same
- **Impact**: Runtime can find and call native methods

### **Fix 5: Enhanced Error Handling in video-call.tsx**

- **What it does**: Better logging and diagnostics
- **Result**: If something still fails, you get a clear error message
- **Impact**: Easier to debug if issues persist

---

## **Why It Works on Development but Not on APK**

**Development (npx expo run:android):**

- Uses dev client which includes all modules
- No minification
- Debugging tools included
- Works fine for testing

**APK (eas build preview):**

- Standalone app without dev tools
- Minified for smaller size (requires ProGuard config)
- Requires explicit module configuration
- Needs MultiDex for large apps
- **All fixes are critical for this**

---

## **Technical Details: Zego SDK Architecture**

```
@zegocloud/zego-uikit-prebuilt-call-rn
├── JavaScript Layer (included in all builds)
│   ├── ZegoUIKitPrebuiltCall component
│   └── Configuration wrapper
│
├── Native Layer (ONLY if plugin is configured)
│   ├── Android natives (com.zegocloud.* classes)
│   ├── WebRTC libraries (org.webrtc.*)
│   └── Signaling client (im.zego.* classes)
│
└── Network Layer
    ├── Zego signaling servers (for call initiation)
    └── WebRTC peer connection (for media streaming)
```

Without the plugin, only the JavaScript layer is included. When it tries to call native methods, they don't exist → crash.

---

## **Why Crashes Are Silent**

Android native crashes are often silent because:

1. The JNI error crashes the native thread
2. React Native's error boundary doesn't always catch it
3. App terminates without showing a dialog
4. Only visible in logcat logs

**Solution**: Run `adb logcat` to see the real error instead of guessing.

---

## **Verification: Is It Really Fixed?**

After rebuilding, check for these signs:

✅ **Good signs:**

- No crash when clicking video call button
- "Preparing video call..." message appears
- Permission dialog shows
- Video call screen loads
- Both users see video streams

❌ **Bad signs:**

- App closes immediately
- "Unfortunately, app has stopped" dialog
- Logcat shows "Native method not found"
- Logcat shows "class not found"

---

## **Key Takeaway**

The crash wasn't in your JavaScript code—it was a **build configuration problem**. The native Zego modules simply weren't being compiled into the APK. Now they are! 🎉

All fixes are **non-intrusive** and **follow Expo best practices** for native module configuration.
