// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');
const os = require('os');

// Function to get the local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      if ('IPv4' !== iface.family || iface.internal !== false) {
        continue;
      }
      return iface.address;
    }
  }
  return '127.0.0.1'; // Fallback
}

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve Platform-specific symlinks as packages
config.resolver.disableHierarchicalLookup = true;

// Set the server host to your machine's IP address
config.server = {
  ...config.server,
  host: getLocalIpAddress(),
};

// Use a unique cache store for your project
config.cacheStores = [
  new FileStore({
    root: path.join(projectRoot, 'node_modules', '.cache', 'metro'),
  }),
];

module.exports = config;