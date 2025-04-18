const awsParam = "5d26643c9bf758f00272ffed8558a0d9";
const awsParamUrl = "https://learn.eduflowpro.com/s/aws";
const API_KEY = "uXVeRpnkFYHhT8SQK6JXo";
const WS_ENDPOINT = `wss://eduflowpro.vitalstats.app/api/v1/graphql?apiKey=${API_KEY}`;
const HTTP_ENDPOINT = "https://eduflowpro.vitalstats.app/api/v1/graphql";
const PROTOCOL = "vitalstats";
const SUB_ID = "forum-subscription";
const KEEPALIVE_MS = 80000;
const MAX_BACKOFF = 30000;
const GLOBAL_AUTHOR_ID = 62;
const DEFAULT_AVATAR =
  "https://files.ontraport.com/media/b0456fe87439430680b173369cc54cea.php03bzcx?Expires=4895186056&Signature=fw-mkSjms67rj5eIsiDF9QfHb4EAe29jfz~yn3XT0--8jLdK4OGkxWBZR9YHSh26ZAp5EHj~6g5CUUncgjztHHKU9c9ymvZYfSbPO9JGht~ZJnr2Gwmp6vsvIpYvE1pEywTeoigeyClFm1dHrS7VakQk9uYac4Sw0suU4MpRGYQPFB6w3HUw-eO5TvaOLabtuSlgdyGRie6Ve0R7kzU76uXDvlhhWGMZ7alNCTdS7txSgUOT8oL9pJP832UsasK4~M~Na0ku1oY-8a7GcvvVv6j7yE0V0COB9OP0FbC8z7eSdZ8r7avFK~f9Wl0SEfS6MkPQR2YwWjr55bbJJhZnZA__&Key-Pair-Id=APKAJVAAMVW6XQYWSTNA";

let FETCH_CONTACTS_QUERY = `
  query calcContacts {
    calcContacts {
      Contact_ID: field(arg: ["id"])
      Display_Name: field(arg: ["display_name"])
      Profile_Image: field(arg: ["profile_image"])
    }
  }
`;

let CREATE_POST_MUTATION = `
    mutation createForumPost($payload: ForumPostCreateInput = null)   
            {
                createForumPost(payload: $payload) {
                    author_id
                    file_type
                    file_content
                    post_copy
                    post_status
                    post_published_date 
                    Mentioned_Users_Data {
                      mentioned_user_id
                    }
            }
    }
`;

let CREATE_COMMENT_MUTATION = `
mutation createForumComment(
  $payload: ForumCommentCreateInput = null
) {
  createForumComment(payload: $payload) {
    author_id
    comment
    created_at
    reply_to_comment_id
    forum_post_id
    file
    file_type
    Comment_or_Reply_Mentions_Data {
      comment_or_reply_mention_id
    }
  }
}
`;

let DELETE_FORUM_POST_MUTATION = `
  mutation deleteForumPost($id: EduflowproForumPostID) {
    deleteForumPost(query: [{ where: { id: $id } }]) {
      id
    }
  }
`;

let DELETE_FORUM_COMMENT_MUTATION = `
mutation deleteForumComment($id: EduflowproForumCommentID) {
  deleteForumComment(query: [{ where: { id: $id } }]) {
    id
  }
}
`;

let GQL_QUERY = `
subscription subscribeToForumPosts{
   subscribeToForumPosts(
    query: [
      { where: { post_status: "Published - Not flagged" } }
    ]
    orderBy: [{ path: ["post_published_date"], type: asc }]
  ){
    author_id
    Author {
      display_name
      profile_image
    }
    created_at
    post_published_date 
    disable_new_comments
    featured_post
    file_content
    file_type
    id
    post_copy
    post_status
    unique_id
    Contacts_Data {
      id
      contact_id
      saved_post_id
    }
    Member_Post_Upvotes_Data {
      id
      post_upvote_id
      member_post_upvote_id
    }
    ForumComments {
      id
      unique_id
      author_id
      Author {
        display_name
        profile_image
      }
      comment
      file_type
      file
      forum_post_id
      reply_to_comment_id
      Member_Comment_Upvotes_Data {
        id
        forum_comment_upvote_id
        member_comment_upvote_id
      }
      ForumComments {
        id
        unique_id
        author_id
        Author {
          display_name
          profile_image
        }
        comment
        file_type
        file
        forum_post_id
        reply_to_comment_id
        Member_Comment_Upvotes_Data {
          id
          forum_comment_upvote_id
          member_comment_upvote_id
        }
      }
    }
  }
}
`;

let socket;
let backoff = 1000;
let keepAliveTimer;
let postsStore = [];

const tribute = new Tribute({
  collection: [
    {
      trigger: "@",
      menuItemTemplate: (item) =>
        `<div class="mention-item">
         <img src="${item.original.image}" width="24" height="24"/>
         <span>${item.string}</span>
       </div>`,
      selectTemplate: (item) =>
        `<span contenteditable="false" class="mention" data-mention-id="${item.original.value}">
         @${item.original.key}
       </span>&nbsp;`,
      values: [],
    },
  ],
});

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

function safeArray(x) {
  return Array.isArray(x) ? x : [];
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals = [
    { label: "y", seconds: 31536000 },
    { label: "mo", seconds: 2592000 },
    { label: "d", seconds: 86400 },
    { label: "h", seconds: 3600 },
    { label: "m", seconds: 60 },
    { label: "s", seconds: 1 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) return `${count}${interval.label} ago`;
  }
  return "just now";
}

function parseDate(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp === "number") {
    return new Date(timestamp * 1000);
  }
  return new Date(timestamp);
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

$(document).on("click", ".btn-comment", function () {
  const uid = $(this).data("uid");

  // 2) If that item already has a form, just remove it
  const container = $(this).closest(".item");
  const existing = container.find(".comment-form");
  if (existing.length) {
    existing.remove();
    return;
  }

  // 3) Otherwise remove any other open forms and inject a fresh one
  $(".comment-form").remove();
  const form = `
    <div class="comment-form">
      <div
        class="editor"
        contenteditable="true"
        data-placeholder="Write a reply..."
      ></div>
      <button type="button" class="upload-options">
        Upload
      </button>
      <div class="upload-menu" style="display:none">
        <button class="upload-choice" data-type="image">
          Image
        </button>
        <button class="upload-choice" data-type="video">
          Video
        </button>
        <button class="upload-choice" data-type="audio">
          Audio
        </button>
        <button class="upload-choice" data-type="file">
          File
        </button>
      </div>
      <input type="file" class="file-input" style="display:none" />
      <button class="btn-submit-comment" data-uid="${uid}">
        Submit
      </button>
    </div>
  `;
  container.append(form);
  tribute.attach(form.find(".editor")[0]);
  container.find(".children").addClass("visible");
});

// Toggle any upload‑menu
$(document).on("click", ".upload-options", function (e) {
  e.stopPropagation();
  $(this).siblings(".upload-menu").toggle();
});

$(document).on("click", ".upload-choice", function (e) {
  e.stopPropagation();
  pendingFileType = $(this).data("type");
  const $commentForm = $(this).closest(".comment-form");
  const $input = $commentForm.length
    ? $commentForm.find(".file-input")
    : $("#file-input");
  $input.attr("accept", acceptMap[pendingFileType]).click();
  $(this).closest(".upload-menu").hide();
});

$(document).on("click", ".file-input", function (e) {
  e.stopPropagation();
});

$(document).on("change", ".file-input, #file-input", function (e) {
  pendingFile = e.target.files[0] || null;
});

$(document).on("click", function (e) {
  if (!$(e.target).closest(".comment-form, #post-creation-form").length) {
    $(".comment-form").remove();
    $("#upload-menu").hide();
  }
});

$(document).on("click", ".ribbon", function () {
  const uid = $(this).data("uid");
  (function find(arr) {
    for (const x of arr) {
      if (x.uid === uid) {
        x.isCollapsed = !x.isCollapsed;
        renderAll();
        return;
      }
      find(x.children);
    }
  })(postsStore);
});

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

$(document).on("click", ".btn-delete", function () {
  const uid = $(this).data("uid");
  const $item = $(this).closest(".item");
  $item
    .css("opacity", "0.5")
    .find("button, .editor, .ribbon")
    .prop("disabled", true);

  let node;
  (function find(arr) {
    for (const x of arr) {
      if (x.uid === uid) {
        node = x;
        return;
      }
      find(x.children);
      if (node) return;
    }
  })(postsStore);

  const mutation =
    node.depth === 0
      ? DELETE_FORUM_POST_MUTATION
      : DELETE_FORUM_COMMENT_MUTATION;
  const variables = { id: node.id };
  console.log(variables);

  fetchGraphQL(mutation, variables)
    .then(() => {
      // remove locally and re-render
    })
    .catch((err) => {
      console.error("Delete failed", err);
      $item
        .css("opacity", "")
        .find("button, .editor, .ribbon")
        .prop("disabled", false);
    });
});

$(document).on("click", "#submit-post", async function () {
  const $btn = $(this);
  const editor = $("#post-editor");
  const htmlContent = editor.html().trim();
  if (!htmlContent && !pendingFile) return;

  $btn.prop("disabled", true);
  $("#upload-options").prop("disabled", true);

  const payload = {
    author_id: GLOBAL_AUTHOR_ID,
    post_copy: htmlContent,
    post_status: "Published - Not flagged",
    post_published_date: Date.now(),
    Mentioned_Users_Data: [],
  };

  editor.find("span.mention").each(function () {
    payload.Mentioned_Users_Data.push({
      mentioned_user_id: $(this).data("mention-id"),
    });
  });

  let finalPayload = { ...payload };

  if (pendingFile) {
    const fileFields = [{ fieldName: "file_content", file: pendingFile }];
    const toSubmitFields = {};
    await processFileFields(toSubmitFields, fileFields, awsParam, awsParamUrl);
    let fileData =
      typeof toSubmitFields.file_content === "string"
        ? JSON.parse(toSubmitFields.file_content)
        : toSubmitFields.file_content;
    fileData.name = fileData.name || pendingFile.name;
    fileData.size = fileData.size || pendingFile.size;
    fileData.type = fileData.type || pendingFile.type;
    finalPayload.file_content = JSON.stringify(fileData);
    finalPayload.file_type = pendingFileType.charAt(0).toUpperCase() + pendingFileType.slice(1).toLowerCase();
  }

  try {
    await fetchGraphQL(CREATE_POST_MUTATION, { payload: finalPayload });
    editor.html("");
    pendingFile = null;
    pendingFileType = "";
    $("#file-input").val("");
  } catch (err) {
    console.error("Post failed", err);
  } finally {
    $btn.prop("disabled", false);
    $("#upload-options").prop("disabled", false);
  }
});

$(document).on("click", ".btn-submit-comment", async function() {
  const $btn = $(this);
  const $form = $btn.closest(".comment-form");
  const editor = $form.find(".editor");
  const htmlContent = editor.html().trim();
  if (!htmlContent && !pendingFile) return;

  $btn.prop("disabled", true);
  const uid = $btn.data("uid");
  const node = findNode(postsStore, uid);

  const payload = {
    forum_post_id: node.depth === 0 ? node.id : null,
    reply_to_comment_id: node.depth > 0 ? node.id : null,
    author_id: GLOBAL_AUTHOR_ID,
    comment: htmlContent,
    Comment_or_Reply_Mentions_Data: []
  };

  editor.find("span.mention").each(function() {
    payload.Comment_or_Reply_Mentions_Data.push({
      comment_or_reply_mention_id: $(this).data("mention-id")
    });
  });

  let finalPayload = { ...payload };

  if (pendingFile) {
    const fileFields = [{ fieldName: "file", file: pendingFile }];
    const toSubmitFields = {};
    await processFileFields(toSubmitFields, fileFields, awsParam, awsParamUrl);
    let fileData = typeof toSubmitFields.file === "string"
      ? JSON.parse(toSubmitFields.file)
      : toSubmitFields.file;
    fileData.name = fileData.name || pendingFile.name;
    fileData.size = fileData.size || pendingFile.size;
    fileData.type = fileData.type || pendingFile.type;
    finalPayload.file = JSON.stringify(fileData);
    finalPayload.file_type = pendingFileType.charAt(0).toUpperCase() + pendingFileType.slice(1).toLowerCase();
  }

  try {
    await fetchGraphQL(CREATE_COMMENT_MUTATION, { payload: finalPayload });
    pendingFile = null;
    pendingFileType = "";
    $form.remove();
    node.isCollapsed = false;
    $(`[data-uid="${uid}"]`).find(".children").addClass("visible");
  } catch (err) {
    console.error("Comment failed", err);
  } finally {
    $btn.prop("disabled", false);
  }
});
