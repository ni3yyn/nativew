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
          // Only transform your installed packages that use private properties
          return (
            filename.includes('react-native-svg') ||
            filename.includes('expo-file-system') ||
            filename.includes('expo-modules-core') ||
            filename.includes('react-native-gesture-handler') ||
            filename.includes('react-native-screens') ||
            filename.includes('expo-camera') ||
            filename.includes('expo-av') ||
            filename.includes('expo-image-manipulator')
          );
        },
        plugins: [
          ['@babel/plugin-transform-private-methods', { loose: true }],
          ['@babel/plugin-transform-private-property-in-object', { loose: true }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
        ],
      },
    ],
  };
};