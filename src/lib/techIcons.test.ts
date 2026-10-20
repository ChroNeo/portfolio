import { describe, expect, test } from "vitest";
import { SiFastify, SiJavascript, SiReact } from "react-icons/si";
import { getTechIcon, hasTechIcon } from "./techIcons";

describe("getTechIcon", () => {
  test("returns the mapped icon for a known technology", () => {
    expect(getTechIcon("React")).toBe(SiReact);
    expect(getTechIcon("Fastify")).toBe(SiFastify);
  });

  test("falls back to the JavaScript icon for unknown technologies", () => {
    expect(getTechIcon("SomeUnknownTech")).toBe(SiJavascript);
    expect(getTechIcon("")).toBe(SiJavascript);
  });
});

describe("hasTechIcon", () => {
  test("reports support for known technologies only", () => {
    expect(hasTechIcon("React")).toBe(true);
    expect(hasTechIcon("SomeUnknownTech")).toBe(false);
    expect(hasTechIcon("")).toBe(false);
  });
});
