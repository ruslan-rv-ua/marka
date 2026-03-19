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

function changeFontSize(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--font-size"));
  const next = Math.max(10, current + delta);
  root.style.setProperty("--font-size", `${next}px`);
}

function changePadding(delta) {
  const current = parseFloat(getComputedStyle(root).getPropertyValue("--padding-x"));
  const next = Math.min(128, Math.max(0, current + delta));
  root.style.setProperty("--padding-x", `${next}px`);
}

async function renderFile(filePath, preloadedContent) {
  try {
    const markdown = preloadedContent || await invoke("read_file", { path: filePath });
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
    document.title = `${fileName} — Marka`;
  } catch (err) {
    const errorEl = document.createElement("p");
    errorEl.setAttribute("role", "alert");
    errorEl.textContent = `Помилка: ${err}`;
    contentEl.replaceChildren(errorEl);
    contentEl.focus();
  }
}

document.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.key === "o") {
    e.preventDefault();
    const result = await invoke("open_file_dialog");
    if (result) {
      renderFile(result.path, result.content);
    }
  } else if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
    e.preventDefault();
    changeFontSize(1);
  } else if (e.ctrlKey && e.key === "-") {
    e.preventDefault();
    changeFontSize(-1);
  } else if (e.ctrlKey && e.key === "[") {
    e.preventDefault();
    changePadding(-8);
  } else if (e.ctrlKey && e.key === "]") {
    e.preventDefault();
    changePadding(8);
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
