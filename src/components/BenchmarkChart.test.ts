import { experimental_AstroContainer as AstroContainer } from "astro/container";
import reactRenderer from "@astrojs/react/server.js";
import { describe, expect, test } from "vitest";
import BenchmarkChart from "./BenchmarkChart.astro";

const renderChart = () =>
  AstroContainer.create().then((container) => {
    container.addServerRenderer({ renderer: reactRenderer });
    return container.renderToString(BenchmarkChart);
  });

describe("BenchmarkChart", () => {
  test("renders the default Fastify benchmark data", async () => {
    const html = await renderChart();

    expect(html).toContain("Fastify");
    expect(html).toContain("50,373");
    expect(html).toContain("Express");
    expect(html).toContain("27,474");
  });

  test("renders all three benchmark panels", async () => {
    const html = await renderChart();

    expect(html).toContain("Requests per second");
    expect(html).toContain("req/s");
    expect(html.match(/benchmark-panel/g)?.length).toBe(3);
    expect(html.match(/benchmark-dot/g)?.length).toBe(3);
  });

  test("includes latency and throughput data", async () => {
    const html = await renderChart();

    expect(html).toContain("19.33");
    expect(html).toContain("MB/s");
    expect(html).toContain("9.03");
  });

  test("shows how many times faster Fastify is than Express", async () => {
    const html = await renderChart();

    expect(html).toContain("Fastify 1.8× สูงกว่า Express");
  });

  test("renders gallery navigation controls", async () => {
    const html = await renderChart();

    expect(html).toContain("benchmark-prev");
    expect(html).toContain("benchmark-next");
    expect(html).toContain("1 / 3");
  });

  test("links to the benchmark source with update date", async () => {
    const html = await renderChart();

    expect(html).toContain("ข้อมูลเมื่อ");
    expect(html).toContain("1 Oct 2026");
    expect(html).toContain("ที่มา:");
    expect(html).toContain('href="https://fastify.dev/benchmarks/"');
    expect(html).toContain("fastify.dev/benchmarks");
  });

  test("accepts custom benchmarks", async () => {
    const html = await AstroContainer.create().then((container) => {
      container.addServerRenderer({ renderer: reactRenderer });
      return container.renderToString(BenchmarkChart, {
        props: {
          benchmarks: [
            {
              label: "Latency",
              unit: "ms",
              note: "lower is better",
              bars: [
                { name: "Fastify", value: 19.33, version: "5.12.5" },
                { name: "Express", value: 35.89, version: "5.2.1" },
              ],
            },
          ],
        },
      });
    });

    expect(html).toContain("Latency");
    expect(html).toContain("19.33");
    expect(html.match(/benchmark-panel/g)?.length).toBe(1);
  });
});
