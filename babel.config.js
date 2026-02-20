module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',
      // سطر الـ worklets الذي حل مشكلة التسمية سابقاً
      'react-native-worklets-core/plugin', 
      // يجب أن يكون Reanimated هو الأخير دائماً
      'react-native-reanimated/plugin', 
    ],
  };
};