// ── Whispr Extension — Background Service Worker ─────────────────────────────

const BASE_URL = "https://interview-woad-rho.vercel.app";

// ── Auth ──────────────────────────────────────────────────────────────────────

async function verifyAuth() {
  return new Promise((resolve) => {
    chrome.cookies.get({
      url: "https://interview-woad-rho.vercel.app",
      name: "__session"
    }, (cookie) => {
      resolve(!!cookie);
    });
  });
}

async function getAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["userId", "sessionToken", "sessionCode"], (result) => {
      resolve(result);
    });
  });
}

async function saveAuth(userId, sessionToken) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ userId, sessionToken }, resolve);
  });
}

async function clearAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["userId", "sessionToken"], resolve);
  });
}

// ── Session ───────────────────────────────────────────────────────────────────

async function createSession(jobRole, targetCompany, resumeText, sessionToken) {
  const res = await fetch(`${BASE_URL}/api/live/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ jobRole, targetCompany, resumeText }),
  });
  if (!res.ok) throw new Error(`Session error: ${res.status}`);
  return res.json();
}

// ── Transcription ─────────────────────────────────────────────────────────────

async function transcribeAudio(audioBuffer) {
  const res = await fetch(
    `${BASE_URL}/api/live/transcribe`,
    {
      method: "POST",
      headers: {
        "Content-Type": "audio/webm;codecs=opus",
      },
      body: audioBuffer,
    }
  );
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Transcribe error: ${res.status} — ${errorBody}`);
  }
  const data = await res.json();
  return data.transcript || "";
}

// ── Answer generation ─────────────────────────────────────────────────────────

async function generateAnswer(code, questionText) {
  const res = await fetch(`${BASE_URL}/api/live/answer`, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Origin": "chrome-extension://",
      "Access-Control-Request-Method": "POST",
    },
    body: JSON.stringify({ code, questionText }),
  });
  if (!res.ok) throw new Error(`Answer error: ${res.status}`);
  const data = await res.json();
  return data.answer || "";
}

// ── Session health check ──────────────────────────────────────────────────────

async function checkSessionAlive() {
  const auth = await getAuth();
  if (!auth.sessionCode) return;

  try {
    const res = await fetch(
      `https://interview-woad-rho.vercel.app/api/live/session?code=${auth.sessionCode}`
    );
    const data = await res.json();
    if (!data.valid) {
      chrome.storage.local.remove(["connected", "sessionCode"]);
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          chrome.tabs.sendMessage(tab.id, { type: "SESSION_EXPIRED" });
        } catch (e) {}
      }
    }
  } catch (e) {
    // Network error — do not disconnect, just skip this check
  }
}

setInterval(checkSessionAlive, 30000);

// ── Command handler ───────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await new Promise(r => setTimeout(r, 50));
  if (command === "toggle-visibility") {
    try { chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_VISIBILITY" }); } catch (e) {}
  } else if (command === "clear-overlay") {
    try { chrome.tabs.sendMessage(tab.id, { type: "CLEAR_OVERLAY" }); } catch (e) {}
  }
});

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TRANSCRIBE_AND_ANSWER") {
    handleTranscribeAndAnswer(message, sender.tab.id);
    sendResponse({ status: "processing" });
    return true;
  }

  if (message.type === "SAVE_AUTH") {
    saveAuth(message.userId, message.sessionToken)
      .then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (message.type === "GET_AUTH") {
    getAuth()
      .then((auth) => sendResponse(auth))
      .catch(() => sendResponse({}));
    return true;
  }

  if (message.type === "CLEAR_AUTH") {
    clearAuth()
      .then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "VERIFY_AUTH") {
    verifyAuth()
      .then((authenticated) => sendResponse({ authenticated }))
      .catch(() => sendResponse({ authenticated: false }));
    return true;
  }

  if (message.type === "CREATE_SESSION") {
    const { jobRole, targetCompany, resumeText, sessionToken } = message;
    createSession(jobRole, targetCompany, resumeText, sessionToken)
      .then((data) => sendResponse({ success: true, data }))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }
});

async function handleTranscribeAndAnswer(message, tabId) {
  try {
    const auth = await getAuth();

    try { chrome.tabs.sendMessage(tabId, { type: "STATUS", status: "Transcribing...", color: "#4a9eff" }); } catch (e) {}

    const audioBuffer = new Uint8Array(message.audioData).buffer;
    const transcript = await transcribeAudio(audioBuffer);

    if (!transcript.trim()) {
      try { chrome.tabs.sendMessage(tabId, { type: "STATUS", status: "Listening", color: null }); } catch (e) {}
      return;
    }

    console.log("[background] Transcript:", transcript);
    try { chrome.tabs.sendMessage(tabId, { type: "SHOW_QUESTION", question: transcript }); } catch (e) {}
    try { chrome.tabs.sendMessage(tabId, { type: "STATUS", status: "Thinking...", color: "#4a9eff" }); } catch (e) {}

    const sessionCode = auth.sessionCode || "";
    if (!sessionCode) {
      try { chrome.tabs.sendMessage(tabId, { type: "SHOW_ERROR", error: "No active session. Start one from the Whispr dashboard." }); } catch (e) {}
      return;
    }

    const answer = await generateAnswer(sessionCode, transcript);

    if (!answer) {
      try { chrome.tabs.sendMessage(tabId, { type: "SHOW_ERROR", error: "No answer returned." }); } catch (e) {}
      return;
    }

    const words = answer.split(" ");
    try { chrome.tabs.sendMessage(tabId, { type: "CLEAR_ANSWER" }); } catch (e) {}
    for (let i = 0; i < words.length; i++) {
      const token = i === 0 ? words[i] : " " + words[i];
      try { chrome.tabs.sendMessage(tabId, { type: "APPEND_TOKEN", token }); } catch (e) {}
      await new Promise((r) => setTimeout(r, 30));
    }

    try { chrome.tabs.sendMessage(tabId, { type: "STATUS", status: "Listening", color: null }); } catch (e) {}

  } catch (err) {
    console.error("[background] Error:", err);
    try { chrome.tabs.sendMessage(tabId, { type: "SHOW_ERROR", error: err.message }); } catch (e) {}
  }
}
