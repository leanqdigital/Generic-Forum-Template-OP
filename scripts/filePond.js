FilePond.registerPlugin(
  FilePondPluginFileValidateType,
  FilePondPluginImagePreview,
  FilePondPluginMediaPreview,
  FilePondPluginFilePoster
);

function initFilePond() {
  console.log("Initialized");
  document.querySelectorAll(".upload-section").forEach((section) => {
    const inputElement = section.querySelector(".file-input");
    const recordBtn = section.querySelector(".recordBtn");
    const canvas = section.querySelector(".waveform");
    const ctx = canvas.getContext("2d");

    const pond = FilePond.create(inputElement, {
      allowImagePreview: true,
      allowAudioPreview: true,
      allowVideoPreview: true,
      allowFilePoster: true,
      allowMultiple: false,
      acceptedFileTypes: [
        "image/*",
        "audio/*",
        "video/*",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      labelIdle: `<span class="custom-upload-label" style="background:transparent; color:white;">
                📁 <strong>Drag & drop your files</strong> or <span style="color:var(--accent)">Browse</span>
            </span>`,
    });

    const recorder = new MicRecorder({ bitRate: 128 });

    let isRecording = false;
    let audioContext, analyser, dataArray, source, animationId, mediaStream;

    const drawWaveform = () => {
      if (!analyser) return;

      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#007bff";
      ctx.beginPath();

      const sliceWidth = canvas.width / analyser.frequencyBinCount;
      let x = 0;

      for (let i = 0; i < analyser.frequencyBinCount; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      animationId = requestAnimationFrame(drawWaveform);
    };

    if (recordBtn) {
      recordBtn.addEventListener("click", () => {
        if (!isRecording) {
          pond.setOptions({
            allowBrowse: false,
            allowDrop: false,
            allowPaste: false
          });
          inputElement.disabled = true;
          canvas.style.display = "block";
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
              mediaStream = stream;
              audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
              analyser = audioContext.createAnalyser();
              source = audioContext.createMediaStreamSource(stream);
              source.connect(analyser);
              analyser.fftSize = 2048;
              dataArray = new Uint8Array(analyser.frequencyBinCount);

              drawWaveform();

              recorder.start().then(() => {
                isRecording = true;
                recordBtn.textContent = "⏹ Stop Recording";
              });
            })
            .catch((e) => console.error(e));
        } else {
          cancelAnimationFrame(animationId);
          canvas.style.display = "none";
          mediaStream?.getTracks().forEach((track) => track.stop());
          
          recorder
            .stop()
            .getMp3()
            .then(([buffer, blob]) => {
              isRecording = false;
              recordBtn.textContent = "🎙 Start Recording";

              const file = new File(buffer, "recorded-audio.mp3", {
                type: blob.type,
                lastModified: Date.now(),
              });
              // ✅ Re-enable FilePond interaction
              pond.setOptions({
                allowBrowse: true,
                allowDrop: true,
                allowPaste: true
              });
              inputElement.disabled = false;
              // Add to FilePond
              pond.addFile(file).then(() => {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                inputElement.files = dataTransfer.files;
                pendingFile = file;
                if (file.type.startsWith("audio/")) {
                  fileTypeCheck = "Audio";
                } else if (file.type.startsWith("video/")) {
                  fileTypeCheck = "Video";
                } else if (file.type.startsWith("image/")) {
                  fileTypeCheck = "Image";
                } else {
                  fileTypeCheck = "File";
                }
                const nativeEvent = new Event("change", { bubbles: true });
                inputElement.dispatchEvent(nativeEvent);
                $(inputElement).trigger("change");
              });
            })
            .catch((e) => console.error(e));
        }
      });
    }
  });
}
window.addEventListener("DOMContentLoaded", () => {
  initFilePond();
});
