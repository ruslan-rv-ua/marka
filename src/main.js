import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getMatches } from "@tauri-apps/plugin-cli";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { initI18n, t, getLocale } from "./i18n.js";

let currentFilePath = null;

function isExternal(href) {
  return href.startsWith('http://') || href.startsWith('https://');
}

function resolvePath(href) {
  if (!currentFilePath) return href;
  // Already an absolute Windows path — return as-is
  if (/^[a-zA-Z]:[/\\]/.test(href)) return href;
  const base = 'file:///' + currentFilePath.replace(/\\/g, '/');
  const resolved = new URL(href, base);
  // pathname is like "/c:/dev/.../file.png" — strip leading "/" and restore backslashes
  return decodeURIComponent(resolved.pathname.replace(/^\//, '').replace(/\//g, '\\'));
}

function fixMediaSrc() {
  if (!currentFilePath) return;
  contentEl.querySelectorAll('img[src], video[src], audio[src], source[src]').forEach((el) => {
    const src = el.getAttribute('src');
    if (src && !isExternal(src) && !src.startsWith('data:') && !src.startsWith('blob:')) {
      el.setAttribute('src', convertFileSrc(resolvePath(src)));
    }
  });
}

// Configure marked with highlight.js via marked-highlight extension
const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  })
);

const contentEl = document.getElementById("content");

const root = document.documentElement;

async function initializeLocale() {
  console.log("initializeLocale: Starting...");
  const settings = await invoke("load_settings");
  console.log("initializeLocale: Loaded settings:", settings);

  // Якщо локаль не встановлена — перший запуск
  if (!settings.locale || settings.locale === "") {
    console.log("initializeLocale: No locale found, detecting system locale...");
    const detectedLocale = await invoke("detect_system_locale");
    console.log("initializeLocale: Detected locale:", detectedLocale);
    settings.locale = detectedLocale;
    console.log("initializeLocale: Saving settings...", settings);
    try {
      await invoke("save_settings", { settings });
      console.log("initializeLocale: Settings saved successfully");
    } catch (err) {
      console.error("initializeLocale: Error saving settings:", err);
    }
  } else {
    console.log("initializeLocale: Locale already set to:", settings.locale);
  }

  // Ініціалізувати i18n
  console.log("initializeLocale: Initializing i18n with locale:", settings.locale);
  await initI18n(settings.locale);

  // Встановити lang атрибут на документі
  document.documentElement.lang = getLocale();

  // Set dynamic content
  document.getElementById("initial-message").textContent = t("initial.message");
  document.querySelector('main[role="document"]').setAttribute("aria-label", t("document.label"));
  console.log("initializeLocale: Complete");
}

async function applySettings() {
  const s = await invoke("load_settings");
  root.style.setProperty("--font-size", `${s.fontSize}px`);
  root.style.setProperty("--padding-x", `${s.paddingX}%`);
  if (s.theme === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }

  // Window geometry is restored in the Rust setup hook (before window is shown).
  // Here we only register listeners to save future changes.
  const win = getCurrentWindow();
  // UnlistenFn return values intentionally discarded — single-window app, no teardown needed
  await win.onResized(() => scheduleSave());
  await win.onMoved(() => scheduleSave());
}

let saveTimer = null;
async function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    (async () => {
      try {
        const win = getCurrentWindow();
        const maximized = await win.isMaximized();
        const size = await win.outerSize();
        const pos = await win.outerPosition();
        await invoke("save_settings", {
          settings: {
            fontSize: parseFloat(getComputedStyle(root).getPropertyValue("--font-size")),
            paddingX: parseFloat(getComputedStyle(root).getPropertyValue("--padding-x")),
            windowWidth: size.width,
            windowHeight: size.height,
            windowX: pos.x,
            windowY: pos.y,
            windowMaximized: maximized,
            theme: root.getAttribute("data-theme") ?? "dark",
          }
        });
      } catch (err) {
        console.error("scheduleSave failed:", err);
      }
    })();
  }, 1000);
}

let pendingClearTimeout = null;
let renderGeneration = 0;

const COPY_ICON = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/></svg>`;

function changeFontSize(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--font-size"));
  const next = Math.min(72, Math.max(10, current + delta));
  root.style.setProperty("--font-size", `${next}px`);
  scheduleSave();
}

function changePadding(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--padding-x"));
  const next = Math.min(25, Math.max(0, current + delta));
  root.style.setProperty("--padding-x", `${next}%`);
  scheduleSave();
}

function getLiveRegion() {
  let el = document.getElementById("copy-announcement");
  if (!el) {
    el = document.createElement("div");
    el.id = "copy-announcement";
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    el.className = "visually-hidden";
    document.body.appendChild(el);
  }
  return el;
}

function announceCopy(text) {
  const el = getLiveRegion();
  el.textContent = text;
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, 3000);
}

function announceTheme(theme) {
  const el = getLiveRegion();
  el.textContent = t(theme === "light" ? "theme.light" : "theme.dark");
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, 3000);
}

function toggleTheme() {
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  if (next === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  announceTheme(next);
  scheduleSave();
}

async function renderFile(filePath, preloadedContent) {
  currentFilePath = filePath;
  try {
    const markdown = preloadedContent ?? await invoke("read_file", { path: filePath });
    contentEl.innerHTML = marked.parse(markdown);
    fixMediaSrc();

    // Ensure aria-live announcement region exists
    getLiveRegion();

    // Add copy buttons after each non-empty code block
    const myGeneration = ++renderGeneration;
    let codeBlockIndex = 0;
    contentEl.querySelectorAll("pre").forEach((pre) => {
      if (pre.textContent.trim() === "") return;
      codeBlockIndex++;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("aria-label", t("copy.button", { index: codeBlockIndex }));
      btn.innerHTML = COPY_ICON;
      btn.addEventListener("click", async () => {
        const codeEl = pre.querySelector("code") ?? pre;
        try {
          await navigator.clipboard.writeText(codeEl.textContent);
          if (renderGeneration === myGeneration) announceCopy(t("copy.success"));
        } catch {
          if (renderGeneration === myGeneration) announceCopy(t("copy.error"));
        }
      });
      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(btn);
    });

    // Make code blocks accessible for NVDA
    contentEl.querySelectorAll("pre").forEach((pre) => {
      pre.setAttribute("role", "region");
      pre.setAttribute("aria-label", t("code.label"));
      pre.setAttribute("tabindex", "0");
    });

    // Force NVDA browse mode by blurring and re-focusing the document container
    contentEl.blur();
    requestAnimationFrame(() => contentEl.focus());

    // Update window title
    const fileName = filePath.split(/[\\/]/).pop();
    await getCurrentWindow().setTitle(`${fileName} — Marka`);
  } catch (err) {
    const errorEl = document.createElement("p");
    errorEl.setAttribute("role", "alert");
    errorEl.textContent = `${t("error.prefix")}${err}`;
    contentEl.replaceChildren(errorEl);
    contentEl.focus();
  }
}

// In-memory history of opened files (cleared on app exit)
const fileHistory = [];

// Handle clicks on links in Markdown content
contentEl.addEventListener("click", (e) => {
  const link = e.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href) return;

  if (isExternal(href)) {
    // External URL → open in default browser
    e.preventDefault();
    invoke("open_url", { url: href }).catch((err) => {
      console.error("Failed to open URL:", err);
    });
  } else {
    // Local file → open in Marka + add to history
    e.preventDefault();
    const absPath = currentFilePath ? resolvePath(href) : href;
    renderFile(absPath);
    // Add to history if not already present
    if (!fileHistory.includes(absPath)) {
      fileHistory.push(absPath);
    }
  }
});

document.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.code === "KeyO") {
    e.preventDefault();
    try {
      const result = await invoke("open_file_dialog");
      if (result) {
        renderFile(result.path, result.content);
      }
    } catch (err) {
      console.error("Failed to open file dialog:", err);
    }
  } else if (e.ctrlKey && e.code === "Equal") {
    e.preventDefault();
    changeFontSize(1);
  } else if (e.ctrlKey && e.code === "Minus") {
    e.preventDefault();
    changeFontSize(-1);
  } else if (e.ctrlKey && e.code === "NumpadAdd") {
    e.preventDefault();
    changeFontSize(1);
  } else if (e.ctrlKey && e.code === "NumpadSubtract") {
    e.preventDefault();
    changeFontSize(-1);
  } else if (e.ctrlKey && e.code === "BracketLeft") {
    e.preventDefault();
    changePadding(-5);
  } else if (e.ctrlKey && e.code === "BracketRight") {
    e.preventDefault();
    changePadding(5);
  } else if (e.ctrlKey && e.code === "KeyT") {
    e.preventDefault();
    toggleTheme();
  } else if (e.key === "Escape") {
    getCurrentWindow().close();
  }
});

// Check CLI arguments on startup
async function checkCliArgs() {
  try {
    const matches = await getMatches();
    if (matches.args.file && matches.args.file.value) {
      renderFile(matches.args.file.value);
    }
  } catch {
    // No CLI args — that's fine
  }
}

try {
  await initializeLocale();
  await applySettings();
} catch (err) {
  console.error("Initialization failed:", err);
}
checkCliArgs();  // intentionally not awaited — CLI open is independent of settings
