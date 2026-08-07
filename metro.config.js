const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Critical: Ensure these packages are processed through Babel
config.transformer = {
  ...config.transformer,
  enableBabelRCLookup: true,
};

config.resolver = {
  ...config.resolver,
  sourceExts: ['js', 'jsx', 'ts', 'tsx', 'json', 'mjs'],
  // Override to allow babel to process our targeted node_modules
  unstable_enableSymlinks: true,
  // Only block web-specific packages
  blockList: [
    /node_modules\/react-native-web\/.*/,
    /node_modules\/react-dom\/.*/,
  ],
};

module.exports = config;