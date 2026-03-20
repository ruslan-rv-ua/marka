import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { getMatches } from "@tauri-apps/plugin-cli";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

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

async function applySettings() {
  const s = await invoke("load_settings");
  root.style.setProperty("--font-size", `${s.fontSize}px`);
  root.style.setProperty("--padding-x", `${s.paddingX}%`);

  const win = getCurrentWindow();
  if (s.windowMaximized) {
    await win.maximize();
  } else if (s.windowX != null && s.windowY != null) {
    await win.setPosition(new PhysicalPosition(s.windowX, s.windowY));
    await win.setSize(new PhysicalSize(s.windowWidth, s.windowHeight));
  }
}

let saveTimer = null;
async function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
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
      }
    }).catch(err => console.error("save_settings failed:", err));
  }, 1000);
}

function changeFontSize(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--font-size"));
  const next = Math.min(72, Math.max(10, current + delta));
  root.style.setProperty("--font-size", `${next}px`);
}

function changePadding(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--padding-x"));
  const next = Math.min(25, Math.max(0, current + delta));
  root.style.setProperty("--padding-x", `${next}%`);
}

async function renderFile(filePath, preloadedContent) {
  try {
    const markdown = preloadedContent ?? await invoke("read_file", { path: filePath });
    contentEl.innerHTML = marked.parse(markdown);

    // Make code blocks accessible for NVDA
    contentEl.querySelectorAll("pre").forEach((pre) => {
      pre.setAttribute("role", "region");
      pre.setAttribute("aria-label", "Блок коду");
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
    errorEl.textContent = `Помилка: ${err}`;
    contentEl.replaceChildren(errorEl);
    contentEl.focus();
  }
}

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
  } else if (e.ctrlKey && e.code === "BracketLeft") {
    e.preventDefault();
    changePadding(-5);
  } else if (e.ctrlKey && e.code === "BracketRight") {
    e.preventDefault();
    changePadding(5);
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
  await applySettings();
} catch (err) {
  console.error("applySettings failed:", err);
}
checkCliArgs();  // intentionally not awaited — CLI open is independent of settings
