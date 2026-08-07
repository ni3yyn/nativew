module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-import-meta',
    ],
    overrides: [
      {
        // Expo TypeScript packages with JSX - need full transformation
        test: (filename) => {
          if (!filename) return false;
          return (
            filename.includes('expo-camera') ||
            filename.includes('expo-av')
          );
        },
        plugins: [
          ['@babel/plugin-transform-typescript', { 
            allowDeclareFields: true,
            isTSX: true  // Enable TSX support for JSX in TypeScript
          }],
          ['@babel/plugin-transform-react-jsx', {
            runtime: 'automatic'  // Match Expo's default JSX transform
          }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
          ['@babel/plugin-transform-private-methods', { loose: true }],
          ['@babel/plugin-transform-private-property-in-object', { loose: true }],
        ],
      },
      {
        // Expo TypeScript packages without JSX
        test: (filename) => {
          if (!filename) return false;
          return (
            filename.includes('expo-file-system') ||
            filename.includes('expo-modules-core') ||
            filename.includes('expo-image-manipulator')
          );
        },
        plugins: [
          ['@babel/plugin-transform-typescript', { 
            allowDeclareFields: true 
          }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
          ['@babel/plugin-transform-private-methods', { loose: true }],
          ['@babel/plugin-transform-private-property-in-object', { loose: true }],
        ],
      },
      {
        // JavaScript packages with private properties
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