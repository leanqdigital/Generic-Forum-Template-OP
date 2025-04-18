function connect() {
  socket = new WebSocket(WS_ENDPOINT, PROTOCOL);
  socket.addEventListener("open", () => {
    backoff = 1000;
    socket.send(JSON.stringify({ type: "CONNECTION_INIT" }));
    keepAliveTimer = setInterval(() => {
      socket.send(JSON.stringify({ type: "KEEP_ALIVE" }));
    }, KEEPALIVE_MS);
  });
  socket.addEventListener("message", ({ data }) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      console.error("Invalid JSON", data);
      return;
    }
    if (msg.type === "CONNECTION_ACK") {
      socket.send(
        JSON.stringify({
          id: SUB_ID,
          type: "GQL_START",
          payload: { query: GQL_QUERY },
        })
      );
    } else if (
      msg.type === "GQL_DATA" &&
      msg.id === SUB_ID &&
      msg.payload?.data
    ) {
      const raws = msg.payload.data.subscribeToForumPosts ?? [];
      postsStore = raws.map((r) => mapItem(r, 0));
      renderAll();
    } else if (msg.type === "GQL_ERROR") {
      console.error("Subscription error", msg.payload);
    } else if (msg.type === "GQL_COMPLETE") {
      console.warn("Subscription complete");
    }
  });
  socket.addEventListener("error", (e) => console.error("WebSocket error", e));
  socket.addEventListener("close", () => {
    clearInterval(keepAliveTimer);
    setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, MAX_BACKOFF);
  });
}
