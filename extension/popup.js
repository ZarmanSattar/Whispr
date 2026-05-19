// ── Whispr Extension — Popup ──────────────────────────────────────────────────

const BASE_URL = "https://interview-woad-rho.vercel.app";

const connectedEl     = document.getElementById("popup-connected");
const disconnectedEl  = document.getElementById("popup-disconnected");
const connectBtn      = document.getElementById("popup-connect-btn");
const disconnectBtn   = document.getElementById("popup-disconnect-btn");
const dashboardBtn    = document.getElementById("popup-dashboard-btn");
const statusText      = document.getElementById("popup-status-text");
const codeInput       = document.getElementById("popup-code-input");
const sessionCodeEl   = document.getElementById("popup-session-code");

// ── Check auth on open ────────────────────────────────────────────────────────
chrome.storage.local.get(["connected", "sessionCode"], async (result) => {
  if (result.connected && result.sessionCode && result.sessionCode.length === 6) {
    try {
      const res = await fetch(
        `https://interview-woad-rho.vercel.app/api/live/session?code=${result.sessionCode}`
      );
      const data = await res.json();
      if (data.valid) {
        showConnected(result.sessionCode);
      } else {
        chrome.storage.local.remove(["connected", "sessionCode"]);
        showDisconnected();
      }
    } catch (e) {
      // Network error — show connected anyway
      showConnected(result.sessionCode);
    }
  } else {
    chrome.storage.local.remove(["connected", "sessionCode"]);
    showDisconnected();
  }
});

function showConnected(code) {
  connectedEl.style.display = "flex";
  disconnectedEl.style.display = "none";
  statusText.textContent = "Connected";
  sessionCodeEl.textContent = code || "------";
}

function showDisconnected() {
  connectedEl.style.display = "none";
  disconnectedEl.style.display = "flex";
}

// ── Connect ───────────────────────────────────────────────────────────────────
codeInput.addEventListener("input", () => {
  codeInput.style.borderColor = "";
});

connectBtn.addEventListener("click", async () => {
  const code = codeInput.value.trim();
  if (!code || code.length !== 6) {
    codeInput.style.borderColor = "#ff4444";
    return;
  }

  connectBtn.textContent = "Validating...";
  connectBtn.disabled = true;

  try {
    const res = await fetch(
      `https://interview-woad-rho.vercel.app/api/live/session?code=${code}`
    );
    const data = await res.json();

    if (data.valid) {
      chrome.storage.local.set({ connected: true, sessionCode: code }, () => {
        showConnected(code);
      });
    } else {
      codeInput.style.borderColor = "#ff4444";
      codeInput.placeholder = "Invalid or expired code";
    }
  } catch (e) {
    codeInput.style.borderColor = "#ff4444";
    codeInput.placeholder = "Connection error, try again";
  } finally {
    connectBtn.textContent = "Connect to Whispr";
    connectBtn.disabled = false;
  }
});

// ── Disconnect ────────────────────────────────────────────────────────────────
disconnectBtn.addEventListener("click", () => {
  chrome.storage.local.remove(["connected", "sessionCode"], () => {
    showDisconnected();
  });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
dashboardBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: `${BASE_URL}/dashboard/live` });
});
