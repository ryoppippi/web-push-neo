import { base64UrlToUint8Array, validateBase64Url } from './base64url.ts';
import { DEFAULT_TTL, Urgency } from './constants.ts';
import { encryptPayload } from './encryption.ts';
import { WebPushError } from './error.ts';
import type { UrgencyType } from './constants.ts';
import {
	createVapidAuthHeader,
	validatePrivateKey,
	validatePublicKey,
	validateSubject,
} from './vapid.ts';

export interface PushSubscription {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
}

export interface VapidDetails {
	subject: string;
	publicKey: string;
	privateKey: string;
}

export interface SendNotificationOptions {
	TTL?: number;
	headers?: Record<string, string>;
	urgency?: UrgencyType;
	topic?: string;
	vapidDetails?: VapidDetails;
	signal?: AbortSignal;
}

export interface SendResult {
	statusCode: number;
	headers: Headers;
	body: string;
}

export interface RequestDetails {
	endpoint: string;
	method: string;
	headers: Record<string, string>;
	body: Uint8Array<ArrayBuffer> | null;
}

const URGENCY_VALUES: ReadonlySet<string> = new Set(Object.values(Urgency));

function validateUrgency(urgency: string): urgency is UrgencyType {
	return URGENCY_VALUES.has(urgency);
}

function validateSubscription(subscription: PushSubscription, hasPayload: boolean): void {
	if (typeof subscription?.endpoint !== 'string' || subscription.endpoint.length === 0) {
		throw new Error('You must pass in a subscription with at least an endpoint.');
	}

	if (!hasPayload) {
		return;
	}

	if (
		typeof subscription.keys?.p256dh !== 'string' ||
		typeof subscription.keys?.auth !== 'string' ||
		subscription.keys.p256dh.length === 0 ||
		subscription.keys.auth.length === 0
	) {
		throw new Error(
			"To send a message with a payload, the subscription must have 'auth' and 'p256dh' keys.",
		);
	}

	const p256dhBytes = base64UrlToUint8Array(subscription.keys.p256dh);
	if (p256dhBytes.length !== 65) {
		throw new Error('The subscription p256dh value should be 65 bytes long.');
	}

	const authBytes = base64UrlToUint8Array(subscription.keys.auth);
	if (authBytes.length < 16) {
		throw new Error('The subscription auth key should be at least 16 bytes long.');
	}
}

function validateOptions(options?: SendNotificationOptions): {
	ttl: number;
	urgency: UrgencyType;
	topic: string | undefined;
} {
	const ttl = options?.TTL ?? DEFAULT_TTL;
	if (typeof ttl !== 'number' || !Number.isInteger(ttl) || ttl < 0) {
		throw new Error('TTL should be a non-negative integer.');
	}

	const urgency = options?.urgency ?? Urgency.NORMAL;
	if (!validateUrgency(urgency)) {
		throw new Error('Unsupported urgency specified.');
	}

	const topic = options?.topic;
	if (topic !== undefined && !validateBase64Url(topic)) {
		throw new Error('Topic must use URL or filename-safe Base64 characters.');
	}
	if (topic !== undefined && topic.length > 32) {
		throw new Error('Topic must be maximum 32 characters.');
	}

	return { ttl, urgency, topic };
}

export async function generateRequestDetails(
	subscription: PushSubscription,
	payload?: string | Uint8Array<ArrayBuffer> | null,
	options?: SendNotificationOptions,
): Promise<RequestDetails> {
	// oxlint-disable-next-line no-negated-condition -- != null intentionally checks both null and undefined
	const hasPayload = payload != null;
	validateSubscription(subscription, hasPayload);
	const { ttl, urgency, topic } = validateOptions(options);

	const headers: Record<string, string> = {
		TTL: String(ttl),
		Urgency: urgency,
		...options?.headers,
	};

	if (topic !== undefined) {
		headers['Topic'] = topic;
	}

	let body: Uint8Array<ArrayBuffer> | null = null;

	if (hasPayload) {
		const subscriberPublicKey = base64UrlToUint8Array(subscription.keys.p256dh);
		const authSecret = base64UrlToUint8Array(subscription.keys.auth);

		body = await encryptPayload(payload, subscriberPublicKey, authSecret);

		headers['Content-Length'] = String(body.length);
		headers['Content-Type'] = 'application/octet-stream';
		headers['Content-Encoding'] = 'aes128gcm';
	} else {
		headers['Content-Length'] = '0';
	}

	if (options?.vapidDetails !== undefined) {
		const { subject, publicKey, privateKey } = options.vapidDetails;
		validateSubject(subject);
		validatePublicKey(publicKey);
		validatePrivateKey(privateKey);

		headers['Authorization'] = await createVapidAuthHeader(
			subscription.endpoint,
			publicKey,
			privateKey,
			subject,
		);
	}

	return {
		endpoint: subscription.endpoint,
		method: 'POST',
		headers,
		body,
	};
}

export async function sendNotification(
	subscription: PushSubscription,
	payload?: string | Uint8Array<ArrayBuffer> | null,
	options?: SendNotificationOptions,
): Promise<SendResult> {
	const requestDetails = await generateRequestDetails(subscription, payload, options);

	const response = await fetch(requestDetails.endpoint, {
		method: requestDetails.method,
		headers: requestDetails.headers,
		body: requestDetails.body,
		signal: options?.signal,
	});

	const responseBody = await response.text();

	if (!response.ok) {
		throw new WebPushError(
			'Received unexpected response code',
			response.status,
			response.headers,
			responseBody,
			requestDetails.endpoint,
		);
	}

	return {
		statusCode: response.status,
		headers: response.headers,
		body: responseBody,
	};
}
