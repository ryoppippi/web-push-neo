# web-push-neo Hono + Cloudflare Worker Example

Demonstrates `web-push-neo` running in a Cloudflare Worker with Hono.

## Running locally

```bash
pnpm dev
```

Open http://localhost:8787, click "Subscribe to Push", then "Send Test Notification".

## Production notes

This example stores VAPID keys and subscriptions **in memory** for simplicity.
Cloudflare Workers are stateless — module-scope variables are lost between requests
(or when the isolate is evicted). For production use:

- **VAPID keys**: store as [Wrangler Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
  via `wrangler secret put VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`
- **Subscriptions**: persist to [KV](https://developers.cloudflare.com/kv/),
  [D1](https://developers.cloudflare.com/d1/), or
  [Durable Objects](https://developers.cloudflare.com/durable-objects/)
