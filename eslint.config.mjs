import tseslint from '@electron-toolkit/eslint-config-ts'

export default tseslint.config(
  {
    ignores: ['dist/**', 'out/**', 'node_modules/**']
  },
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  }
)
