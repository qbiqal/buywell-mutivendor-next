"use client";

import React, { useEffect, useState } from "react";
import styles from "./ThemeToggle.module.css";

const STORAGE_KEY = "apras-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const initial = stored === "dark" ? "dark" : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span className="material-icons" aria-hidden="true">{theme === "dark" ? "light_mode" : "dark_mode"}</span>
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}

