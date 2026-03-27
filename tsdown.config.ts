import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['./src/*.ts', '!./src/**/*.test.ts'],
	outDir: 'dist',
	format: 'esm',
	clean: true,
	dts: true,
	sourcemap: true,
	publint: true,
	unused: true,
	nodeProtocol: true,
});
