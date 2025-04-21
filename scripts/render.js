function mapItem(raw, depth = 0) {
  const childrenRaw = safeArray(raw.ForumComments);
  const createdAt = parseDate(raw.post_published_date);

  // find any upvote record by this user
  const postUpvotes = safeArray(raw.Member_Post_Upvotes_Data);
  const commentUpvotes = safeArray(raw.Member_Comment_Upvotes_Data);
  const userUpvote =
    depth === 0
      ? postUpvotes.find((u) => u.member_post_upvote_id === GLOBAL_AUTHOR_ID)
      : commentUpvotes.find(
          (u) => u.member_comment_upvote_id === GLOBAL_AUTHOR_ID
        );

  // make sure Contacts_Data is always an array
  const contacts = safeArray(raw.Contacts_Data);
  const hasBookmarked =
    depth === 0 && contacts.some((c) => c.contact_id === GLOBAL_AUTHOR_ID);
  const bookmarkRecordId =
    depth === 0
      ? contacts.find((c) => c.contact_id === GLOBAL_AUTHOR_ID)?.id || null
      : null;

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
    upvotes: postUpvotes.length + commentUpvotes.length,
    hasUpvoted: Boolean(userUpvote),
    voteRecordId: userUpvote?.id || null,
    hasBookmarked,
    bookmarkRecordId,
    children: depth < 2 ? childrenRaw.map((c) => mapItem(c, depth + 1)) : [],
    isCollapsed: true,
    forumPostId: depth === 0 ? raw.id : raw.forum_post_id,
    isFeatured: raw.featured_post === true,
    fileType: raw.file_type || 'None',
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
  initPlyr();
}

function initPlyr() {
  if (window.Plyr) {
    Plyr.setup('.js-player');
  } else {
    console.error("Plyr not loaded");
  }
}