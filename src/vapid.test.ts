import { describe, expect, it } from 'vitest';

import { base64UrlToUint8Array } from './base64url.ts';
import {
	createVapidAuthHeader,
	generateVAPIDKeys,
	validatePublicKey,
	validatePrivateKey,
	validateSubject,
} from './vapid.ts';

describe('generateVAPIDKeys', () => {
	it('returns base64url-encoded public and private keys', async () => {
		const keys = await generateVAPIDKeys();
		expect(keys.publicKey).toMatch(/^[A-Za-z0-9\-_]+$/);
		expect(keys.privateKey).toMatch(/^[A-Za-z0-9\-_]+$/);
	});

	it('generates a 65-byte public key (uncompressed P-256)', async () => {
		const keys = await generateVAPIDKeys();
		const decoded = base64UrlToUint8Array(keys.publicKey);
		expect(decoded.length).toBe(65);
		expect(decoded[0]).toBe(0x04);
	});
});

describe('validateSubject', () => {
	it('accepts https: URLs', () => {
		expect(() => validateSubject('https://example.com')).not.toThrow();
	});

	it('accepts mailto: addresses', () => {
		expect(() => validateSubject('mailto:test@example.com')).not.toThrow();
	});

	it('rejects http: URLs', () => {
		expect(() => validateSubject('http://example.com')).toThrow();
	});

	it('rejects empty string', () => {
		expect(() => validateSubject('')).toThrow();
	});

	it('rejects invalid URLs', () => {
		expect(() => validateSubject('not-a-url')).toThrow();
	});
});

describe('validatePublicKey', () => {
	it('rejects keys that are not 65 bytes', () => {
		expect(() => validatePublicKey('AAAA')).toThrow('65 bytes');
	});
});

describe('validatePrivateKey', () => {
	it('rejects non-base64url strings', () => {
		expect(() => validatePrivateKey('invalid+key/=')).toThrow();
	});
});

describe('createVapidAuthHeader', () => {
	it('returns a valid vapid authorization header', async () => {
		const keys = await generateVAPIDKeys();
		const header = await createVapidAuthHeader(
			'https://fcm.googleapis.com/fcm/send/test',
			keys.publicKey,
			keys.privateKey,
			'mailto:test@example.com',
		);
		expect(header).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+,k=[\w-]+$/);
	});
});
