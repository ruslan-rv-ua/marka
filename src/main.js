import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
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

let pendingClearTimeout = null;
let renderGeneration = 0;

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

function announceCopy(text) {
  const el = document.getElementById("copy-announcement");
  if (!el) return;
  el.textContent = text;
  clearTimeout(pendingClearTimeout);
  pendingClearTimeout = setTimeout(() => { el.textContent = ""; }, 3000);
}

async function renderFile(filePath, preloadedContent) {
  try {
    const markdown = preloadedContent ?? await invoke("read_file", { path: filePath });
    contentEl.innerHTML = marked.parse(markdown);

    // Insert aria-live announcement region once
    if (!document.getElementById("copy-announcement")) {
      const liveEl = document.createElement("div");
      liveEl.id = "copy-announcement";
      liveEl.setAttribute("aria-live", "polite");
      liveEl.setAttribute("aria-atomic", "true");
      liveEl.className = "visually-hidden";
      document.body.appendChild(liveEl);
    }

    // Add copy buttons after each non-empty code block
    const myGeneration = ++renderGeneration;
    let codeBlockIndex = 0;
    contentEl.querySelectorAll("pre").forEach((pre) => {
      if (pre.textContent.trim() === "") return;
      codeBlockIndex++;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.setAttribute("aria-label", `Копіювати код ${codeBlockIndex}`);
      btn.textContent = "Копіювати";
      btn.addEventListener("click", async () => {
        const codeEl = pre.querySelector("code") ?? pre;
        clearTimeout(pendingClearTimeout);
        try {
          await navigator.clipboard.writeText(codeEl.textContent);
          if (renderGeneration === myGeneration) announceCopy("Код скопійовано");
        } catch {
          if (renderGeneration === myGeneration) announceCopy("Помилка копіювання");
        }
      });
      pre.insertAdjacentElement("afterend", btn);
    });

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

checkCliArgs();
