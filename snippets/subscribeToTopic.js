/**
 * Subscribes a user to a specific forum topic via GraphQL.
 * @param {Request} request - The incoming web request.
 * @param {Object} environment - The environment bindings (for API keys).
 * @returns {Promise<Response>}
 */
export default async function subscribeToTopic(request, environment) {
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topicId");

  // 1. Validation
  if (!topicId) {
    return new Response(JSON.stringify({ error: "topicId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 2. Auth Retrieval
    const bearer = await environment.MYOSHI_CO_BAYLA_API_KEY.get();

    // 3. GraphQL Request
    const gqlResponse = await fetch("https://api.myoshi.co/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({
        operationName: "SubscribeForumTopic",
        variables: { topicId },
        extensions: {
          clientLibrary: { name: "@apollo/client", version: "4.1.2" },
        },
        query: `
          mutation SubscribeForumTopic($topicId: ID!) {
            forums {
              subscribeTopic(topic_id: $topicId) {
                success
                errors {
                  code
                  message
                  __typename
                }
                topic {
                  id
                  is_subscribed
                  __typename
                }
                __typename
              }
              __typename
            }
          }
        `,
      }),
    });

    const data = await gqlResponse.json();

    // 4. Return Data
    return new Response(JSON.stringify(data), {
      status: gqlResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Basic error handling for network/runtime failures
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
