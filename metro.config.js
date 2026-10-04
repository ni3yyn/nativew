const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Critical: Ensure these packages are processed through Babel
config.transformer = {
  ...config.transformer,
  enableBabelRCLookup: true,
};

config.resolver = {
  ...config.resolver,
  // Only block web-specific packages
  blockList: [
    /node_modules\/react-native-web\/.*/,
    /node_modules\/react-dom\/.*/,
  ],
};

module.exports = config;