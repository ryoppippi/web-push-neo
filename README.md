# modern-web-push

Runtime-agnostic Web Push library using the Web Crypto API.

Works in **Node.js**, **Deno**, **Bun**, **Cloudflare Workers**, and any environment with Web Crypto API + `fetch`.

## Install

```bash
pnpm add modern-web-push
```

## Usage

```ts
import { generateVAPIDKeys, sendNotification } from 'modern-web-push';

// Generate VAPID keys (one-time)
const vapidKeys = await generateVAPIDKeys();
console.log(vapidKeys.publicKey);  // base64url-encoded public key
console.log(vapidKeys.privateKey); // base64url-encoded private key (PKCS8)

// Send a push notification
const result = await sendNotification(
  {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  },
  JSON.stringify({ title: 'Hello', body: 'World' }),
  {
    vapidDetails: {
      subject: 'mailto:admin@example.com',
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
    },
  },
);
```

## API

### `generateVAPIDKeys(): Promise<{ publicKey: string; privateKey: string }>`

Generates an ECDSA P-256 key pair for VAPID authentication. Returns base64url-encoded keys.

### `sendNotification(subscription, payload?, options?): Promise<SendResult>`

Encrypts the payload (RFC 8291) and sends it to the push service via `fetch`.

### `generateRequestDetails(subscription, payload?, options?): Promise<RequestDetails>`

Generates the HTTP request details without sending. Useful for custom fetch implementations.

### Options

```ts
interface SendNotificationOptions {
  vapidDetails: {
    subject: string;    // https: URL or mailto: address
    publicKey: string;  // base64url VAPID public key
    privateKey: string; // base64url VAPID private key (PKCS8)
  };
  TTL?: number;          // Time-to-live in seconds (default: 2419200 = 4 weeks)
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  topic?: string;        // Max 32 chars, base64url characters only
  headers?: Record<string, string>;
  signal?: AbortSignal;
}
```

## Differences from `web-push`

| Feature | `web-push` | `modern-web-push` |
|---------|-----------|-------------------|
| Runtime | Node.js only | Any (Web Crypto + fetch) |
| Language | JavaScript | TypeScript |
| Module | CJS | ESM-only |
| API style | Global mutable state | Stateless async functions |
| Encryption | Node.js crypto + http_ece | Web Crypto API |
| HTTP | Node.js https | fetch |
| GCM support | Yes | No (deprecated 2019) |
| aesgcm encoding | Yes | No (aes128gcm only) |
| Proxy support | Yes (https-proxy-agent) | No (use custom fetch) |
| Dependencies | 5 | 1 (jose) |

## Licence

[MPL-2.0](./LICENSE)
