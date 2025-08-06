export default {
  async fetch(request, env, ctx) {
    const now = new Date().toISOString();

    if (request.method === "POST") {
      // Update presence time
      await env.PRESENCE.put("lastSeen", now);
      return new Response("Presence updated", { status: 200 });
    }

    if (request.method === "GET") {
      // Fetch last seen
      const lastSeen = await env.PRESENCE.get("lastSeen");
      return new Response(
        JSON.stringify({ lastSeen: lastSeen || "null" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Method not allowed", { status: 405 });
  },
};
