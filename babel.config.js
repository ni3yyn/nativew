module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-import-meta',
    ],
    overrides: [
      {
        // Only plain .js/.jsx files in node_modules — excludes .ts files
        // like expo-file-system's ExpoFileSystem.ts, avoiding the
        // plugins-before-presets/TS-declare conflict.
        test: /node_modules\/.+\.jsx?$/,
        plugins: [
          ['@babel/plugin-transform-private-methods', { loose: true }],
          ['@babel/plugin-transform-private-property-in-object', { loose: true }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
        ],
      },
    ],
  };
};