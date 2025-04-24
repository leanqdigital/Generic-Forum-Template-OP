FilePond.registerPlugin(
  FilePondPluginFileValidateType,
  FilePondPluginImagePreview,
  FilePondPluginMediaPreview,
  FilePondPluginFilePoster
);

function initFilePond() {
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
      allowMediaPreview: true,
      acceptedFileTypes: [
        "image/*",
        "audio/*",
        "video/webm",
        "audio/webm",
        "video/*",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],

      labelIdle: `<span class="custom-upload-label" style="background:transparent; color:white;">
                📁 <strong>Drag & drop your files</strong> or <span style="color:var(--accent)">Browse</span>
            </span>`,
    });

    pond.on("addfile", (error, fileItem) => {
      if (error) return;
      const { file, container } = fileItem;
      const { type, name } = file;
      const isVideo = type.startsWith("video/");
      const isAudio = type.startsWith("audio/");
      if (!isVideo && !isAudio) return;

      // 1. Check iOS support
      const testEl = document.createElement(isVideo ? "video" : "audio");
      if (!testEl.canPlayType(type)) {
        const msg = document.createElement("p");
        msg.textContent = `${name} isn’t supported for in-browser preview on iOS.`;
        msg.style.color = "#c00";
        container.appendChild(msg);
        return;
      }

      // 2. Make sure the FilePond wrapper can show overflow
      container.style.overflow = "visible";

      // 3. Create media element
      const mediaEl = document.createElement(isVideo ? "video" : "audio");
      mediaEl.src = URL.createObjectURL(file);
      mediaEl.controls = true;
      mediaEl.preload = "metadata";
      mediaEl.classList.add("media-preview");

      if (isVideo) {
        // Inline playback attributes for iOS
        mediaEl.setAttribute("playsinline", "");
        mediaEl.setAttribute("webkit-playsinline", "");
        mediaEl.setAttribute("x5-playsinline", "");
      }

      // 4. Append and wait for metadata to load
      mediaEl.addEventListener("loadedmetadata", () => {
        // at this point duration is known, so the scrubber will render
      });

      container.appendChild(mediaEl);
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
        const isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent
        );

        if (!isRecording) {
          pond.setOptions({
            allowBrowse: false,
            allowDrop: false,
            allowPaste: false,
          });
          inputElement.disabled = true;
          canvas.style.display = "block";

          const audioConstraints = isSafari
            ? { audio: {} }
            : { audio: { sampleRate: 44100 } };

          navigator.mediaDevices
            .getUserMedia(audioConstraints)
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

              if (isSafari) {
                const recordedChunks = [];
                const safariRecorder = new MediaRecorder(stream);
                safariRecorder.ondataavailable = (event) => {
                  if (event.data.size > 0) recordedChunks.push(event.data);
                };
                safariRecorder.onstop = () => {
                  const blob = new Blob(recordedChunks, { type: "audio/mp3" });
                  const file = new File([blob], "recorded-audio.mp3", {
                    type: "audio/mp3",
                    lastModified: Date.now(),
                  });

                  canvas.style.display = "none";
                  mediaStream?.getTracks().forEach((track) => track.stop());
                  pond.setOptions({
                    allowBrowse: true,
                    allowDrop: true,
                    allowPaste: true,
                  });
                  inputElement.disabled = false;

                  pond.addFile(file).then(() => {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    inputElement.files = dataTransfer.files;
                    pendingFile = file;
                    fileTypeCheck = "Audio";

                    const nativeEvent = new Event("change", { bubbles: true });
                    inputElement.dispatchEvent(nativeEvent);
                    $(inputElement).trigger("change");
                  });
                };

                safariRecorder.start();
                isRecording = true;
                recordBtn.textContent = "⏹ Stop Recording";
                recordBtn._safariRecorder = safariRecorder;
              } else {
                recorder.start().then(() => {
                  isRecording = true;
                  recordBtn.textContent = "⏹ Stop Recording";
                });
              }
            })
            .catch((e) => {
              console.error("Mic access failed:", e.name, e.message);
              recordBtn.textContent = "🎙 Start Recording";
              inputElement.disabled = false;
              canvas.style.display = "none";
            });
        } else {
          cancelAnimationFrame(animationId);
          canvas.style.display = "none";
          mediaStream?.getTracks().forEach((track) => track.stop());

          if (isSafari && recordBtn._safariRecorder) {
            recordBtn._safariRecorder.stop();
            recordBtn.textContent = "🎙 Start Recording";
            isRecording = false;
          } else {
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

                pond.setOptions({
                  allowBrowse: true,
                  allowDrop: true,
                  allowPaste: true,
                });
                inputElement.disabled = false;

                pond.addFile(file).then(() => {
                  const dataTransfer = new DataTransfer();
                  dataTransfer.items.add(file);
                  inputElement.files = dataTransfer.files;
                  pendingFile = file;
                  fileTypeCheck = "Audio";

                  const nativeEvent = new Event("change", { bubbles: true });
                  inputElement.dispatchEvent(nativeEvent);
                  $(inputElement).trigger("change");
                });
              })
              .catch((e) => console.error(e));
          }
        }
      });
    }
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initFilePond();
});

window.addEventListener(
  "touchstart",
  () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
  },
  { once: true }
);
