#!/bin/bash
# 🚀 ONE-COMMAND VIDEO CALL FIX
# Run this script to rebuild your APK with all fixes applied

echo "🎬 Starting video call crash fix rebuild..."
echo ""

# Step 1: Clean up old builds
echo "🧹 Cleaning old builds..."
rm -rf android/build/ 2>/dev/null
rm -rf node_modules/.cache 2>/dev/null
echo "✅ Old builds cleaned"
echo ""

# Step 2: Verify changes were applied
echo "🔍 Verifying fixes..."
if grep -q "@zegocloud/zego-uikit-prebuilt-call-rn/plugin" app.config.js; then
    echo "✅ Zego plugin found in app.config.js"
else
    echo "❌ ERROR: Zego plugin NOT found in app.config.js"
    echo "   Please manually add: '@zegocloud/zego-uikit-prebuilt-call-rn/plugin' to plugins array"
    exit 1
fi

if grep -q "multiDexEnabled" android/app/build.gradle; then
    echo "✅ MultiDex enabled in build.gradle"
else
    echo "❌ ERROR: MultiDex NOT found in build.gradle"
    echo "   Please manually add: 'multiDexEnabled true' to defaultConfig"
    exit 1
fi

if grep -q "withNativeModules" eas.json; then
    echo "✅ withNativeModules found in eas.json"
else
    echo "❌ ERROR: withNativeModules NOT found in eas.json"
    echo "   Please manually add: '\"withNativeModules\": true' to android config"
    exit 1
fi

echo ""
echo "🎯 All fixes verified!"
echo ""

# Step 3: Ask which build type
echo "Select build type:"
echo "1) Preview build (APK for testing) - RECOMMENDED"
echo "2) Development build (for local testing)"
echo "3) Production build"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📱 Building PREVIEW APK (recommended for testing)..."
        echo "This will create a production-like APK you can share."
        echo ""
        eas build --profile preview --platform android --clean
        ;;
    2)
        echo ""
        echo "🔧 Building DEVELOPMENT build..."
        echo "This includes debugging tools."
        echo ""
        eas build --profile development --platform android --clean
        ;;
    3)
        echo ""
        echo "📦 Building PRODUCTION APK..."
        echo "This is release-ready."
        echo ""
        eas build --profile production --platform android --clean
        ;;
    *)
        echo "Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "✅ Build submitted to EAS!"
echo ""
echo "📊 Monitor your build at: https://eas.expo.dev/"
echo ""
echo "⏱️  Build time: 10-15 minutes"
echo ""
echo "📥 Once ready, download APK and install:"
echo "   adb install -r app-release.apk"
echo ""
echo "✨ Then test the video call!"
