![Example notification email](Screenshot%202026-02-25%20155432.png)

# Email Notifications

The worker periodically checks for unread notifications on [myoshi.co](https://myoshi.co) and sends an email digest when new unread notifications are found.

## How It Works

1. A **cron trigger** (configured in [`wrangler.jsonc`](../wrangler.jsonc)) fires the worker's `scheduled` handler.
2. The handler calls `checkAndSendNotifications()` from [`notifications.js`](../notifications.js).
3. The function queries the myoshi.co GraphQL API for the current user's notifications, including `unreadCount` and the notification list.
4. If there are **no unread notifications**, execution stops early.
5. Otherwise, an HTML email is built containing only the unread notifications in a table (message + date), and sent via Cloudflare's [Email Routing](https://developers.cloudflare.com/email-routing/) using the `SEND_EMAIL` binding.

## Configuration

### Cron Schedule

The trigger interval is defined in `wrangler.jsonc` under `triggers.crons`. The current schedule is `* * * * *` (every minute). To change it, update the cron expression:

```jsonc
"triggers": {
  "crons": ["*/5 * * * *"]  // every 5 minutes
}
```

### Email Addresses

The sender and recipient are defined as constants at the top of `notifications.js`:

| Constant                  | Value              | Description        |
| ------------------------- | ------------------ | ------------------ |
| `NOTIFICATION_EMAIL_FROM` | `noreply@zue.dev`  | Envelope sender    |
| `NOTIFICATION_EMAIL_TO`   | `zuedev@gmail.com` | Envelope recipient |

These must also match the `allowed_sender_addresses` and `allowed_destination_addresses` in the `send_email` binding in `wrangler.jsonc`.

### Required Bindings

| Binding                   | Type         | Purpose                                    |
| ------------------------- | ------------ | ------------------------------------------ |
| `MYOSHI_CO_BAYLA_API_KEY` | Secret Store | Bearer token for the myoshi.co GraphQL API |
| `SEND_EMAIL`              | Send Email   | Cloudflare Email Routing outbound binding  |

## GraphQL Query

The notification data is fetched with:

```graphql
{
  notifications {
    unreadCount
    list {
      edges {
        node {
          id
          message
          is_read
          url
          batch_count
          created_at
        }
      }
    }
  }
}
```

## Email Format

The email is sent as HTML with:

- **Subject:** `[myoshi.co] You have N unread notification(s)`
- **Body:** A table listing each unread notification's message (linked to its URL if available) and timestamp.
