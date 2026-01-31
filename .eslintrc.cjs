module.exports = {
  extends: [
    '@electron-toolkit/eslint-config-ts/eslint-recommended',
    '@electron-toolkit/eslint-config-ts/recommended',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
};
