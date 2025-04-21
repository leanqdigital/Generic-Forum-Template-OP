let pendingFile = null;
let pendingFileType = "File";

const acceptMap = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
  file: "*/*",
};

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
