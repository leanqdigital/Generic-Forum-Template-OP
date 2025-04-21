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
  mutation createForumPost($payload: ForumPostCreateInput = null) {
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
  mutation createForumComment($payload: ForumCommentCreateInput = null) {
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
  subscription subscribeToForumPosts {
    subscribeToForumPosts(
      query: [{ where: { post_status: "Published - Not flagged" } }]
      orderBy: [{ path: ["post_published_date"], type: desc }]
    ) {
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

let CREATE_POST_VOTE_MUTATION = `
  mutation createMemberPostUpvotesPostUpvotes(
    $payload: MemberPostUpvotesPostUpvotesCreateInput = null
  ) {
    createMemberPostUpvotesPostUpvotes(payload: $payload) {
      id
      member_post_upvote_id
      post_upvote_id
    }
  }
`;

let DELETE_POST_VOTE_MUTATION = `
  mutation deleteMemberPostUpvotesPostUpvotes(
    $id: EduflowproMemberPostUpvotesPostUpvotesID
  ) {
    deleteMemberPostUpvotesPostUpvotes(
      query: [{ where: { id: $id } }]
    ) {
      id
    }
  }
`;

let CREATE_POST_BOOKMARK_MUTATION = `
  mutation createOSavedPostContact(
    $payload: OSavedPostContactCreateInput = null
  ) {
    createOSavedPostContact(payload: $payload) {
      id
      saved_post_id
      contact_id
    }
  }
`;

let DELETE_POST_BOOKMARK_MUTATION = `
  mutation deleteOSavedPostContact(
    $id: EduflowproOSavedPostContactID
  ) {
    deleteOSavedPostContact(query: [{ where: { id: $id } }]) {
      id
    }
  }
`;

let CREATE_COMMENT_VOTE_MUTATION = `
  mutation createMemberCommentUpvotesForumCommentUpvotes(
    $payload: MemberCommentUpvotesForumCommentUpvotesCreateInput = null
  ) {
    createMemberCommentUpvotesForumCommentUpvotes(
      payload: $payload
    ) {
      id
      forum_comment_upvote_id
      member_comment_upvote_id
    }
  }
`;

let DELETE_COMMENT_VOTE_MUTATION = `
  mutation deleteMemberCommentUpvotesForumCommentUpvotes(
    $id: EduflowproMemberCommentUpvotesForumCommentUpvotesID
  ) {
    deleteMemberCommentUpvotesForumCommentUpvotes(
      query: [{ where: { id: $id } }]
    ) {
      id
    }
  }
`;
