// babel.config.js
// Required for Expo SDK 54 / Expo Router / Hermes / EAS Update.
// babel-preset-expo handles: Hermes transforms, automatic React import,
// async route imports for expo-router, and module system compatibility.
// babel-plugin-transform-import-meta handles import.meta used by Supabase.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-import-meta',
    ],
  };
};
