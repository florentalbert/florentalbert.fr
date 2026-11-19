// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default defineConfig(
	{
		ignores: [
			'dist/',
			'.astro/',
			'node_modules/',
			'test-results/',
			'playwright-report/',
			'.lighthouse/',
		],
	},
	js.configs.recommended,
	tseslint.configs.recommended,
	astro.configs['flat/recommended'],
	// Accessibility rules on .astro templates (specs/00-principles.md, A11Y-3).
	astro.configs['flat/jsx-a11y-strict'],
	{
		// Node scripts and tooling configs.
		files: ['scripts/**/*.ts', '*.config.{js,mjs,ts}', 'tests/**/*.ts'],
		languageOptions: {
			globals: {
				process: 'readonly',
				console: 'readonly',
				Buffer: 'readonly',
				URL: 'readonly',
				fetch: 'readonly',
				setTimeout: 'readonly',
			},
		},
	},
);
