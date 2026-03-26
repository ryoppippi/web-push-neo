import { describe, expect, it } from 'vitest';

import { encryptPayload } from './encryption.ts';

async function generateSubscriptionKeys() {
	const keyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveBits',
	]);
	const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
	const auth = new Uint8Array(16);
	crypto.getRandomValues(auth);
	return { publicKeyRaw, auth };
}

describe('encryptPayload', () => {
	it('produces an aes128gcm body with correct header structure', async () => {
		const { publicKeyRaw, auth } = await generateSubscriptionKeys();

		const body = await encryptPayload('test payload', publicKeyRaw, auth);

		const salt = body.slice(0, 16);
		expect(salt.some((b) => b !== 0)).toBe(true);

		const rs = new DataView(body.buffer, 16, 4).getUint32(0);
		expect(rs).toBe(4096);

		expect(body[20]).toBe(65);

		expect(body.length).toBeGreaterThan(86);
	});

	it('produces different ciphertext for the same payload', async () => {
		const { publicKeyRaw, auth } = await generateSubscriptionKeys();

		const a = await encryptPayload('same payload', publicKeyRaw, auth);
		const b = await encryptPayload('same payload', publicKeyRaw, auth);

		expect(a.length).toBe(b.length);

		let identical = true;
		for (let i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) {
				identical = false;
				break;
			}
		}
		expect(identical).toBe(false);
	});

	it('accepts Uint8Array payload', async () => {
		const { publicKeyRaw, auth } = await generateSubscriptionKeys();
		const payload = new TextEncoder().encode('binary payload');

		const body = await encryptPayload(payload, publicKeyRaw, auth);
		expect(body.length).toBeGreaterThan(86);
	});
});
