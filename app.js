
function fetchGraphQL(query, variables = {}) {
  return fetch(HTTP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json());
}

function mapItem(raw, depth = 0) {
  const childrenRaw = safeArray(raw.ForumComments);
  const createdAt = parseDate(raw.created_at);

  return {
    id: raw.id,
    uid: raw.unique_id,
    authorId: raw.author_id,
    canDelete: raw.author_id === GLOBAL_AUTHOR_ID,
    depth,
    authorName: raw.Author?.display_name || "Anonymous",
    authorImage: raw.Author?.profile_image || DEFAULT_AVATAR,
    timeAgo: createdAt ? timeAgo(createdAt) : "",
    content: raw.post_copy ?? raw.comment ?? "",
    upvotes:
      safeArray(raw.Member_Post_Upvotes_Data).length +
      safeArray(raw.Member_Comment_Upvotes_Data).length,
    children: depth < 2 ? childrenRaw.map((c) => mapItem(c, depth + 1)) : [],
    isCollapsed: true,
    forumPostId: depth === 0 ? raw.id : raw.forum_post_id,
  };
}

function findNode(arr, uid) {
  for (const x of arr) {
    if (x.uid === uid) return x;
    const found = findNode(x.children, uid);
    if (found) return found;
  }
  return null;
}

const tmpl = $.templates("#tmpl-item");

function renderAll() {
  $("#forum-root").html(tmpl.render(postsStore));
}

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

$(document).ready(() => {
  tribute.attach(document.getElementById("post-editor"));
  fetchGraphQL(FETCH_CONTACTS_QUERY).then((res) => {
    const contacts = res.data.calcContacts;
    tribute.collection[0].values = contacts.map((c) => ({
      key: c.Display_Name,
      value: c.Contact_ID,
      image: c.Profile_Image,
    }));
  });

  connect();
});

let pendingFile = null;
let pendingFileType = "";

const acceptMap = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
  file: "*/*",
};

function removeNode(arr, uid) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].uid === uid) {
      arr.splice(i, 1);
      return true;
    }
    if (removeNode(arr[i].children, uid)) return true;
  }
  return false;
}


