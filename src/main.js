import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getMatches } from "@tauri-apps/plugin-cli";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js/lib/common";
import { initI18n, t, getLocale } from "./i18n.js";
import DOMPurify from "dompurify";

let currentFilePath = null;

const navHistory = [];
let historyIndex = -1;
let navigatingHistory = false;

function fileNameFromPath(filePath) {
  return filePath.split(/[\\/]/).pop();
}

async function navigateTo(filePath, content) {
  if (!navigatingHistory) {
    navHistory.splice(historyIndex + 1);
    navHistory.push(filePath);
    historyIndex = navHistory.length - 1;
  }
  return await renderFile(filePath, content);
}

async function goBack() {
  if (navigatingHistory) return;
  if (historyIndex <= 0) {
    announce(t("history.empty"));
    return;
  }
  historyIndex--;
  navigatingHistory = true;
  try {
    await renderFile(navHistory[historyIndex]);
    announce(t("history.back", { file: fileNameFromPath(navHistory[historyIndex]) }));
  } finally {
    navigatingHistory = false;
  }
}

async function goForward() {
  if (navigatingHistory) return;
  if (historyIndex >= navHistory.length - 1) {
    announce(t("history.empty"));
    return;
  }
  historyIndex++;
  navigatingHistory = true;
  try {
    await renderFile(navHistory[historyIndex]);
    announce(t("history.forward", { file: fileNameFromPath(navHistory[historyIndex]) }));
  } finally {
    navigatingHistory = false;
  }
}

function isExternal(href) {
  try {
    const u = new URL(href);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
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

function scrollToAnchor(anchorId) {
  const target = document.getElementById(anchorId);
  if (target) {
    target.focus();
  }
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
// html: true — allows raw HTML tags in Markdown (video, audio, etc.)
// DOMPurify sanitizes the output, so this is safe
const marked = new Marked(
  { html: true },
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
  const settings = await invoke("load_settings");

  // Якщо локаль не встановлена — перший запуск
  if (!settings.locale || settings.locale === "") {
    const detectedLocale = await invoke("detect_system_locale");
    settings.locale = detectedLocale;
    try {
      await invoke("save_settings", { settings });
    } catch (err) {
      console.error("initializeLocale: Error saving settings:", err);
    }
  }

  // Ініціалізувати i18n
  await initI18n(settings.locale);

  // Встановити lang атрибут на документі
  document.documentElement.lang = getLocale();

  // Set dynamic content
  document.querySelector('main[role="document"]').setAttribute("aria-label", t("document.label"));
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
  }, SAVE_DEBOUNCE_MS);
}

let pendingClearTimeout = null;
let renderGeneration = 0;

const ANNOUNCE_TIMEOUT_MS = 3000;
const SAVE_DEBOUNCE_MS = 1000;
const FONT_SIZE_MIN = 10, FONT_SIZE_MAX = 72;
const PADDING_MIN = 0, PADDING_MAX = 25;

const COPY_ICON = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/></svg>`;

function changeFontSize(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--font-size"));
  const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, current + delta));
  root.style.setProperty("--font-size", `${next}px`);
  scheduleSave();
}

function changePadding(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--padding-x"));
  const next = Math.min(PADDING_MAX, Math.max(PADDING_MIN, current + delta));
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

function announce(text) {
  const el = getLiveRegion();
  el.textContent = text;
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, ANNOUNCE_TIMEOUT_MS);
}

function toggleTheme() {
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  if (next === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  announce(t(next === "light" ? "theme.light" : "theme.dark"));
  scheduleSave();
}

async function renderFile(filePath, preloadedContent) {
  currentFilePath = filePath;
  try {
    const markdown = preloadedContent ?? await invoke("read_file", { path: filePath });
    contentEl.innerHTML = DOMPurify.sanitize(marked.parse(markdown));
    fixMediaSrc();

    // Ensure aria-live announcement region exists
    getLiveRegion();

    // Add copy buttons and ARIA attributes to each non-empty code block
    const myGeneration = ++renderGeneration;
    let codeBlockIndex = 0;
    contentEl.querySelectorAll("pre").forEach((pre) => {
      if (pre.textContent.trim() === "") return;
      codeBlockIndex++;

      // ARIA accessibility for NVDA
      pre.setAttribute("role", "region");
      pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));
      pre.setAttribute("tabindex", "0");

      // Copy button
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("aria-label", t("copy.button", { index: codeBlockIndex }));
      btn.innerHTML = COPY_ICON;
      btn.addEventListener("click", async () => {
        const codeEl = pre.querySelector("code") ?? pre;
        try {
          await navigator.clipboard.writeText(codeEl.textContent);
          if (renderGeneration === myGeneration) announce(t("copy.success"));
        } catch {
          if (renderGeneration === myGeneration) announce(t("copy.error"));
        }
      });
      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(btn);
    });

    // Handle Enter key on anchor links
    contentEl.querySelectorAll("a[href^='#']").forEach((link) => {
      link.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          scrollToAnchor(link.getAttribute("href").slice(1));
        }
      });
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

async function showHelp() {
  try {
    const markdown = await invoke("get_help", { locale: getLocale() });
    contentEl.innerHTML = DOMPurify.sanitize(marked.parse(markdown));

    // ARIA attributes for NVDA on code blocks (no copy buttons for help screen)
    let codeBlockIndex = 0;
    contentEl.querySelectorAll("pre").forEach((pre) => {
      if (pre.textContent.trim() === "") return;
      codeBlockIndex++;
      pre.setAttribute("role", "region");
      pre.setAttribute("aria-label", t("code.label", { index: codeBlockIndex }));
      pre.setAttribute("tabindex", "0");
    });

    // Force NVDA browse mode refresh
    contentEl.blur();
    requestAnimationFrame(() => contentEl.focus());
  } catch (err) {
    const errorEl = document.createElement("p");
    errorEl.setAttribute("role", "alert");
    errorEl.textContent = `${t("error.prefix")}${err}`;
    contentEl.replaceChildren(errorEl);
    contentEl.focus();
  }
}

// Handle clicks on links in Markdown content
contentEl.addEventListener("click", (e) => {
  const link = e.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href) return;

  // Check if this is an anchor link
  if (href.startsWith("#")) {
    e.preventDefault();
    scrollToAnchor(href.slice(1));
    return;
  }

  if (isExternal(href)) {
    // External URL → open in default browser
    e.preventDefault();
    invoke("open_url", { url: href }).catch((err) => {
      console.error("Failed to open URL:", err);
    });
  } else {
    // Local file → open in Marka
    e.preventDefault();
    const absPath = currentFilePath ? resolvePath(href) : href;
    navigateTo(absPath);
  }
});

document.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.code === "KeyO") {
    e.preventDefault();
    try {
      const result = await invoke("open_file_dialog");
      if (result) {
        navigateTo(result.path, result.content);
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
  } else if (e.altKey && e.code === "ArrowLeft") {
    e.preventDefault();
    goBack();
  } else if (e.altKey && e.code === "ArrowRight") {
    e.preventDefault();
    goForward();
  } else if (e.key === "Escape") {
    getCurrentWindow().close();
  }
});

// Check CLI arguments on startup
async function checkCliArgs() {
  try {
    const matches = await getMatches();
    if (matches.args.file && matches.args.file.value) {
      await navigateTo(matches.args.file.value);
      return true;
    }
  } catch (err) {
    // Plugin not initialized or no CLI args — expected in non-CLI launch
    if (import.meta.env.DEV) console.warn("checkCliArgs:", err);
  }
  return false;
}

try {
  await initializeLocale();
  await applySettings();
} catch (err) {
  console.error("Initialization failed:", err);
}
const fileOpened = await checkCliArgs();
if (!fileOpened) await showHelp();
