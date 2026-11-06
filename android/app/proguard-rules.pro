# React Native Core & Fabric / TurboModules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }

# Keep native JNI methods across all packages
-keepclasseswithmembernames class * {
    native <methods>;
}

# Preserve Custom VMS Android Modules & Bridge
-keep class com.vms.** { *; }
-keepclassmembers class com.vms.** { *; }

# Preserve TVT & NVR Native SDK Packages and JNI Bridges
-keep class com.sdk.** { *; }
-keepclassmembers class com.sdk.** { *; }
-keep class com.sdk.network.** { *; }
-keep class com.sdk.interfance.** { *; }

# Firebase & Push Notification Libraries
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }
-keep class com.notifee.** { *; }
-keep class io.notifee.** { *; }

# React Native Community Modules
-keep class com.reactnativecommunity.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class com.brentvatne.react.** { *; }
-keep class com.mkobos.pca.** { *; }

# Suppress ProGuard warnings for third party reflection/optional libraries
-dontwarn com.facebook.react.**
-dontwarn com.sdk.**
-dontwarn com.vms.**
-dontwarn io.notifee.**
-dontwarn com.google.firebase.**
