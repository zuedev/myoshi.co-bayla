/**
 * Worker script to check for unread notifications from myoshi.co and send email alerts.
 * This script is triggered by a cron schedule defined in wrangler.jsonc.
 */

import { EmailMessage } from "cloudflare:email";

const NOTIFICATION_EMAIL_FROM = "noreply@zue.dev";
const NOTIFICATION_EMAIL_TO = "zuedev@gmail.com";

async function fetchNotifications(environment) {
  const bearer = await environment.MYOSHI_CO_BAYLA_API_KEY.get();

  const response = await fetch("https://api.myoshi.co/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify({
      query: `{
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
      }`,
    }),
  });

  const data = await response.json();

  if (data?.errors) {
    console.error("GraphQL errors:", JSON.stringify(data.errors));
  }

  console.log("GraphQL response:", JSON.stringify(data));

  return data?.data?.notifications ?? null;
}

function buildNotificationEmail(notifications) {
  const { unreadCount, list } = notifications;
  const edges = (list?.edges ?? []).filter(({ node }) => node && !node.is_read);

  const rows = edges
    .map(({ node }) => {
      const link = node.url
        ? `<a href="${node.url}">${node.message}</a>`
        : node.message;
      return `<tr><td>${link}</td><td>${node.created_at ?? ""}</td></tr>`;
    })
    .join("\n");

  const subject = `[myoshi.co] You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`;

  const html = `
    <h2>Unread Notifications (${unreadCount})</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>Message</th><th>Date</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  return { subject, html };
}

function createRawMimeMessage(from, to, subject, htmlBody) {
  const messageId = `<${crypto.randomUUID()}@${from.split("@")[1]}>`;
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Message-ID: ${messageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    "",
    htmlBody,
  ].join("\r\n");

  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(message));
      controller.close();
    },
  });
}

const KV_KEY_LAST_NOTIFIED_IDS = "last_notified_ids";

export async function checkAndSendNotifications(environment) {
  console.log("Checking notifications...");

  const notifications = await fetchNotifications(environment);

  if (!notifications) {
    console.log("Failed to fetch notifications.");
    return;
  }

  if (notifications.unreadCount === 0) {
    console.log("No unread notifications.");
    // Clear stored IDs when everything is read
    await environment.MYOSHI_CO_BAYLA_KV.delete(KV_KEY_LAST_NOTIFIED_IDS);
    return;
  }

  // Collect the current set of unread notification IDs
  const unreadIds = (notifications.list?.edges ?? [])
    .filter(({ node }) => node && !node.is_read)
    .map(({ node }) => node.id)
    .sort()
    .join(",");

  // Compare against the last set we emailed about
  const lastNotifiedIds = await environment.MYOSHI_CO_BAYLA_KV.get(
    KV_KEY_LAST_NOTIFIED_IDS,
  );

  if (unreadIds === lastNotifiedIds) {
    console.log("No new notifications since last email. Skipping.");
    return;
  }

  const { subject, html } = buildNotificationEmail(notifications);
  const rawEmail = createRawMimeMessage(
    NOTIFICATION_EMAIL_FROM,
    NOTIFICATION_EMAIL_TO,
    subject,
    html,
  );

  const emailMessage = new EmailMessage(
    NOTIFICATION_EMAIL_FROM,
    NOTIFICATION_EMAIL_TO,
    rawEmail,
  );

  await environment.SEND_EMAIL.send(emailMessage);

  // Store the current unread IDs so we don't re-send for the same set
  await environment.MYOSHI_CO_BAYLA_KV.put(KV_KEY_LAST_NOTIFIED_IDS, unreadIds);

  console.log(`Notification email sent (${notifications.unreadCount} unread).`);
}
