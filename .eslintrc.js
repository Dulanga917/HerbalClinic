module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // The Express API runs on Node and has no React, so React/React Native rules do not apply.
      files: ['server/**/*.js'],
      env: {
        node: true,
        es2022: true,
        jest: false,
        'jest/globals': false,
      },
      rules: {
        'react-hooks/rules-of-hooks': 'off',
        'react-hooks/exhaustive-deps': 'off',
        'react-native/no-inline-styles': 'off',
      },
    },
    {
      files: ['jest.setup.js'],
      env: {
        node: true,
        jest: true,
        'jest/globals': true,
      },
    },
    {
      files: ['*.config.js', '.eslintrc.js', '.prettierrc.js'],
      env: {
        node: true,
      },
    },
  ],
};
