"use strict";

const THEME_KEY = "family_budget_theme_v1";

function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch (error) {
    console.warn("Не удалось прочитать тему:", error);
  }
  return "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  const themeToggle = document.getElementById("themeToggle");
  if (!themeToggle) return;

  const isDark = theme === "dark";
  themeToggle.textContent = isDark ? "☀️" : "🌙";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Включить светлую тему" : "Включить тёмную тему"
  );
  themeToggle.title = isDark ? "Светлая тема" : "Тёмная тема";
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.warn("Не удалось сохранить тему:", error);
  }
}

function initTheme() {
  const themeToggle = document.getElementById("themeToggle");
  applyTheme(getSavedTheme());

  if (!themeToggle) return;

  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    saveTheme(nextTheme);
  });
}

document.addEventListener("DOMContentLoaded", initTheme);
