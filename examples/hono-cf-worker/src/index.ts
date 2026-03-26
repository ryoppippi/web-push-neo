import { Hono } from 'hono';
import { generateVAPIDKeys, sendNotification } from 'web-push-neo';
import type { PushSubscription, VapidDetails } from 'web-push-neo';

interface Env {
	ASSETS: Fetcher;
	VAPID_PUBLIC_KEY?: string;
	VAPID_PRIVATE_KEY?: string;
	VAPID_SUBJECT?: string;
}

const app = new Hono<{ Bindings: Env }>();

const subscriptions: PushSubscription[] = [];

let cachedVapidKeys: { publicKey: string; privateKey: string } | undefined;

async function getVapidKeys(env: Env): Promise<{ publicKey: string; privateKey: string }> {
	if (typeof env.VAPID_PUBLIC_KEY === 'string' && typeof env.VAPID_PRIVATE_KEY === 'string') {
		return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
	}
	cachedVapidKeys ??= await generateVAPIDKeys();
	return cachedVapidKeys;
}

app.get('/api/vapid-public-key', async (c) => {
	const keys = await getVapidKeys(c.env);
	return c.json({ publicKey: keys.publicKey });
});

app.post('/api/subscribe', async (c) => {
	const subscription = await c.req.json<PushSubscription>();
	subscriptions.push(subscription);
	return c.json({ ok: true });
});

app.post('/api/send', async (c) => {
	const { title, body } = await c.req.json<{ title: string; body: string }>();
	const keys = await getVapidKeys(c.env);

	const vapidDetails: VapidDetails = {
		subject: c.env.VAPID_SUBJECT ?? 'mailto:test@example.com',
		publicKey: keys.publicKey,
		privateKey: keys.privateKey,
	};

	const results = await Promise.allSettled(
		subscriptions.map((sub) =>
			sendNotification(sub, JSON.stringify({ title, body }), { vapidDetails }),
		),
	);

	return c.json({
		sent: results.filter((r) => r.status === 'fulfilled').length,
		failed: results.filter((r) => r.status === 'rejected').length,
	});
});

app.get('/api/generate-keys', async (_c) => {
	const keys = await generateVAPIDKeys();
	return _c.json(keys);
});

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
