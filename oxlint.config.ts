import { defineConfig } from 'oxlint';

export default defineConfig({
	plugins: ['typescript', 'unicorn', 'oxc', 'import', 'promise'],
	options: {
		typeAware: true,
		typeCheck: true,
	},
	env: {
		builtin: true,
		es2024: true,
	},
	ignorePatterns: ['dist', 'node_modules', '**/public/**'],
	categories: {
		correctness: 'error',
		suspicious: 'error',
		pedantic: 'error',
		perf: 'error',
	},
	rules: {
		'no-console': 'error',
		'no-empty': 'error',
		'no-empty-function': 'error',
		'no-param-reassign': 'error',
		'no-unused-vars': [
			'error',
			{
				args: 'after-used',
				argsIgnorePattern: '^_',
				vars: 'all',
				varsIgnorePattern: '^_',
			},
		],
		complexity: ['error', { max: 30 }],
		eqeqeq: ['error', 'always', { null: 'ignore' }],
		'max-lines-per-function': ['error', { max: 100 }],

		'typescript/no-unused-vars': [
			'error',
			{
				args: 'after-used',
				argsIgnorePattern: '^_',
				vars: 'all',
				varsIgnorePattern: '^_',
			},
		],
		'typescript/no-explicit-any': 'error',
		'typescript/no-floating-promises': 'error',
		'typescript/await-thenable': 'error',
		'typescript/consistent-type-imports': [
			'error',
			{
				disallowTypeAnnotations: false,
				fixStyle: 'inline-type-imports',
				prefer: 'type-imports',
			},
		],
		'typescript/no-unnecessary-type-arguments': 'error',
		'typescript/strict-boolean-expressions': [
			'error',
			{
				allowNullableBoolean: true,
				allowNullableObject: true,
				allowNumber: false,
				allowString: false,
			},
		],
		'typescript/no-extraneous-class': 'error',
		'typescript/ban-ts-comment': [
			'error',
			{
				'ts-expect-error': 'allow-with-description',
				'ts-ignore': true,
			},
		],

		'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
		'import/first': 'error',
		'import/group-exports': 'off',
		'import/no-duplicates': 'error',
		'import/no-mutable-exports': 'error',
		'import/no-named-default': 'error',
		'import/no-named-export': 'off',
		'import/prefer-default-export': 'off',

		'unicorn/prefer-top-level-await': 'off',
		'unicorn/prefer-code-point': 'off',
		'unicorn/prefer-string-replace-all': 'error',

		curly: ['error', 'all'],
	},
	overrides: [
		{
			files: ['**/*.test.ts'],
			rules: {
				'no-console': 'off',
				'typescript/no-explicit-any': 'warn',
				'typescript/no-floating-promises': 'warn',
				'typescript/no-confusing-void-expression': 'off',
				'unicorn/consistent-function-scoping': 'off',
			},
		},
	],
});
