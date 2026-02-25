# `/live.svg` – Twitch Live Status Badge

Returns an SVG badge indicating whether a Twitch channel is currently live.

## Usage

```html
<img
  src="https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg"
  alt="Twitch live status"
/>
```

## How It Works

1. The route fetches the Twitch "live preview" image for the given channel (`https://static-cdn.jtvnw.net/previews-ttv/live_user_{channel}-320x180.jpg`).
2. If the image request succeeds (HTTP 200), the channel is **live**; otherwise it is **offline**.
3. An SVG is returned with the appropriate text and colour.

No Twitch API key is required — the check relies on the public preview image CDN.

## Query Parameters

All parameters are optional. Defaults are shown below.

| Parameter        | Default    | Description                                |
| ---------------- | ---------- | ------------------------------------------ |
| `twitchUsername` | `zuedev`   | Twitch channel name to check               |
| `isLiveText`     | `live now` | Text displayed when the channel is live    |
| `notLiveText`    | `not live` | Text displayed when the channel is offline |
| `isLiveColor`    | `#22c55e`  | Text colour when live (green)              |
| `notLiveColor`   | `#ef4444`  | Text colour when offline (red)             |
| `fillColor`      | `black`    | SVG background fill colour                 |
| `width`          | `60`       | SVG width in pixels                        |
| `height`         | `20`       | SVG height in pixels                       |

## Examples

### Default (check `zuedev`)

```
https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg
```

### Custom channel and colours

```
https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg?twitchUsername=mychannel&isLiveColor=%2300ff00&notLiveColor=%23888888
```

### Custom text

```
https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg?isLiveText=STREAMING&notLiveText=OFFLINE
```

### Embed in Markdown

```markdown
![Live status](https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg)
```

## Response

| Header                        | Value                                 |
| ----------------------------- | ------------------------------------- |
| `Content-Type`                | `image/svg+xml`                       |
| `Cache-Control`               | `no-cache, no-store, must-revalidate` |
| `Access-Control-Allow-Origin` | `*`                                   |

The `no-cache` headers ensure the badge is never served stale, so it always reflects the current live status.
