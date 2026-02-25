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

function generateVisitorCounterImage(visitorCount) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="20">
    <rect width="200" height="20" fill="black"/>
    <text x="0" y="15" fill="white" font-family="monospace">Visitor Counter: ${visitorCount}</text>
  </svg>`;

  return svg;
}

export default {
  /*
    Fetch event handler, this function will be called whenever a request is made to the worker.
    The function will parse the request and return a response based on the request path.

    @param {Request} request - the incoming request object
    @param {Environment} environment - the environment object
    @param {Context} context - the context object

    @returns {Response} a new Response object
  */
  async fetch(request, environment, context) {
    let { pathname } = new URL(request.url);

    // remove trailing slash if exists
    if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);

    if (pathname === "/favicon.ico") return new Response(null, { status: 204 });

    const routes = {
      "/counter.svg": async () => {
        // Increment visitor count in KV storage
        const visitorCount = await environment.MYOSHI_CO_BAYLA_KV.get("count");
        const newCount = visitorCount ? parseInt(visitorCount) + 1 : 1;
        await environment.MYOSHI_CO_BAYLA_KV.put("count", newCount.toString());

        // Generate and return the visitor counter image
        const imageBlob = generateVisitorCounterImage(newCount);
        return new Response(imageBlob, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      },
      "/api": async () => {
        const { searchParams } = new URL(request.url);

        const responseObject = {
          // Add a unique identifier for the request
          uid: crypto.randomUUID(),
        };

        // Add version metadata from environment variables to the response object
        for (const [key, value] of Object.entries(
          environment.CF_VERSION_METADATA,
        )) {
          // Ensure the version object exists in the response object
          if (!responseObject.version) responseObject.version = {};

          // Add the version metadata to the response object if it exists in the environment variables
          if (value) responseObject.version[key] ||= value;
        }

        // Include query parameters in the response object if they exist
        if (searchParams.toString())
          responseObject.query = searchParams.toString();

        // Return the response object as JSON
        return new Response(JSON.stringify(responseObject), {
          headers: { "Content-Type": "application/json" },
        });
      },
      "/graphql/identity/me/username": async () => {
        const bearer = await environment.MYOSHI_CO_BAYLA_API_KEY.get();

        const response = await fetch("https://api.myoshi.co/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bearer}`,
          },
          body: JSON.stringify({
            query: "{ identity { me { username } } }",
          }),
        });

        const data = await response.json();

        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      },
      "/api/getCustomCSSByUsername": async () => {
        const { searchParams } = new URL(request.url);
        const username = searchParams.get("username");
        const type = searchParams.get("type");

        if (!username) {
          return new Response(
            JSON.stringify({ error: "username is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const bearer = await environment.MYOSHI_CO_BAYLA_API_KEY.get();

        const response = await fetch("https://api.myoshi.co/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bearer}`,
          },
          body: JSON.stringify({
            query: `query GetCustomCSS($username: String!) {
              profiles {
                profile(username: $username) {
                  custom_css
                }
              }
            }`,
            variables: { username },
          }),
        });

        const data = await response.json();

        if (type === "file") {
          const css = data?.data?.profiles?.profile?.custom_css || "";
          return new Response(css, {
            headers: { "Content-Type": "text/css" },
          });
        }

        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      },
    };

    return await routes[pathname]();
  },

  /*
    Email event handler, this function will be called whenever an email is sent to the worker.
    The function will parse the email message and forward it to a specified email address.

    @param {Message} message - the incoming email message object
    @param {Environment} environment - the environment object
    @param {Context} context - the context object

    @returns {void}
  */
  async email(message, environment, context) {
    message.forward("alex@zue.dev");
  },

  /*
    Scheduled event handler, this function will be called whenever a scheduled event is triggered.
    The function will perform a task and return a response based on the task outcome.

    @param {Event} event - the incoming event object
    @param {Environment} environment - the environment object
    @param {Context} context - the context object

    @returns {void}
  */
  async scheduled(event, environment, context) {
    console.log("Scheduled event triggered! Checking notifications...");

    const notifications = await fetchNotifications(environment);

    if (!notifications) {
      console.log("Failed to fetch notifications.");
      return;
    }

    if (notifications.unreadCount === 0) {
      console.log("No unread notifications.");
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
    console.log(
      `Notification email sent (${notifications.unreadCount} unread).`,
    );
  },
};
