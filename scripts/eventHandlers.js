$(document).on("click", ".btn-comment", function (e) {
  e.stopPropagation();
  const uid = $(this).data("uid");
  const container = $(this).closest(".item");
  const existing = container.find(".comment-form");

  if (existing.length) {
    existing.remove();
    return;
  }

  $(".comment-form").remove();

  const $form = $(`
    <div class="comment-form my-2">
      <div class="editor min-h-[80px] resize-y p-2 rounded" contenteditable="true" data-placeholder="Write a reply..."></div>
      <div class="upload-section w-full mt-2">
        <button id="recordBtn" class="recordBtn">🎙 Start Recording</button>
        <button class="btn-submit-comment" data-uid="${uid}">Post</button>
        <input type="file" id="file-input" class="file-input" style="display: none;"
          accept="image/*,audio/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
        <canvas class="canvasWaveform waveform w-full mt-2" id="waveform" width="450" height="100"></canvas>
      </div>
    </div>
  `);
  container.append($form);
  const inserted = container.find(".comment-form");
  if (inserted.length) {
    const editorEl = inserted.find(".editor")[0];
    if (editorEl) {
      tribute.attach(editorEl);
    }
    container.find(".children").addClass("visible");
    initFilePond();
  }
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
        applyFilterAndRender();
        return;
      }
      find(x.children);
    }
  })(postsStore);
});

$(document).on("click", ".btn-delete", function () {
  const uid = $(this).data("uid");
  const $item = $(this).closest(".item");
  $item.addClass("state-disabled");

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
      $item.removeClass("state-disabled");
    });
});

$(document).on("click", "#submit-post", async function () {
  requestAnimationFrame(() => {
    Plyr.setup('.js-player');
  });
  const $btn = $(this);
  const formWrapper = document.querySelector(".post-form ");
  const editor = $("#post-editor");
  const htmlContent = editor.html().trim();
  if (!htmlContent && !pendingFile) return;

  $btn.prop("disabled", true);
  $("#upload-options").prop("disabled", true);
  formWrapper.classList.add("state-disabled");

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
    finalPayload.file_type = fileTypeCheck;
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
    document.querySelector(".filepond--action-remove-item").click();
    $("#upload-options").prop("disabled", false);
    formWrapper.classList.remove("state-disabled");
  }
});
$(document).on("click", ".btn-submit-comment", async function () {
  const $btn = $(this);
  const $form = $btn.closest(".comment-form");
  const editor = $form.find(".editor");
  const htmlContent = editor.html().trim();
  if (!htmlContent && !pendingFile) return;

  $btn.prop("disabled", true);
  $form.addClass("state-disabled");
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
    // finalPayload.file_type = 
    //   pendingFileType.charAt(0).toUpperCase() +
    //   pendingFileType.slice(1).toLowerCase();
    finalPayload.file_type = fileTypeCheck;

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
    $form.remove("state-disabled");
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

// HANDLE LIKE / UNLIKE
$(document).on("click", ".btn-like", async function () {
  const uid = $(this).data("uid");
  const node = findNode(postsStore, uid);
  const isPost = node.depth === 0;
  $(this).addClass("state-disabled");

  try {
    if (node.hasUpvoted) {
      await fetchGraphQL(
        isPost ? DELETE_POST_VOTE_MUTATION : DELETE_COMMENT_VOTE_MUTATION,
        { id: node.voteRecordId }
      );
      node.upvotes--;
      node.hasUpvoted = false;
      node.voteRecordId = null;
    } else {
      const payload = isPost
        ? { post_upvote_id: node.id, member_post_upvote_id: GLOBAL_AUTHOR_ID }
        : {
            forum_comment_upvote_id: node.id,
            member_comment_upvote_id: GLOBAL_AUTHOR_ID,
          };
      const mutation = isPost
        ? CREATE_POST_VOTE_MUTATION
        : CREATE_COMMENT_VOTE_MUTATION;
      const res = await fetchGraphQL(mutation, { payload });
      const newId =
        res.data.createMemberPostUpvotesPostUpvotes?.id ||
        res.data.createMemberCommentUpvotesForumCommentUpvotes?.id;
      node.upvotes++;
      node.hasUpvoted = true;
      node.voteRecordId = newId;
    }
  } catch (err) {
    console.log("error is", err);
  } finally {
    $(this).removeClass("state-disabled");
  }
  applyFilterAndRender();
});

// HANDLE BOOKMARK / UNBOOKMARK (posts only)
$(document).on("click", ".btn-bookmark", async function () {
  const uid = $(this).data("uid");
  const node = findNode(postsStore, uid);
  $(this).addClass("state-disabled");

  try {
    if (node.hasBookmarked) {
      await fetchGraphQL(DELETE_POST_BOOKMARK_MUTATION, {
        id: node.bookmarkRecordId,
      });
      node.hasBookmarked = false;
      node.bookmarkRecordId = null;
    } else {
      const payload = { contact_id: GLOBAL_AUTHOR_ID, saved_post_id: node.id };
      const res = await fetchGraphQL(CREATE_POST_BOOKMARK_MUTATION, {
        payload,
      });
      node.hasBookmarked = true;
      node.bookmarkRecordId = res.data.createOSavedPostContact.id;
    }
  } catch (err) {
    console.log("error is", err);
  } finally {
    $(this).removeClass("state-disabled");
  }

  applyFilterAndRender();
});

function applyFilterAndRender() {
  requestAnimationFrame(() => {
    Plyr.setup('.js-player');
  });
  let items = postsStore;
  switch (currentFilter) {
    case "Featured":
      items = items.filter((p) => p.isFeatured);
      break;
    case "My Posts":
      items = items.filter((p) => p.authorId === GLOBAL_AUTHOR_ID);
      break;
    case "Saved Posts":
      items = items.filter((p) => p.hasBookmarked);
      break;
  }
  if (currentFileFilter !== "All") {
    items = items.filter((p) => p.fileType === currentFileFilter);
  }
  if (currentSearchTerm) {
    const q = currentSearchTerm.toLowerCase();
    items = items.filter(
      (p) =>
        p.authorName.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
    );
  }
  $("#forum-root").html(tmpl.render(items));
}

$(document).on("click", ".filter-btn", function () {
  currentFilter = $(this).data("filter");
  $(".filter-btn").removeClass("active");
  $(this).addClass("active");
  applyFilterAndRender();
});

// toggle menu
$("#file-filter-btn").on("click", function (e) {
  e.stopPropagation();
  $(".file-filter").toggleClass("open");
});

// pick a file type
$(document).on("click", "#file-filter-menu li", function () {
  const type = $(this).data("type");
  currentFileFilter = type;

  // update button label & active menu item
  $("#file-filter-btn").text(type + " ▾");
  $("#file-filter-menu li").removeClass("active");
  $(this).addClass("active");

  // close dropdown and re-render
  $(".file-filter").removeClass("open");
  applyFilterAndRender();
});

// click outside to close
$(document).on("click", function (e) {
  if (!$(e.target).closest(".file-filter").length) {
    $(".file-filter").removeClass("open");
  }
});

searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const q = e.target.value.trim();
    currentSearchTerm = q;
    if (q) {
      clearIcon.classList.remove("hidden");
      searchIcon.classList.add("hidden");
    } else {
      clearIcon.classList.add("hidden");
      searchIcon.classList.remove("hidden");
    }
    applyFilterAndRender();
    removeHighlights(document.getElementById("forum-root"));
    if (q) highlightMatches(document.getElementById("forum-root"), q);
  }, 300);
});

clearIcon.addEventListener("click", () => {
  searchInput.value = "";
  clearIcon.classList.add("hidden");
  searchIcon.classList.remove("hidden");
  currentSearchTerm = "";
  applyFilterAndRender();
  removeHighlights(document.getElementById("forum-root"));
});

function highlightMatches(el, query) {
  const terms = query.split(/\s+/).filter(Boolean);
  const regex = new RegExp(
    "(" +
      terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
      ")",
    "gi"
  );
  traverse(el);

  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.nodeValue;
      if (regex.test(txt)) {
        const span = document.createElement("span");
        span.innerHTML = txt.replace(regex, "<mark>$1</mark>");
        node.replaceWith(span);
      }
    } else {
      node.childNodes.forEach(traverse);
    }
  }
}

function removeHighlights(el) {
  el.querySelectorAll("mark").forEach((m) => {
    m.replaceWith(document.createTextNode(m.textContent));
  });
}
