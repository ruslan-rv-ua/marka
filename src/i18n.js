import { invoke } from "@tauri-apps/api/core";

let translations = {};
let currentLocale = "en";

/**
 * Ініціалізувати i18n з вказаною локаллю
 * @param {string} locale - код локалі ("uk" або "en")
 */
export async function initI18n(locale) {
  currentLocale = locale;
  const result = await invoke("get_translations", { locale });
  translations = result;
}

/**
 * Отримати переклад за ключем
 * @param {string} key - ключ в файлі JSON (e.g., "theme.light")
 * @param {object} params - параметри для підстановки (e.g., { index: 1 })
 * @returns {string} - переведений рядок
 */
export function t(key, params = {}) {
  let text = translations[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

/**
 * Отримати поточну локаль
 */
export function getLocale() {
  return currentLocale;
}
