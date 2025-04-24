(function () {
  const bell = document.querySelector(".notificationWrapperToggler");
  const wrapper = document.querySelector(".notificationsWrapper");
  let socket, backoff, keepAliveTimer;

  bell.addEventListener("click", () => {
    wrapper.classList.toggle("hidden");
    wrapper.classList.toggle("flex");
  });

  function renderNotification(data) {
    const isRead =
      Array.isArray(data.Read_Contacts) &&
      data.Read_Contacts.some((rc) => rc.id === GLOBAL_AUTHOR_ID);

    const item = document.createElement("div");
    item.className =
      "notification-item mb-2 px-4 py-2 shadow-sm cursor-pointer flex items-start justify-between w-full " +
      (isRead ? "read" : "unread");

    if (isRead) {
      const rc = data.Read_Contacts.find((rc) => rc.id === GLOBAL_AUTHOR_ID);
      item.dataset.readRecordId = rc.id;
    }

    if (renderedNotificationIds.has(data.ID)) return;
    renderedNotificationIds.add(data.ID);

    const textsWrapper = document.createElement("div");
    textsWrapper.className = "flex flex-col";

    const title = document.createElement("div");
    title.className = "text-[14px]";
    title.textContent = data.Title;

    const content = document.createElement("div");
    content.className = "text-[12px]";
    content.textContent = data.Content;

    const timestamp = document.createElement("div");
    timestamp.textContent = timeAgo(parseDate(data.Date_Added));
    timestamp.className = "text-xs text-gray-500";

    textsWrapper.append(title, content);
    item.append(textsWrapper, timestamp);

    item.addEventListener("click", async () => {
      const payload = {
        read_announcement_id: data.ID,
        read_contact_id: GLOBAL_AUTHOR_ID,
      };
      if (!item.classList.contains("read")) {
        try {
          await fetchGraphQL(MARK_NOTIFICATION_READ, { payload });
          item.classList.replace("unread", "read");
        } catch (err) {
          console.error("Mark read failed", err);
        }
      }
    });

    document.getElementById("output").prepend(item);
    updateBellIndicator();
  }

  function sendSafe(payload) {
    const msg = JSON.stringify(payload);
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(msg);
    } else {
      socket.addEventListener("open", () => socket.send(msg), { once: true });
    }
  }

  function connectNotifications() {
    socket = new WebSocket(WS_ENDPOINT, PROTOCOL);
    socket.addEventListener("open", () => {
      backoff = 1000;
      sendSafe({ type: "CONNECTION_INIT" });
      keepAliveTimer = setInterval(
        () => sendSafe({ type: "KEEP_ALIVE" }),
        KEEPALIVE_MS
      );
    });
    socket.addEventListener("message", ({ data }) => {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        return;
      }
      if (msg.type === "CONNECTION_ACK") {
        sendSafe({
          id: ANN_ID,
          type: "GQL_START",
          payload: {
            query: NOTIFICATIONS_QUERY,
            variables: { author_id: GLOBAL_AUTHOR_ID },
          },
        });
      } else if (
        msg.type === "GQL_DATA" &&
        msg.id === ANN_ID &&
        msg.payload?.data
      ) {
        (msg.payload.data.subscribeToAnnouncements || []).forEach(
          renderNotification
        );
      }
    });
    socket.addEventListener("close", () => {
      clearInterval(keepAliveTimer);
      setTimeout(connectNotifications, backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF);
    });
  }

  connectNotifications();
})();

document.getElementById("markAllAsRead").addEventListener("click", async () => {
  const unreadItems = document.querySelectorAll(".notification-item.unread");

  for (const item of unreadItems) {
    const id = item.dataset.readRecordId || GLOBAL_AUTHOR_ID;
    const payload = {
      read_announcement_id: item.dataset.announcementId,
      read_contact_id: GLOBAL_AUTHOR_ID,
    };
    try {
      await fetchGraphQL(MARK_NOTIFICATION_READ, { payload });
      item.classList.replace("unread", "read");
      updateBellIndicator();
    } catch (err) {
      console.error("Mark all read failed", err);
    }
  }
});

function updateBellIndicator() {
  const unreadCount = document.querySelectorAll(
    ".notification-item.unread"
  ).length;
  const bell = document.querySelector(".notificationWrapperToggler");

  bell.classList.toggle("bell-indicator", unreadCount > 0);
}
