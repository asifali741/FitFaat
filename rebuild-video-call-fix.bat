@echo off
REM 🚀 ONE-COMMAND VIDEO CALL FIX (Windows)
REM Run this script to rebuild your APK with all fixes applied

setlocal enabledelayedexpansion

echo.
echo 🎬 Starting video call crash fix rebuild...
echo.

REM Step 1: Clean up old builds
echo 🧹 Cleaning old builds...
if exist "android\build\" rmdir /s /q "android\build\" >nul 2>&1
if exist "node_modules\.cache\" rmdir /s /q "node_modules\.cache\" >nul 2>&1
echo ✅ Old builds cleaned
echo.

REM Step 2: Verify changes were applied
echo 🔍 Verifying fixes...

findstr "@zegocloud/zego-uikit-prebuilt-call-rn/plugin" app.config.js >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Zego plugin found in app.config.js
) else (
    echo ❌ ERROR: Zego plugin NOT found in app.config.js
    echo    Please manually add to plugins array:
    echo    '@zegocloud/zego-uikit-prebuilt-call-rn/plugin',
    pause
    exit /b 1
)

findstr "multiDexEnabled" android\app\build.gradle >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MultiDex enabled in build.gradle
) else (
    echo ❌ ERROR: MultiDex NOT found in build.gradle
    echo    Please manually add to defaultConfig:
    echo    multiDexEnabled true
    pause
    exit /b 1
)

findstr "withNativeModules" eas.json >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ withNativeModules found in eas.json
) else (
    echo ❌ ERROR: withNativeModules NOT found in eas.json
    echo    Please manually add to android config:
    echo    "withNativeModules": true
    pause
    exit /b 1
)

echo.
echo 🎯 All fixes verified!
echo.

REM Step 3: Ask which build type
echo Select build type:
echo.
echo 1 - Preview build (APK for testing) - RECOMMENDED
echo 2 - Development build (for local testing)
echo 3 - Production build
echo.

set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo 📱 Building PREVIEW APK (recommended for testing)...
    echo This will create a production-like APK you can share.
    echo.
    call eas build --profile preview --platform android --clean
) else if "%choice%"=="2" (
    echo.
    echo 🔧 Building DEVELOPMENT build...
    echo This includes debugging tools.
    echo.
    call eas build --profile development --platform android --clean
) else if "%choice%"=="3" (
    echo.
    echo 📦 Building PRODUCTION APK...
    echo This is release-ready.
    echo.
    call eas build --profile production --platform android --clean
) else (
    echo Invalid choice!
    pause
    exit /b 1
)

echo.
echo ✅ Build submitted to EAS!
echo.
echo 📊 Monitor your build at: https://eas.expo.dev/
echo.
echo ⏱️  Build time: 10-15 minutes
echo.
echo 📥 Once ready, download APK and install:
echo    adb install -r app-release.apk
echo.
echo ✨ Then test the video call!
echo.
pause
