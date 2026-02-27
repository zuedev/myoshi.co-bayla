import { checkAndSendNotifications } from "./notifications.js";

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
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
      "/live.svg": async () => {
        const { searchParams } = new URL(request.url);

        const twitchUsername = searchParams.get("twitchUsername") || "zuedev";
        const isLiveText = searchParams.get("isLiveText") || "live now";
        const isLiveColor = searchParams.get("isLiveColor") || "#22c55e";
        const notLiveColor = searchParams.get("notLiveColor") || "#ef4444";
        const fillColor = searchParams.get("fillColor") || "black";
        const width = searchParams.get("width") || "60";
        const height = searchParams.get("height") || "20";
        const strokeColor = searchParams.get("strokeColor") || "none";
        const strokeWidth = searchParams.get("strokeWidth") || "0";

        const svgOnline = searchParams.get("svgOnline");
        const svgOffline = searchParams.get("svgOffline");
        const showLastOnline = searchParams.has("showLastOnline");

        const livePreviewUrl = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${twitchUsername}-320x180.jpg`;

        const response = await fetch(livePreviewUrl, { redirect: "manual" });
        const isLive = response.ok;

        // Build the offline text, optionally with "last online" info
        let notLiveText = searchParams.get("notLiveText") || "not live";

        if (showLastOnline) {
          const kvKey = `live_lastOnline_${twitchUsername}`;

          if (isLive) {
            // Store current timestamp as last online time
            await environment.MYOSHI_CO_BAYLA_KV.put(
              kvKey,
              Date.now().toString(),
            );
          } else {
            const lastOnline = await environment.MYOSHI_CO_BAYLA_KV.get(kvKey);

            if (lastOnline) {
              notLiveText += ` (${formatRelativeTime(parseInt(lastOnline))})`;
            }
          }
        }

        let svg;

        if (svgOnline && svgOffline) {
          svg = isLive ? svgOnline : svgOffline;
        } else {
          const text = isLive ? isLiveText : notLiveText;
          const color = isLive ? isLiveColor : notLiveColor;

          svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <rect width="${width}" height="${height}" fill="${fillColor}"/>
          <text x="0" y="15" fill="${color}" font-family="monospace" stroke="${strokeColor}" stroke-width="${strokeWidth}">${text}</text>
        </svg>`;
        }

        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
            "Access-Control-Allow-Origin": "*",
          },
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
    console.log("Scheduled event triggered!");
    await checkAndSendNotifications(environment);
  },
};
