import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		files: ["**/*.{js,ts}"]
	},
	{
		languageOptions: { 
			globals: globals.browser 
		}
	},
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			'no-undef': 'off',
			'getter-return': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{
					argsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/ban-ts-comment': [
				'warn',
				{
					'ts-nocheck': false
				}
			]
		}
	},
	{
		files: ['init.js'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off'
		}
	}
];
