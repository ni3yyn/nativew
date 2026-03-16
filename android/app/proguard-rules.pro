# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ============================================
# REACT NATIVE CORE RULES
# ============================================

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }

# React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# React Native Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Native Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native Community Slider
-keep class com.reactnativecommunity.slider.** { *; }

# React Native Community Datetimepicker
-keep class com.reactcommunity.rndatetimepicker.** { *; }

# React Native SVG
-keep class com.horcrux.svg.** { *; }

# React Native View Shot
-keep class fr.greweb.reactnativeviewshot.** { *; }

# ============================================
# EXPO MODULES CORE RULES
# ============================================

# Keep all Expo modules classes
-keep class expo.modules.** { *; }
-keep interface expo.modules.** { *; }

# Specifically keep the classes that were missing in the error
-keep class expo.modules.kotlin.services.** { *; }
-keep class expo.modules.kotlin.types.** { *; }
-keep class expo.modules.kotlin.functions.** { *; }
-keep class expo.modules.kotlin.objects.** { *; }
-keep class expo.modules.kotlin.views.** { *; }
-keep class expo.modules.kotlin.exception.** { *; }
-keep class expo.modules.core.errors.** { *; }
-keep class expo.modules.interfaces.** { *; }
-keep class expo.modules.adapters.react.** { *; }

# Keep Expo module entry points
-keep class * extends expo.modules.kotlin.modules.Module
-keep class * extends expo.modules.kotlin.views.ViewManagerWrapperDelegate
-keep class * extends expo.modules.kotlin.views.ExpoView

# ============================================
# INDIVIDUAL EXPO PACKAGE RULES
# ============================================

# Expo Asset
-keep class expo.modules.asset.** { *; }

# Expo Audio
-keep class expo.modules.audio.** { *; }

# Expo AV
-keep class expo.modules.av.** { *; }

# Expo Camera
-keep class expo.modules.camera.** { *; }

# Expo Constants
-keep class expo.modules.constants.** { *; }

# Expo Device
-keep class expo.modules.device.** { *; }

# Expo FileSystem
-keep class expo.modules.filesystem.** { *; }

# Expo Font
-keep class expo.modules.font.** { *; }

# Expo Haptics
-keep class expo.modules.haptics.** { *; }

# Expo Image Manipulator
-keep class expo.modules.imagemanipulator.** { *; }

# Expo Image Picker
-keep class expo.modules.imagepicker.** { *; }

# Expo Linear Gradient
-keep class expo.modules.lineargradient.** { *; }

# Expo Linking
-keep class expo.modules.linking.** { *; }

# Expo Location
-keep class expo.modules.location.** { *; }

# Expo Navigation Bar
-keep class expo.modules.navigationbar.** { *; }

# Expo Notifications
-keep class expo.modules.notifications.** { *; }

# Expo Sharing
-keep class expo.modules.sharing.** { *; }

# Expo Splash Screen
-keep class expo.modules.splashscreen.** { *; }

# Expo Status Bar
-keep class expo.modules.statusbar.** { *; }

# Expo Updates
-keep class expo.modules.updates.** { *; }

# ============================================
# KOTLIN RULES
# ============================================

# Keep all Kotlin metadata
-keep class kotlin.Metadata { *; }
-keep @kotlin.Metadata class ** { *; }
-keep class kotlin.reflect.** { *; }
-keep class kotlin.jvm.internal.** { *; }

# Keep Kotlin coroutines
-keep class kotlinx.coroutines.** { *; }

# ============================================
# FIREBASE RULES
# ============================================

# Firebase Analytics
-keep class com.google.firebase.analytics.** { *; }
-keep class com.google.android.gms.measurement.** { *; }

# Firebase Core
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# React Native Firebase
-keep class io.invertase.firebase.** { *; }

# ============================================
# GOOGLE MOBILE ADS RULES
# ============================================

# Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }

# Unity Ads Mediation
-keep class com.unity3d.ads.** { *; }
-keep class com.unity3d.services.** { *; }
-keep class com.google.ads.mediation.unity.** { *; }
-keep interface com.unity3d.ads.** { *; }
-keep interface com.unity3d.services.** { *; }

# Prevent R8 from stripping the adapter
-keep class com.google.ads.mediation.** { *; }

# ============================================
# SUPPORT LIBRARIES
# ============================================

# AndroidX
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Support Library
-keep class android.support.** { *; }
-keep interface android.support.** { *; }

# ============================================
# GENERAL RULES
# ============================================

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep custom view methods
-keepclassmembers class * extends android.view.View {
    void set*(***);
    *** get*();
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepnames class * implements java.io.Serializable

# Keep R8 from stripping enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep JavaScript interface methods for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================================
# APP SPECIFIC RULES
# ============================================

# Keep your app's main package
-keep class com.wathiq.app.** { *; }
-keep class host.exp.exponent.** { *; }

# Keep MainApplication and MainActivity
-keep class com.wathiq.app.MainApplication { *; }
-keep class com.wathiq.app.MainActivity { *; }

# ============================================
# DEBUGGING RULES (Optional - remove for production)
# ============================================

# Keep source file names and line numbers for crash reporting
-keepattributes SourceFile, LineNumberTable

# Keep annotation metadata
-keepattributes *Annotation*

# Keep generic signatures
-keepattributes Signature

# ============================================
# EXPO SDK 54 / COIL 3 FIXES
# ============================================

# Coil 3 (Used by Expo's new image loader)
-dontwarn coil3.**
-keep class coil3.** { *; }

# Prevent R8 from crashing on Expo Core interfaces during instrumentation
-dontwarn expo.modules.interfaces.**
-dontwarn expo.modules.kotlin.**
-dontwarn expo.modules.core.**

# OkHttp/Okio (Network fetchers used by Coil/Expo)
-dontwarn okhttp3.**
-dontwarn okio.**