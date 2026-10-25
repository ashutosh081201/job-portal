import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // the context files export their hook next to the provider
      "react-refresh/only-export-components": ["error", { allowExportNames: ["useAuth", "useTheme"] }],
    },
  },
  {
    // config files and tests run in Node
    files: ["*.config.js", "src/__tests__/**", "test/**"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
])
