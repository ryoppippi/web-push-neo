export function base64UrlToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
	const base64 = base64url.replaceAll('-', '+').replaceAll('_', '/');
	const pad = (4 - (base64.length % 4)) % 4;
	const padded = base64 + '='.repeat(pad);
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function validateBase64Url(value: string): boolean {
	return /^[A-Za-z0-9\-_]+$/.test(value);
}
