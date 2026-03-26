import type { KnipConfig } from 'knip';

export default {
	ignoreBinaries: ['only-allow'],
	ignoreDependencies: ['@typescript/native-preview', 'changelogithub'],
	workspaces: {
		'.': {},
		'examples/*': {
			ignore: ['**/public/**'],
		},
	},
} satisfies KnipConfig;
