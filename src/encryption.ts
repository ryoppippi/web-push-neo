/**
 * Web Push Message Encryption (RFC 8291 / RFC 8188 aes128gcm)
 *
 * Encryption flow:
 *   1. Generate an ephemeral ECDH P-256 key pair and a random 16-byte salt
 *   2. Derive a shared secret via ECDH with the subscriber's p256dh public key
 *   3. Derive IKM: HKDF(salt=auth_secret, ikm=shared_secret, info="WebPush: info\0" || subscriber_pub || local_pub)
 *   4. Derive CEK: HKDF(salt=salt, ikm=IKM, info="Content-Encoding: aes128gcm\0") -> 16 bytes
 *   5. Derive nonce: HKDF(salt=salt, ikm=IKM, info="Content-Encoding: nonce\0") -> 12 bytes
 *   6. Encrypt payload with AES-128-GCM using CEK and nonce
 *   7. Build aes128gcm header: [salt (16)] [record_size (4)] [keyid_len (1)] [keyid (65)]
 *   8. Concatenate header + ciphertext
 */

function concat(...arrays: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
	const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const arr of arrays) {
		result.set(arr, offset);
		offset += arr.length;
	}
	return result;
}

async function hkdfDerive(
	salt: Uint8Array<ArrayBuffer>,
	ikm: Uint8Array<ArrayBuffer>,
	info: Uint8Array<ArrayBuffer>,
	length: number,
): Promise<Uint8Array<ArrayBuffer>> {
	const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
	return new Uint8Array(
		await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8),
	);
}

/**
 * Encrypts a payload per RFC 8291 (Web Push Message Encryption) with aes128gcm encoding.
 * Returns the complete body to POST to the push service (header + ciphertext).
 */
export async function encryptPayload(
	payload: string | Uint8Array<ArrayBuffer>,
	subscriberPublicKey: Uint8Array<ArrayBuffer>,
	authSecret: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array<ArrayBuffer>> {
	const payloadBytes = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;

	// Step 1: Random salt ensures each message produces unique ciphertext
	const salt = new Uint8Array(16);
	crypto.getRandomValues(salt);

	// Step 1: Ephemeral ECDH key pair (new for each message)
	const localKeyPair = await crypto.subtle.generateKey(
		{ name: 'ECDH', namedCurve: 'P-256' },
		true,
		['deriveBits'],
	);
	const localPublicKeyRaw = new Uint8Array(
		await crypto.subtle.exportKey('raw', localKeyPair.publicKey),
	);

	// Step 2: ECDH shared secret between our ephemeral key and the subscriber's key
	const subscriberPubKey = await crypto.subtle.importKey(
		'raw',
		subscriberPublicKey,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[],
	);
	const sharedSecret = new Uint8Array(
		await crypto.subtle.deriveBits(
			{ name: 'ECDH', public: subscriberPubKey },
			localKeyPair.privateKey,
			256,
		),
	);

	// Step 3: Derive IKM from shared secret using auth secret as HKDF salt
	const keyInfoBuf = concat(
		new TextEncoder().encode('WebPush: info\0'),
		subscriberPublicKey,
		localPublicKeyRaw,
	);
	const ikm = await hkdfDerive(authSecret, sharedSecret, keyInfoBuf, 32);

	// Step 4: Derive CEK (Content Encryption Key, 16 bytes)
	const contentEncryptionKey = await hkdfDerive(
		salt,
		ikm,
		new TextEncoder().encode('Content-Encoding: aes128gcm\0'),
		16,
	);

	// Step 5: Derive nonce (12 bytes)
	const nonce = await hkdfDerive(
		salt,
		ikm,
		new TextEncoder().encode('Content-Encoding: nonce\0'),
		12,
	);

	// Pad payload with a delimiter byte (0x02) per RFC 8188 section 2
	const paddedPayload = concat(payloadBytes, new Uint8Array([2]));

	// Step 6: AES-128-GCM encryption
	const aesKey = await crypto.subtle.importKey('raw', contentEncryptionKey, 'AES-GCM', false, [
		'encrypt',
	]);
	const encrypted = new Uint8Array(
		await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPayload),
	);

	// Step 7: Build aes128gcm header (RFC 8188 section 2.1)
	// [salt (16 bytes)] [record_size (4 bytes BE)] [keyid_len (1 byte)] [keyid (65 bytes)]
	const recordSize = new Uint8Array(4);
	new DataView(recordSize.buffer).setUint32(0, 4096);

	const header = concat(
		salt,
		recordSize,
		new Uint8Array([localPublicKeyRaw.length]),
		localPublicKeyRaw,
	);

	// Step 8: Concatenate header + ciphertext
	return concat(header, encrypted);
}
