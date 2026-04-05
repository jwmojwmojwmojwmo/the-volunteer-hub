"use client";

import { useEffect, useState } from "react";

type ThemeMode = "dark" | "light";

function getThemeFromDom(): ThemeMode {
  const root = document.documentElement;
  if (root.dataset.theme === "dark" || root.classList.contains("dark")) {
    return "dark";
  }
  return "light";
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.dataset.theme = mode;
  try {
    window.localStorage.setItem("theme", mode);
  } catch {
    // Ignore storage write failures so the toggle remains functional.
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const root = document.documentElement;

    const syncThemeFromDom = () => {
      setTheme(getThemeFromDom());
    };

    syncThemeFromDom();

    const observer = new MutationObserver(() => {
      syncThemeFromDom();
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "theme") {
        return;
      }
      const nextTheme: ThemeMode = event.newValue === "light" ? "light" : "dark";
      applyTheme(nextTheme);
      syncThemeFromDom();
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      observer.disconnect();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleTheme = () => {
    const currentTheme = getThemeFromDom();
    const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const buttonLabel = theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="fixed bottom-4 left-4 z-[2000] rounded-full border-2 border-slate-500 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100"
      aria-label={buttonLabel}
      title={buttonLabel}
    >
      Switch to {theme === "dark" ? "Light" : "Dark"} Mode
    </button>
  );
}
