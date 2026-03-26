<h1 align="center">web-push-neo</h1>

<p align="center">
    <a href="https://socket.dev/api/npm/package/web-push-neo"><img src="https://socket.dev/api/badge/npm/package/web-push-neo" alt="Socket Badge" /></a>
    <a href="https://npmjs.com/package/web-push-neo"><img src="https://img.shields.io/npm/v/web-push-neo?color=yellow" alt="npm version" /></a>
    <a href="https://tanstack.com/stats/npm?packageGroups=%5B%7B%22packages%22:%5B%7B%22name%22:%22web-push-neo%22%7D%5D%7D%5D&range=30-days&transform=none&binType=daily&showDataMode=all&height=400"><img src="https://img.shields.io/npm/dt/web-push-neo" alt="NPM Downloads" /></a>
    <a href="https://packagephobia.com/result?p=web-push-neo"><img src="https://packagephobia.com/badge?p=web-push-neo" alt="install size" /></a>
</p>

A modern, runtime-agnostic fork of [web-push](https://github.com/web-push-libs/web-push), rewritten in TypeScript.

# Why fork?

- **Runtime-agnostic** — uses Web Crypto API + `fetch` instead of Node.js `crypto` / `https`. Works in Node.js, Deno, Bun, Cloudflare Workers, and any environment with Web Crypto support.
- **TypeScript / ESM-only** — fully typed, tree-shakeable, no CJS.
- **Stateless API** — no global `setVapidDetails()` / `setGCMAPIKey()`. VAPID details are passed per-call.
- **aes128gcm only** — dropped the legacy `aesgcm` encoding. All modern browsers (including Safari 16+) support `aes128gcm`.
- **No GCM** — Google Cloud Messaging was deprecated in 2019. FCM works via VAPID.
- **1 dependency** — only [jose](https://github.com/panva/jose) for JWT signing (also runtime-agnostic).

# Why

Web push requires that push messages triggered from a backend be done via the
[Web Push Protocol](https://tools.ietf.org/html/draft-ietf-webpush-protocol)
and if you want to send data with your push message, you must also encrypt
that data according to the [Message Encryption for Web Push spec](https://tools.ietf.org/html/draft-ietf-webpush-encryption).

This module makes it easy to send messages using the **Web Crypto API** and
**fetch**, so it works in Node.js, Deno, Bun, Cloudflare Workers, and any
runtime with Web Crypto support.

# Install

    pnpm add web-push-neo

# Usage

```typescript
import {
	generateVAPIDKeys,
	sendNotification,
	type PushSubscription,
	type VapidDetails,
} from 'web-push-neo';

// VAPID keys should be generated only once.
const vapidKeys = await generateVAPIDKeys();

const vapidDetails: VapidDetails = {
	subject: 'mailto:example@yourdomain.org',
	publicKey: vapidKeys.publicKey,
	privateKey: vapidKeys.privateKey,
};

// This is the same output of calling JSON.stringify on a PushSubscription
const pushSubscription: PushSubscription = {
	endpoint: '.....',
	keys: {
		auth: '.....',
		p256dh: '.....',
	},
};

await sendNotification(pushSubscription, 'Your Push Payload Text', {
	vapidDetails,
});
```

## Using VAPID Key for applicationServerKey

When subscribing to push messages, you'll need to pass your VAPID key,
which you can do like so:

```typescript
registration.pushManager.subscribe({
	userVisibleOnly: true,
	applicationServerKey: '<Your Public Key from generateVAPIDKeys()>',
});
```

# API Reference

## sendNotification(pushSubscription, payload, options)

```typescript
import {
	sendNotification,
	type PushSubscription,
	type SendNotificationOptions,
	type SendResult,
} from 'web-push-neo';

const pushSubscription: PushSubscription = {
	endpoint: '< Push Subscription URL >',
	keys: {
		p256dh: '< User Public Encryption Key >',
		auth: '< User Auth Secret >',
	},
};

const payload = '< Push Payload String >';

const options: SendNotificationOptions = {
	vapidDetails: {
		subject: "< 'mailto' Address or URL >",
		publicKey: '< URL Safe Base64 Encoded Public Key >',
		privateKey: '< URL Safe Base64 Encoded Private Key >',
	},
	TTL: 60,
	headers: {
		'< header name >': '< header value >',
	},
	urgency: 'normal',
	topic: '< Use a maximum of 32 characters from the URL or filename-safe Base64 characters sets. >',
	signal: AbortSignal.timeout(5000),
};

const result: SendResult = await sendNotification(pushSubscription, payload, options);
```

> **Note:** `sendNotification()` does not require a payload. You can also
> omit `vapidDetails` if the push service supports unauthenticated requests.

### Input

**Push Subscription**

The first argument must be an object containing the details for a push
subscription.

The expected format is the same output as JSON.stringify'ing a PushSubscription
in the browser.

**Payload**

The payload is optional, but if set, will be the data sent with a push
message.

This must be either a _string_ or a _Uint8Array_.

> **Note:** In order to encrypt the _payload_, the _pushSubscription_ **must**
> have a _keys_ object with _p256dh_ and _auth_ values.

**Options**

Options is an optional argument that if defined should be an object containing
any of the following values defined, although none of them are required.

- **vapidDetails** should be an object with _subject_, _publicKey_ and
  _privateKey_ values defined. These values should follow the [VAPID Spec](https://tools.ietf.org/html/draft-thomson-webpush-vapid). Both PKCS8 and raw 32-byte private keys are supported.
- **TTL** is a value in seconds that describes how long a push message is
  retained by the push service (by default, four weeks).
- **headers** is an object with all the extra headers you want to add to the request.
- **urgency** is to indicate to the push service whether to send the notification immediately or prioritise the recipient's device power considerations for delivery. Provide one of the following values: very-low, low, normal, or high. To attempt to deliver the notification immediately, specify high.
- **topic** optionally provide an identifier that the push service uses to coalesce notifications. Use a maximum of 32 characters from the URL or filename-safe Base64 characters sets.
- **signal** an optional `AbortSignal` to cancel the request.

### Returns

A promise that resolves if the notification was sent successfully
with details of the request, otherwise it rejects.

In both cases, resolving or rejecting, you'll be able to access the following
values on the returned object or error.

- _statusCode_, the status code of the response from the push service;
- _headers_, the headers of the response from the push service;
- _body_, the body of the response from the push service.

<hr />

## generateVAPIDKeys()

```typescript
import { generateVAPIDKeys } from 'web-push-neo';

const vapidKeys = await generateVAPIDKeys();

// Prints 2 URL Safe Base64 Encoded Strings
console.log(vapidKeys.publicKey, vapidKeys.privateKey);
```

### Input

None.

### Returns

Returns a promise that resolves to an object with **publicKey** and **privateKey** values which are
URL Safe Base64 encoded strings. The private key is in PKCS8 format.

> **Note:** You should create these keys once, store them and use them for all
> future messages you send.

<hr />

## generateRequestDetails(pushSubscription, payload, options)

```typescript
import { generateRequestDetails, type RequestDetails } from 'web-push-neo';

const details: RequestDetails = await generateRequestDetails(pushSubscription, payload, options);
// details contains: endpoint, method, headers, body
```

> **Note:** When calling `generateRequestDetails()` the payload argument
> does not _need_ to be defined, passing in null will return no body and
> exclude any unnecessary headers.

### Input

Same as `sendNotification()`.

### Returns

A promise that resolves to an object containing all the details needed to make a network request:

- _endpoint_, the URL to send the request to;
- _method_, this will be 'POST';
- _headers_, the headers to add to the request;
- _body_, the body of the request (as a Uint8Array, or null).

<hr />

# Differences from `web-push`

| Feature         | `web-push`                | `web-push-neo`            |
| --------------- | ------------------------- | ------------------------- |
| Runtime         | Node.js only              | Any (Web Crypto + fetch)  |
| Language        | JavaScript                | TypeScript                |
| Module          | CJS                       | ESM-only                  |
| API style       | Global mutable state      | Stateless async functions |
| Encryption      | Node.js crypto + http_ece | Web Crypto API            |
| HTTP            | Node.js https             | fetch                     |
| GCM support     | Yes                       | No (deprecated 2019)      |
| aesgcm encoding | Yes                       | No (aes128gcm only)       |
| Proxy support   | Yes (https-proxy-agent)   | No (use custom fetch)     |
| Dependencies    | 5                         | 1 (jose)                  |

# Browser Support

All modern browsers that support the Push API work with this library.
The library itself runs on any server-side JavaScript runtime with
Web Crypto API and fetch support.

# Running tests

    pnpm test

# Licence

[MPL-2.0](./LICENSE)
