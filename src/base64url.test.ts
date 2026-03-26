import { describe, expect, it } from 'vitest';

import { base64UrlToUint8Array, uint8ArrayToBase64Url, validateBase64Url } from './base64url.ts';

describe('base64url', () => {
	it('round-trips encode/decode', () => {
		const original = new Uint8Array([0, 1, 2, 255, 254, 253]);
		const encoded = uint8ArrayToBase64Url(original);
		const decoded = base64UrlToUint8Array(encoded);
		expect(decoded).toEqual(original);
	});

	it('encodes to URL-safe characters (no +, /, =)', () => {
		const bytes = new Uint8Array(256);
		for (let i = 0; i < 256; i++) {
			bytes[i] = i;
		}
		const encoded = uint8ArrayToBase64Url(bytes);
		expect(encoded).not.toContain('+');
		expect(encoded).not.toContain('/');
		expect(encoded).not.toContain('=');
	});

	it('handles empty input', () => {
		const empty = new Uint8Array(0);
		const encoded = uint8ArrayToBase64Url(empty);
		expect(encoded).toBe('');
		const decoded = base64UrlToUint8Array('');
		expect(decoded.length).toBe(0);
	});

	describe('validateBase64Url', () => {
		it('accepts valid base64url strings', () => {
			expect(validateBase64Url('ABCDabcd0123-_')).toBe(true);
		});

		it('rejects strings with padding', () => {
			expect(validateBase64Url('abc=')).toBe(false);
		});

		it('rejects strings with +', () => {
			expect(validateBase64Url('abc+def')).toBe(false);
		});

		it('rejects strings with /', () => {
			expect(validateBase64Url('abc/def')).toBe(false);
		});
	});
});
