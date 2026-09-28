// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import ThemeToggle from "./ThemeToggle";

const originalMatchMedia = window.matchMedia.bind(window);

const prefersColorScheme = (dark: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: dark,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList);
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

describe("ThemeToggle", () => {
  test("applies the stored theme on mount", () => {
    localStorage.setItem("theme", "dark");

    render(<ThemeToggle />);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  test("falls back to the system preference when nothing is stored", () => {
    prefersColorScheme(true);

    render(<ThemeToggle />);

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  test("toggles the theme and persists the choice", () => {
    prefersColorScheme(false);

    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    const button = screen.getByRole("button", { name: "Toggle theme" });

    fireEvent.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");

    fireEvent.click(button);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
