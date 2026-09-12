# ============================================
# WATHIQ APP - R8 / PROGUARD RULES
# ============================================
# Philosophy: let R8 do its job. Library consumer rules
# handle most reflection needs. Keep only:
#   1. Libraries known to use reflection at runtime (ads, RN Firebase)
#   2. Expo SDK 54 specific fixes (OTA, Room, Coil 3)
#   3. Standard Android safety rules
# ============================================

# ============================================
# REACT NATIVE LIBRARIES (reflection-sensitive)
# ============================================

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
# EXPO SDK 54 SPECIFIC FIXES
# ============================================
# These are the exact classes R8 reported as unresolved
# during instrumentation on SDK 54 + New Architecture.

# Expo Kotlin bridge reflection targets
-keep class expo.modules.kotlin.services.** { *; }
-keep class expo.modules.kotlin.types.** { *; }
-keep class expo.modules.kotlin.functions.** { *; }
-keep class expo.modules.kotlin.objects.** { *; }
-keep class expo.modules.kotlin.views.** { *; }
-keep class expo.modules.kotlin.exception.** { *; }
-keep class expo.modules.core.errors.** { *; }
-keep class expo.modules.interfaces.** { *; }
-keep class expo.modules.adapters.react.** { *; }

# Expo module entry points (discovered via reflection by expo-modules-core)
-keep class * extends expo.modules.kotlin.modules.Module
-keep class * extends expo.modules.kotlin.views.ViewManagerWrapperDelegate
-keep class * extends expo.modules.kotlin.views.ExpoView

# Expo Updates internal state machine
-keep class expo.modules.updates.statemachine.** { *; }
-keep class expo.modules.updates.manifest.** { *; }
-keep class expo.modules.updates.selectionpolicy.** { *; }
-keep class expo.modules.updates.loader.** { *; }

# Expo Updates Room database (OTA persistence)
-keep class * extends androidx.room.RoomDatabase
-keep class * extends androidx.sqlite.db.SupportSQLiteOpenHelper
-keep class * extends androidx.sqlite.db.SupportSQLiteOpenHelper$Factory

# JSBundleLoader — needed for the OTA bundle swap
-keep class com.facebook.react.bridge.JSBundleLoader { *; }
-keep class com.facebook.react.bridge.CatalystInstanceImpl { *; }

# Coil 3 (Expo's new image loader on SDK 54)
-keep class coil3.** { *; }

# ============================================
# REACT NATIVE FIREBASE
# ============================================
# RN Firebase uses reflection heavily across the JS bridge.

-keep class io.invertase.firebase.** { *; }

# ============================================
# GOOGLE MOBILE ADS + MEDIATION
# ============================================
# Ad mediation adapters are instantiated via reflection.
# Removing these will cause ads to silently fail to load.

# Google Mobile Ads
-keep class com.google.android.gms.ads.** { *; }

# Generic mediation keep (catches all adapters)
-keep class com.google.ads.mediation.** { *; }

# ============================================
# STANDARD ANDROID / KOTLIN SAFETY RULES
# ============================================

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep custom view setters/getters (used by XML inflation)
-keepclassmembers class * extends android.view.View {
    void set*(***);
    *** get*();
}

# Keep Parcelable CREATOR fields
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable class names (used by Intent extras)
-keepnames class * implements java.io.Serializable

# Keep enum values() / valueOf() (reflection-discovered)
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep JavaScript interface methods for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================================
# ATTRIBUTES (single consolidated block)
# ============================================

# Keep source file names / line numbers for readable crash reports
-keepattributes SourceFile, LineNumberTable

# Keep annotations and generics (needed for Gson, Moshi, Room, Firebase)
-keepattributes *Annotation*, Signature, EnclosingMethod, InnerClasses

# ============================================
# DONTWARN (silence harmless missing-class warnings)
# ============================================

-dontwarn coil3.**
-dontwarn expo.modules.interfaces.**
-dontwarn expo.modules.kotlin.**
-dontwarn expo.modules.core.**
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn androidx.room.**