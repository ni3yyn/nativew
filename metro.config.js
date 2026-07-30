// metro.config.js
// Required for Expo SDK 54 + Expo Router + EAS Update.
// Without this file, asset hashing and bundle serialization used by
// expo-updates will not function correctly.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
