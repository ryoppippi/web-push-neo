import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { WebPushError } from './error.ts';
import { generateVAPIDKeys } from './vapid.ts';
import { generateRequestDetails, sendNotification } from './web-push.ts';
import type { PushSubscription } from './web-push.ts';

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/test-sub-id';

const server = setupServer();
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

async function createTestSubscription(): Promise<{
	subscription: PushSubscription;
	vapidKeys: { publicKey: string; privateKey: string };
}> {
	const vapidKeys = await generateVAPIDKeys();

	const subKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveBits',
	]);
	const subPub = new Uint8Array(await crypto.subtle.exportKey('raw', subKeyPair.publicKey));
	const auth = new Uint8Array(16);
	crypto.getRandomValues(auth);

	const toBase64Url = (bytes: Uint8Array) =>
		btoa(String.fromCharCode(...bytes))
			.replaceAll('+', '-')
			.replaceAll('/', '_')
			.replaceAll('=', '');

	return {
		subscription: {
			endpoint: ENDPOINT,
			keys: {
				p256dh: toBase64Url(subPub),
				auth: toBase64Url(auth),
			},
		},
		vapidKeys,
	};
}

describe('generateRequestDetails', () => {
	it('generates correct headers for a payload notification', async () => {
		const { subscription, vapidKeys } = await createTestSubscription();

		const details = await generateRequestDetails(
			subscription,
			JSON.stringify({ title: 'Test', body: 'Hello' }),
			{
				vapidDetails: {
					subject: 'mailto:test@example.com',
					publicKey: vapidKeys.publicKey,
					privateKey: vapidKeys.privateKey,
				},
			},
		);

		expect(details.method).toBe('POST');
		expect(details.endpoint).toBe(ENDPOINT);
		expect(details.headers['Content-Encoding']).toBe('aes128gcm');
		expect(details.headers['Content-Type']).toBe('application/octet-stream');
		expect(details.headers['Authorization']).toMatch(/^vapid t=/);
		expect(details.body).toBeInstanceOf(Uint8Array);
	});

	it('throws on missing subscription endpoint', async () => {
		// @ts-expect-error -- testing invalid input
		await expect(generateRequestDetails({})).rejects.toThrow('endpoint');
	});

	it('throws on payload without subscription keys', async () => {
		await expect(
			// @ts-expect-error -- testing invalid input
			generateRequestDetails({ endpoint: ENDPOINT, keys: {} }, 'test'),
		).rejects.toThrow("'auth' and 'p256dh'");
	});

	it('sets custom TTL and urgency', async () => {
		const { subscription, vapidKeys } = await createTestSubscription();

		const details = await generateRequestDetails(subscription, null, {
			TTL: 60,
			urgency: 'high',
			vapidDetails: {
				subject: 'mailto:test@example.com',
				publicKey: vapidKeys.publicKey,
				privateKey: vapidKeys.privateKey,
			},
		});

		expect(details.headers['TTL']).toBe('60');
		expect(details.headers['Urgency']).toBe('high');
	});

	it('rejects negative TTL', async () => {
		const { subscription } = await createTestSubscription();
		await expect(generateRequestDetails(subscription, null, { TTL: -1 })).rejects.toThrow(
			'TTL should be a non-negative integer',
		);
	});

	it('rejects auth secret shorter than 16 bytes', async () => {
		const { vapidKeys } = await createTestSubscription();
		const shortAuth = btoa('short').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
		await expect(
			generateRequestDetails(
				{ endpoint: ENDPOINT, keys: { p256dh: 'A'.repeat(87), auth: shortAuth } },
				'test',
				{
					vapidDetails: {
						subject: 'mailto:test@example.com',
						publicKey: vapidKeys.publicKey,
						privateKey: vapidKeys.privateKey,
					},
				},
			),
		).rejects.toThrow('auth key should be at least 16 bytes');
	});

	it('sets topic header', async () => {
		const { subscription, vapidKeys } = await createTestSubscription();

		const details = await generateRequestDetails(subscription, null, {
			topic: 'myTopic',
			vapidDetails: {
				subject: 'mailto:test@example.com',
				publicKey: vapidKeys.publicKey,
				privateKey: vapidKeys.privateKey,
			},
		});

		expect(details.headers['Topic']).toBe('myTopic');
	});
});

describe('sendNotification', () => {
	it('sends a POST request and returns result on success', async () => {
		const { subscription, vapidKeys } = await createTestSubscription();

		server.use(
			http.post(ENDPOINT, () => {
				return new HttpResponse(null, { status: 201 });
			}),
		);

		const result = await sendNotification(subscription, JSON.stringify({ title: 'Test' }), {
			vapidDetails: {
				subject: 'mailto:test@example.com',
				publicKey: vapidKeys.publicKey,
				privateKey: vapidKeys.privateKey,
			},
		});

		expect(result.statusCode).toBe(201);
	});

	it('throws WebPushError on non-2xx response', async () => {
		const { subscription, vapidKeys } = await createTestSubscription();

		server.use(
			http.post(ENDPOINT, () => {
				return new HttpResponse('subscription expired', { status: 410 });
			}),
		);

		try {
			await sendNotification(subscription, 'test', {
				vapidDetails: {
					subject: 'mailto:test@example.com',
					publicKey: vapidKeys.publicKey,
					privateKey: vapidKeys.privateKey,
				},
			});
			expect.unreachable('Should have thrown');
		} catch (error: unknown) {
			expect(error).toBeInstanceOf(WebPushError);
			if (error instanceof WebPushError) {
				expect(error.statusCode).toBe(410);
				expect(error.body).toBe('subscription expired');
			}
		}
	});
});
