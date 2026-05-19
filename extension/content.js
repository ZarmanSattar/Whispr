// ── Whispr Extension — Content Script ────────────────────────────────────────

(function () {
  if (document.getElementById("whispr-overlay")) return;

  // ── State ────────────────────────────────────────────────────────────────
  let isRecording = false;
  let isExpanded = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let autoCollapseTimer = null;
  let recordingStartTime = null;

  // ── Build overlay ────────────────────────────────────────────────────────
  const overlay = document.createElement("div");
  overlay.id = "whispr-overlay";
  overlay.innerHTML = `
    <div id="whispr-toolbar">
      <div id="whispr-left">
        <div id="whispr-dot"></div>
        <span id="whispr-logo">Whispr</span>
        <span id="whispr-status">Listening</span>
      </div>
      <div id="whispr-right">
        <button id="whispr-clear-btn">Clear</button>
        <button id="whispr-hide-btn">Hide</button>
        <button id="whispr-chevron">&#8964;</button>
        <button id="whispr-close-btn">&#x2715;</button>
      </div>
    </div>
    <div id="whispr-preview-strip">
      <span id="whispr-preview-text"></span>
    </div>
    <div id="whispr-panel" style="display:none;">
      <div id="whispr-question"></div>
      <div id="whispr-divider"></div>
      <div id="whispr-answer"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ── Element refs ─────────────────────────────────────────────────────────
  const dot         = document.getElementById("whispr-dot");
  const statusEl    = document.getElementById("whispr-status");
  const panel       = document.getElementById("whispr-panel");
  const questionEl  = document.getElementById("whispr-question");
  const answerEl    = document.getElementById("whispr-answer");
  const previewEl   = document.getElementById("whispr-preview-text");
  const chevron     = document.getElementById("whispr-chevron");
  const clearBtn    = document.getElementById("whispr-clear-btn");
  const hideBtn     = document.getElementById("whispr-hide-btn");
  const closeBtn    = document.getElementById("whispr-close-btn");
  const previewStrip = document.getElementById("whispr-preview-strip");

  // ── Panel toggle ─────────────────────────────────────────────────────────
  function togglePanel() {
    isExpanded = !isExpanded;
    panel.style.display = isExpanded ? "flex" : "none";
    chevron.innerHTML = isExpanded ? "&#8963;" : "&#8964;";
  }

  chevron.addEventListener("click", togglePanel);
  previewStrip.addEventListener("click", togglePanel);

  // ── Clear ────────────────────────────────────────────────────────────────
  function clearOverlay() {
    answerEl.innerHTML = "";
    questionEl.textContent = "";
    previewEl.textContent = "";
    setStatus("Listening", null);
  }

  clearBtn.addEventListener("click", clearOverlay);

  // ── Hide ─────────────────────────────────────────────────────────────────
  let isHidden = false;
  hideBtn.addEventListener("click", () => {
    isHidden = !isHidden;
    overlay.style.opacity = isHidden ? "0" : "1";
    overlay.style.pointerEvents = isHidden ? "none" : "all";
    hideBtn.textContent = isHidden ? "Show" : "Hide";
  });

  // ── Close ────────────────────────────────────────────────────────────────
  closeBtn.addEventListener("click", () => {
    isHidden = true;
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
    hideBtn.textContent = "Show";
  });

  // ── Drag ─────────────────────────────────────────────────────────────────
  const toolbar = document.getElementById("whispr-toolbar");
  let dragX = 0, dragY = 0, dragging = false;

  toolbar.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    dragging = true;
    dragX = e.clientX - overlay.getBoundingClientRect().left;
    dragY = e.clientY - overlay.getBoundingClientRect().top;
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    overlay.style.left = (e.clientX - dragX) + "px";
    overlay.style.top  = (e.clientY - dragY) + "px";
    overlay.style.transform = "none";
  });

  document.addEventListener("mouseup", () => { dragging = false; });

  // ── Status ───────────────────────────────────────────────────────────────
  function setStatus(text, color) {
    statusEl.textContent = text;
    statusEl.style.color = color || "#7a7870";
    dot.style.background = color || "#d4a03a";
  }

  // ── Recording ────────────────────────────────────────────────────────────
  async function startRecording() {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      const options = { mimeType: "audio/webm;codecs=opus" };
      mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.start(100);
      isRecording = true;
      recordingStartTime = Date.now();
      setStatus("Recording...", "#ff4444");
      dot.classList.add("whispr-recording");
    } catch (err) {
      setStatus("Mic error", "#ff4444");
      console.error("[whispr] Mic error:", err);
    }
  }

  async function stopRecording() {
    if (!isRecording || !mediaRecorder) return;

    const elapsed = Date.now() - recordingStartTime;
    if (elapsed < 1000) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      isRecording = false;
      dot.classList.remove("whispr-recording");
      setStatus("Too short, hold longer", "#ff4444");
      setTimeout(() => setStatus("Listening", null), 2000);
      return;
    }

    isRecording = false;
    dot.classList.remove("whispr-recording");

    await new Promise((resolve) => {
      mediaRecorder.onstop = resolve;
      mediaRecorder.stop();
    });
    mediaRecorder.stream.getTracks().forEach((t) => t.stop());

    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const arrayBuffer = await blob.arrayBuffer();

    chrome.runtime.sendMessage({
      type: "TRANSCRIBE_AND_ANSWER",
      audioData: Array.from(new Uint8Array(arrayBuffer)),
    });
  }

  // ── Keyboard shortcut (push-to-hold) ─────────────────────────────────────
  if (!window.__whisprKeyListenersAdded) {
    window.__whisprKeyListenersAdded = true;

    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyX" && e.ctrlKey && e.shiftKey && !e.repeat) {
        e.preventDefault();
        startRecording();
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.code === "KeyX" && e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        stopRecording();
      }
    });
  }

  // ── Message listener ──────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "STATUS") {
      setStatus(message.status, message.color);
    }

    if (message.type === "SHOW_QUESTION") {
      questionEl.textContent = message.question;
      answerEl.innerHTML = "";
      previewEl.textContent = "";
      if (!isExpanded) togglePanel();
      clearTimeout(autoCollapseTimer);
    }

    if (message.type === "CLEAR_ANSWER") {
      answerEl.innerHTML = "";
      previewEl.textContent = "";
    }

    if (message.type === "APPEND_TOKEN") {
      const token = message.token;
      const span = document.createElement("span");
      span.textContent = token;
      if (token.trim().startsWith("-") || token.trim().startsWith("*")) {
        span.className = "whispr-amber";
      }
      answerEl.appendChild(span);
      answerEl.scrollTop = answerEl.scrollHeight;
      previewEl.textContent = answerEl.textContent.slice(-80);

      clearTimeout(autoCollapseTimer);
      autoCollapseTimer = setTimeout(() => {
        if (isExpanded) togglePanel();
      }, 45000);
    }

    if (message.type === "TOGGLE_VISIBILITY") {
      isHidden = !isHidden;
      overlay.style.opacity = isHidden ? "0" : "1";
      overlay.style.pointerEvents = isHidden ? "none" : "all";
      hideBtn.textContent = isHidden ? "Show" : "Hide";
    }

    if (message.type === "CLEAR_OVERLAY") {
      clearOverlay();
    }

    if (message.type === "SHOW_ERROR") {
      setStatus(message.error, "#ff4444");
    }

    if (message.type === "SESSION_EXPIRED") {
      clearOverlay();
      setStatus("Session ended. Reconnect in popup.", "#ff4444");
    }
  });

})();
