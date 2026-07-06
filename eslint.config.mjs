import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'coolhand',
              importNames: [
                'FeedbackWidget',
                'PartialFeedbackManager',
                'PartialFeedbackWidget',
                'CoolhandFeedback',
                'COOLHAND_API_URL',
              ],
              message:
                'coolhand builds UMD with export:"default" — named exports are undefined at runtime. Use the default singleton (or `import type`).',
            },
          ],
        },
      ],
    },
  },
);
