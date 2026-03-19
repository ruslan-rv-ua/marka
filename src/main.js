import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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

async function renderFile(filePath) {
  try {
    const markdown = await invoke("read_file", { path: filePath });
    contentEl.innerHTML = marked.parse(markdown);
    contentEl.focus();

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

// Listen for file open events from Rust menu
listen("open-file", (event) => {
  renderFile(event.payload);
});

// Handle Escape key: close app
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
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
