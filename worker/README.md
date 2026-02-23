# [myoshi.co/bayla](https://myoshi.co/bayla) Worker

This worker acts as a light backend for [bayla's myoshi.co profile](https://myoshi.co/bayla).

## Development

Some routes on the worker use the MyOshi.co API which requires an API key. This API key is stored in [Cloudflare's secrets store](https://developers.cloudflare.com/secrets-store/) in production, which can be replicated locally using the following command:

```bash
npx wrangler secrets-store secret create [STORE-ID] --name myoshi-co-bayla --scopes workers --value [API-KEY]
```

Make sure to replace `[STORE-ID]` with the ID of your secrets store (defined in [wrangler.jsonc](./wrangler.jsonc)) and `[API-KEY]` with your actual API key from [MyOshi.co](https://myoshi.co/settings/api-keys).

You can also check if the secret is correctly set up by running:

```bash
npx wrangler secrets-store secret list [STORE-ID]
```
