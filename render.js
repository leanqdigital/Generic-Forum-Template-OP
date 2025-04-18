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
