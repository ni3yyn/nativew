package com.wathiq.app

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import com.facebook.react.modules.i18nmanager.I18nUtil
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

// 1. IMPORT YOUR WIDGET PACKAGE HERE
import com.wathiq.app.widget.SpfWidgetPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // 2. REGISTER YOUR WIDGET PACKAGE HERE
          add(SpfWidgetPackage())
        }
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Prevent OS language from auto-mirroring/inverting layout
    I18nUtil.getInstance().allowRTL(this, false)
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}