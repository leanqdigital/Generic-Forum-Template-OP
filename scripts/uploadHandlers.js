let pendingFile = null;
let fileTypeCheck = "";
$(document).on("change", ".file-input, #file-input", function (e) {
  pendingFile = e.target.files[0] || null;
  if (pendingFile) {
    const type = pendingFile.type;
    if (type.startsWith("audio/")) {
      fileTypeCheck = "Audio";
    } else if (type.startsWith("video/")) {
      fileTypeCheck = "Video";
    } else if (type.startsWith("image/")) {
      fileTypeCheck = "Image";
    }else{
      fileTypeCheck = "File";
    }
  }
  // console.log("File selected:", pendingFile);
  // console.log("File type:", fileTypeCheck);
});
