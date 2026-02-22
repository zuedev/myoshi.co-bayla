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
    if (request.url.endsWith("/counter.svg")) {
      // Increment visitor count in KV storage
      const visitorCount = await environment.MYOSHI_CO_BAYLA_KV.get("count");
      const newCount = visitorCount ? parseInt(visitorCount) + 1 : 1;
      await environment.MYOSHI_CO_BAYLA_KV.put("count", newCount.toString());

      // Generate and return the visitor counter image
      const imageBlob = await generateVisitorCounterImage(newCount);
      return new Response(imageBlob, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    // redirect all other requests to https://myoshi.co/bayla
    return Response.redirect("https://myoshi.co/bayla", 302);
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
  },
};
