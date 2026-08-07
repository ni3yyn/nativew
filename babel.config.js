module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-import-meta',
    ],
    overrides: [
      {
        test: (filename) => {
          if (!filename) return false;
          // Only transform Expo packages that use private properties AND TypeScript
          return (
            filename.includes('expo-file-system') ||
            filename.includes('expo-modules-core') ||
            filename.includes('expo-camera') ||
            filename.includes('expo-av') ||
            filename.includes('expo-image-manipulator')
          );
        },
        plugins: [
          // TypeScript must come FIRST
          ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
          // Then class features plugins in loose mode
          ['@babel/plugin-transform-class-properties', { loose: true }],
          ['@babel/plugin-transform-private-methods', { loose: true }],
          ['@babel/plugin-transform-private-property-in-object', { loose: true }],
        ],
      },
      {
        // Separate override for JS packages that only need private properties
        test: (filename) => {
          if (!filename) return false;
          return (
            filename.includes('react-native-svg') ||
            filename.includes('react-native-gesture-handler') ||
            filename.includes('react-native-screens')
          );
        },
        plugins: [
          ['@babel/plugin-transform-class-properties', { loose: true }],
          ['@babel/plugin-transform-private-methods', { loose: true }],
          ['@babel/plugin-transform-private-property-in-object', { loose: true }],
        ],
      },
    ],
  };
};