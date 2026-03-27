import { defineConfig } from 'tsdown';

export default defineConfig({
	entry: ['./src/index.ts'],
	outDir: 'dist',
	format: 'esm',
	clean: true,
	dts: {
		tsgo: true,
	},
	sourcemap: true,
	unbundle: true,
	nodeProtocol: true,
	publint: true,
	unused: true,
});
