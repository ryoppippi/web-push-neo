import type { KnipConfig } from 'knip';

export default {
	ignoreBinaries: [],
	ignoreDependencies: ['@typescript/native-preview', 'changelogithub', 'pkg-pr-new'],
	workspaces: {
		'.': {},
		'examples/*': {
			ignore: ['**/public/**'],
		},
	},
} satisfies KnipConfig;
