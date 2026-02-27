# `/live.svg` – Twitch Live Status Badge

A tiny image (badge) that automatically shows whether a Twitch channel is **live** or **offline**. You can drop it into any website, profile page, or README — it updates on its own every time someone loads the page.

- **Live** → displays green "live now" text
- **Offline** → displays red "not live" text (or "not live (3h ago)" if `showLastOnline` is enabled)

No Twitch account or API key is needed to use it.

## Quick Start

Just paste this URL wherever images are supported:

```
https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg
```

By default it checks the channel **zuedev** (mine). To check a different channel, add `?twitchUsername=yourchannel` to the end (see [Customisation](#customisation) below).

## Real-World Example

Here's how the badge is used on my own [custom.html](../../custom.html) — wrapped in a link so clicking it opens the Twitch channel:

```html
<a href="https://twitch.tv/zuedev" target="_blank">
  <img src="https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg" />
</a>
```

This shows the badge on the page and, when clicked, takes the visitor straight to the Twitch channel.

## How It Works (In Simple Terms)

Every time someone loads the badge image, the server quickly peeks at Twitch's public preview image for the channel. If Twitch has a live preview available, the channel must be streaming — so the badge says "live now." If there's no preview, the channel is offline and the badge says "not live."

Optionally, you can add `showLastOnline` to the URL to enable "last online" tracking. When enabled, the server saves a timestamp each time the channel is seen live and appends a relative time to the offline text (e.g. "not live (3h ago)"). This works with custom `notLiveText` too — for example, `notLiveText=offline` becomes "offline (3h ago)".

> **Note:** Because this feature bypasses the Twitch API and relies on checking the public preview image, the badge needs to "see" the channel live at least once before it can display a "last online" time. Until then, the offline text will appear without a timestamp.

## Customisation

You can tweak the badge by adding options to the URL. All options are **optional** — if you leave them out, the defaults shown below are used.

Add options to the URL with `?option=value`. To use more than one, separate them with `&`.

**Example:** `https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg?twitchUsername=mychannel&isLiveText=STREAMING`

| Option           | Default    | What it does                                                                                                                                                                     |
| ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `twitchUsername` | `zuedev`   | The Twitch channel to check                                                                                                                                                      |
| `isLiveText`     | `live now` | The text shown when the channel is live                                                                                                                                          |
| `notLiveText`    | `not live` | The text shown when the channel is offline                                                                                                                                       |
| `showLastOnline` | —          | Add this param to enable "last online" tracking. When offline, appends a relative timestamp to `notLiveText` (e.g. "not live (3h ago)", or "offline (3h ago)" with custom text). |
| `isLiveColor`    | `#22c55e`  | Colour of the text when live (default: green)                                                                                                                                    |
| `notLiveColor`   | `#ef4444`  | Colour of the text when offline (default: red)                                                                                                                                   |
| `fillColor`      | `black`    | Background colour of the badge                                                                                                                                                   |
| `width`          | `60`       | Width of the badge in pixels                                                                                                                                                     |
| `height`         | `20`       | Height of the badge in pixels                                                                                                                                                    |
| `strokeColor`    | `none`     | Stroke (outline) colour of the text                                                                                                                                              |
| `strokeWidth`    | `0`        | Stroke width of the text in pixels                                                                                                                                               |
| `svgOnline`      | —          | Custom SVG code to show when the channel is live (requires `svgOffline` too)                                                                                                     |
| `svgOffline`     | —          | Custom SVG code to show when the channel is offline (requires `svgOnline` too)                                                                                                   |

> **Tip:** Colours use hex codes. When putting a `#` in a URL, write it as `%23`. For example, bright green `#00ff00` becomes `%2300ff00`.

## More Examples

### Check a different channel

```
https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg?twitchUsername=mychannel
```

### Change the text

```
https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg?isLiveText=STREAMING&notLiveText=OFFLINE
```

### Change the colours

```
https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg?isLiveColor=%2300ff00&notLiveColor=%23888888
```

### Add a text outline (stroke)

```
https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg?strokeColor=white&strokeWidth=1
```

### Use fully custom SVG

Provide **both** `svgOnline` and `svgOffline` to completely replace the default badge with your own SVG markup. If only one is provided, it is ignored and the default badge is used.

```
https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg?svgOnline=<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20"><text y="15" fill="green">🟢 LIVE</text></svg>&svgOffline=<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20"><text y="15" fill="red">⚫ OFF</text></svg>
```

> **Note:** Remember to URL-encode special characters (`<` → `%3C`, `>` → `%3E`, `"` → `%22`, `#` → `%23`, etc.) when passing SVG in query parameters.

### Use in a Markdown file (e.g. a GitHub README)

```markdown
![Live status](https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg)
```

### Use in HTML with a clickable link to the channel

```html
<a href="https://twitch.tv/zuedev" target="_blank">
  <img src="https://myoshi-co-bayla-worker.cloudflare.zue.dev/live.svg" />
</a>
```

## Technical Details

The badge is never cached, so it always reflects the current live status.

| Header                        | Value                                 |
| ----------------------------- | ------------------------------------- |
| `Content-Type`                | `image/svg+xml`                       |
| `Cache-Control`               | `no-cache, no-store, must-revalidate` |
| `Access-Control-Allow-Origin` | `*`                                   |
