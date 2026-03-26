import type { KnipConfig } from 'knip';

export default {
	ignoreBinaries: ['only-allow'],
	ignoreDependencies: ['@typescript/native-preview'],
} satisfies KnipConfig;
