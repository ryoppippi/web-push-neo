import { Hono } from 'hono';
import { generateVAPIDKeys, sendNotification } from 'web-push-neo';
import type { PushSubscription, VapidDetails } from 'web-push-neo';

interface Env {
	VAPID_PUBLIC_KEY?: string;
	VAPID_PRIVATE_KEY?: string;
	VAPID_SUBJECT?: string;
}

const app = new Hono<{ Bindings: Env }>();

const subscriptions: PushSubscription[] = [];

app.get('/api/vapid-public-key', async (c) => {
	let publicKey = c.env.VAPID_PUBLIC_KEY;
	if (publicKey === undefined) {
		const keys = await generateVAPIDKeys();
		publicKey = keys.publicKey;
	}
	return c.json({ publicKey });
});

app.post('/api/subscribe', async (c) => {
	const subscription = await c.req.json<PushSubscription>();
	subscriptions.push(subscription);
	return c.json({ ok: true });
});

app.post('/api/send', async (c) => {
	const { title, body } = await c.req.json<{ title: string; body: string }>();

	const vapidDetails: VapidDetails = {
		subject: c.env.VAPID_SUBJECT ?? 'mailto:test@example.com',
		publicKey: c.env.VAPID_PUBLIC_KEY ?? '',
		privateKey: c.env.VAPID_PRIVATE_KEY ?? '',
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

export default app;
