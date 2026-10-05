import { test, expect } from "@playwright/test";

test("hero defers its lightweight video, loops silently and covers the header and hero", async ({ page }) => {
  const videoRequests: number[] = [];
  await page.addInitScript(() => {
    const metrics = { load: 0, shifts: 0, previousVideoTime: 0, maxVideoTime: 0, completedCycles: 0 };
    Object.assign(window, { heroMetrics: metrics });
    window.addEventListener("load", () => { metrics.load = performance.now(); });
    document.addEventListener("timeupdate", event => {
      const media = event.target;
      if (!(media instanceof HTMLVideoElement) || !media.matches(".wifi-hero-background-video")) return;
      if (media.currentTime + 1 < metrics.previousVideoTime) metrics.completedCycles++;
      metrics.previousVideoTime = media.currentTime;
      metrics.maxVideoTime = Math.max(metrics.maxVideoTime, media.currentTime);
    }, true);
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!shift.hadRecentInput) metrics.shifts += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  page.on("request", request => {
    if (/\.(webm|mp4)$/.test(request.url())) videoRequests.push(Date.now());
  });
  await page.goto("/", { waitUntil: "load" });
  const loadTime = await page.evaluate(() => {
    const metrics = (window as Window & { heroMetrics?: { load: number } }).heroMetrics!;
    return performance.timeOrigin + metrics.load;
  });
  const video = page.locator(".wifi-hero-background-video");
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video).not.toHaveAttribute("src");
  await expect(video).toHaveAttribute("poster", "/images/hero-claro-poster.webp");
  await expect(video).toHaveJSProperty("muted", true);
  expect(videoRequests).toEqual([]);
  await expect(video).toHaveAttribute("src", "/videos/claro-pacotes-hero.mp4", { timeout: 10000 });
  expect(videoRequests[0] - loadTime).toBeGreaterThanOrEqual(2950);
  await expect(video).toHaveJSProperty("paused", false);
  await expect(video).toHaveJSProperty("loop", true);
  await expect(video).toHaveJSProperty("volume", 0);
  await expect(video).toHaveJSProperty("playsInline", true);
  await expect(video).toHaveJSProperty("duration", 8);
  // Observe the entire eight-second clip and its natural loop without seeking.
  await expect.poll(() => page.evaluate(() => (
    window as Window & { heroMetrics?: { completedCycles: number } }
  ).heroMetrics!.completedCycles), { timeout: 12000 }).toBeGreaterThanOrEqual(1);
  expect(await page.evaluate(() => (
    window as Window & { heroMetrics?: { maxVideoTime: number } }
  ).heroMetrics!.maxVideoTime)).toBeGreaterThan(7.5);
  await expect(video).toHaveJSProperty("paused", false);
  const geometry = await video.evaluate(element => {
    const videoRect = element.getBoundingClientRect();
    const heroRect = element.closest(".wifi-hero")!.getBoundingClientRect();
    const header = document.querySelector(".wifi-header")!;
    return {
      videoWidth: videoRect.width,
      heroWidth: heroRect.width,
      videoTop: videoRect.top,
      headerTop: header.getBoundingClientRect().top,
      videoBottom: videoRect.bottom,
      heroBottom: heroRect.bottom,
      headerBackground: getComputedStyle(header).backgroundColor,
      fit: getComputedStyle(element).objectFit,
    };
  });
  expect(geometry.videoWidth).toBe(geometry.heroWidth);
  expect(geometry.videoTop).toBeCloseTo(geometry.headerTop, 1);
  expect(geometry.videoBottom).toBeCloseTo(geometry.heroBottom, 1);
  expect(geometry.headerBackground).toBe("rgba(0, 0, 0, 0)");
  expect(geometry.fit).toBe("cover");
  await expect(video).toHaveCount(1);
  await expect(video).toHaveJSProperty("controls", false);
  await expect(page.getByRole("button", { name: /vídeo de fundo/ })).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { heroMetrics?: { shifts: number } }).heroMetrics!.shifts)).toBeLessThan(0.01);
});

test("continuous home background follows the mobile menu and resets on other pages", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "load" });
  const background = page.locator(".wifi-hero-video-background");
  const top = () => background.evaluate(element => element.getBoundingClientRect().top);
  await expect.poll(top).toBeCloseTo(0, 1);

  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  await expect.poll(top).toBeCloseTo(0, 1);
  const geometry = await background.evaluate(element => {
    const header = document.querySelector(".wifi-header")!.getBoundingClientRect();
    const hero = element.closest(".wifi-hero")!.getBoundingClientRect();
    return {
      headerHeight: header.height,
      heroTop: hero.top,
      backgroundBottom: element.getBoundingClientRect().bottom,
      heroBottom: hero.bottom,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(geometry.headerHeight).toBeGreaterThan(101);
  expect(geometry.heroTop).toBeCloseTo(geometry.headerHeight, 1);
  expect(geometry.backgroundBottom).toBeCloseTo(geometry.heroBottom, 1);
  expect(geometry.overflow).toBe(false);

  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Pacotes e promoções", exact: true }).click();
  await expect(page).toHaveURL(/\/planos$/);
  await expect(page.locator(".wifi-home")).toHaveCount(0);
  await expect.poll(() => page.locator(".wifi-header").evaluate(element => getComputedStyle(element).backgroundColor)).toBe("rgb(255, 255, 255)");

  await page.getByRole("link", { name: "WifiConecta — início", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(top).toBeCloseTo(0, 1);
  await expect(page.getByRole("button", { name: "Abrir menu" })).toBeVisible();
});

test("hero autoplays in loop even when motion and data saving preferences are enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });
  });
  const requests: string[] = [];
  page.on("request", request => {
    if (/\.(webm|mp4)$/.test(request.url())) requests.push(request.url());
  });
  await page.goto("/", { waitUntil: "load" });
  const video = page.locator(".wifi-hero-background-video");
  await expect(video).not.toHaveAttribute("src");
  expect(requests).toEqual([]);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(video).toHaveAttribute("src", "/videos/claro-pacotes-hero.mp4", { timeout: 10000 });
  await expect(video).toHaveJSProperty("paused", false);
  await expect(video).toHaveJSProperty("muted", true);
  await expect(video).toHaveJSProperty("volume", 0);
  await expect(video).toHaveJSProperty("loop", true);
  await expect(page.getByRole("button", { name: /vídeo de fundo/ })).toHaveCount(0);
});
