import { SignJWT, importPKCS8 } from 'jose';

import { base64UrlToUint8Array, uint8ArrayToBase64Url, validateBase64Url } from './base64url.ts';

const DEFAULT_EXPIRATION_SECONDS = 12 * 60 * 60;

export async function generateVAPIDKeys(): Promise<{
	publicKey: string;
	privateKey: string;
}> {
	const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
	]);

	const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
	const privateKeyPkcs8 = new Uint8Array(
		await crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
	);

	return {
		publicKey: uint8ArrayToBase64Url(publicKeyRaw),
		privateKey: uint8ArrayToBase64Url(privateKeyPkcs8),
	};
}

export function validateSubject(subject: string): void {
	if (typeof subject !== 'string' || subject.length === 0) {
		throw new Error(
			'The subject value must be a string containing an https: URL or mailto: address.',
		);
	}

	let parsed: URL;
	try {
		parsed = new URL(subject);
	} catch {
		throw new Error(`Vapid subject is not a valid URL. ${subject}`);
	}

	if (parsed.protocol !== 'https:' && parsed.protocol !== 'mailto:') {
		throw new Error(`Vapid subject is not an https: or mailto: URL. ${subject}`);
	}
}

export function validatePublicKey(publicKey: string): void {
	if (typeof publicKey !== 'string' || publicKey.length === 0) {
		throw new Error('Vapid public key must be a URL-safe Base64 encoded string.');
	}

	if (!validateBase64Url(publicKey)) {
		throw new Error('Vapid public key must be URL-safe Base64 (without "=").');
	}

	const decoded = base64UrlToUint8Array(publicKey);
	if (decoded.length !== 65) {
		throw new Error('Vapid public key should be 65 bytes long when decoded.');
	}
}

export function validatePrivateKey(privateKey: string): void {
	if (typeof privateKey !== 'string' || privateKey.length === 0) {
		throw new Error('Vapid private key must be a URL-safe Base64 encoded string.');
	}

	if (!validateBase64Url(privateKey)) {
		throw new Error('Vapid private key must be URL-safe Base64 (without "=").');
	}
}

export async function createVapidAuthHeader(
	endpoint: string,
	publicKey: string,
	privateKey: string,
	subject: string,
	expiration?: number,
): Promise<string> {
	const url = new URL(endpoint);
	const audience = `${url.protocol}//${url.host}`;

	const decodedPrivateKey = base64UrlToUint8Array(privateKey);
	const pemBase64 = btoa(String.fromCharCode(...decodedPrivateKey));
	const key = await importPKCS8(
		`-----BEGIN PRIVATE KEY-----\n${pemBase64}\n-----END PRIVATE KEY-----`,
		'ES256',
	);

	const exp = expiration ?? Math.floor(Date.now() / 1000) + DEFAULT_EXPIRATION_SECONDS;

	const jwt = await new SignJWT({ aud: audience, sub: subject })
		.setProtectedHeader({ alg: 'ES256' })
		.setExpirationTime(exp)
		.sign(key);

	return `vapid t=${jwt},k=${publicKey}`;
}
