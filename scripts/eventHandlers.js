$(document).on("click", ".btn-comment", function () {
  const uid = $(this).data("uid");
  const container = $(this).closest(".item");
  const existing = container.find(".comment-form");
  if (existing.length) {
    existing.remove();
    return;
  }

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
  container.find(".children").addClass("visible");
  tribute.attach(form.find(".editor")[0]);
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
    finalPayload.file_type =
      pendingFileType.charAt(0).toUpperCase() +
      pendingFileType.slice(1).toLowerCase();
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

$(document).on("click", ".btn-submit-comment", async function () {
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
    Comment_or_Reply_Mentions_Data: [],
  };

  editor.find("span.mention").each(function () {
    payload.Comment_or_Reply_Mentions_Data.push({
      comment_or_reply_mention_id: $(this).data("mention-id"),
    });
  });

  let finalPayload = { ...payload };

  if (pendingFile) {
    const fileFields = [{ fieldName: "file", file: pendingFile }];
    const toSubmitFields = {};
    await processFileFields(toSubmitFields, fileFields, awsParam, awsParamUrl);
    let fileData =
      typeof toSubmitFields.file === "string"
        ? JSON.parse(toSubmitFields.file)
        : toSubmitFields.file;
    fileData.name = fileData.name || pendingFile.name;
    fileData.size = fileData.size || pendingFile.size;
    fileData.type = fileData.type || pendingFile.type;
    finalPayload.file = JSON.stringify(fileData);
    finalPayload.file_type =
      pendingFileType.charAt(0).toUpperCase() +
      pendingFileType.slice(1).toLowerCase();
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
