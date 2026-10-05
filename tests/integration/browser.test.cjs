const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.client = window.MFX.createChipmunk({
      endpoints: { um: location.origin, tuco: location.origin },
      timestamp: null,
      headers: { "Session-Id": "browser-session" },
    });
  });
});

test("loads the published browser globals and makes a request", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const result = await window.client.action("um.widget", "create", {
      body: { count: 0, enabled: false },
    });
    return {
      object: result.object,
      uri: window.UriTemplate("/widgets/{id}").fillFromObject({ id: 7 }),
      clean: typeof window.MFX.cleanChipmunkConfig,
    };
  });
  expect(result.object.body).toEqual({ count: 0, enabled: false });
  expect(result.object.headers["session-id"]).toBe("browser-session");
  expect(result.object.headers["x-window-location"]).toContain("localhost:");
  expect(result.uri).toBe("/widgets/7");
  expect(result.clean).toBe("function");
});

test("sends browser FormData without losing its multipart boundary", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const body = new FormData();
    body.append("caption", "München & friends");
    body.append(
      "file",
      new Blob(["browser-file"], { type: "text/plain" }),
      "sample.txt",
    );
    return (await window.client.action("um.widget", "create", { body })).object;
  });
  const boundary = result.headers["content-type"].match(/boundary=(.+)$/)[1];
  expect(result.body).toContain(`--${boundary}`);
  expect(result.body).toContain("München & friends");
  expect(result.body).toContain("browser-file");
  expect(result.body).toContain('filename="sample.txt"');
});

test("normalizes browser HTTP errors", async ({ page }) => {
  const error = await page.evaluate(async () => {
    try {
      await window.client.action("um.widget", "status", {
        params: { status: 401 },
      });
    } catch (error) {
      return {
        name: error.name,
        text: error.text,
        object: error.object,
        pending: Object.keys(
          window.client.currentConfig().watcher.pendingRequests,
        ),
      };
    }
    throw new Error("Request unexpectedly succeeded");
  });
  expect(error).toEqual({
    name: "RequestError",
    text: "fixture error",
    object: { description: "fixture error", status: 401 },
    pending: [],
  });
});

test("aborts only after the browser request has reached the server", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.client.createAbortController();
    window.requestMarker = `hold-${crypto.randomUUID()}`;
    window.outcome = window.client
      .action("um.widget", "query", {
        params: { q: window.requestMarker },
        signal: new AbortController().signal,
      })
      .then(
        () => ({ success: true }),
        (error) => ({ message: error.message, code: error.code }),
      );
  });
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await (await fetch("/__requests")).json()).some(
          (request) =>
            request.pathname === "/widgets" &&
            request.query.q === window.requestMarker,
        ),
      ),
    )
    .toBe(true);
  const result = await page.evaluate(async () => {
    window.client.abort();
    return window.outcome;
  });
  expect(result).toEqual({
    message: "Request was aborted",
    code: "ERR_CANCELED",
  });
  expect(
    await page.evaluate(() =>
      Object.keys(window.client.currentConfig().watcher.pendingRequests),
    ),
  ).toEqual([]);
});

test("keeps storage cache entries separate for different sessions", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    window.client.updateConfig({ cache: { default: "storage" } });
    window.client.cache.set("item", { id: 1 });
    window.client.updateConfig({ headers: { "Session-Id": "other-session" } });
    const other = window.client.cache.get("item");
    window.client.updateConfig({
      headers: { "Session-Id": "browser-session" },
    });
    return { other, original: window.client.cache.get("item") };
  });
  expect(result).toEqual({ other: null, original: { id: 1 } });
});

for (const [filename, expectedName, type] of [
  [
    'attachment; filename="sample.bin"',
    "sample.bin",
    "application/octet-stream",
  ],
  ["attachment; filename*=UTF-8''caf%C3%A9.pdf", "café.pdf", "application/pdf"],
  [
    undefined,
    "download.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
])
  test(`downloads ${expectedName} with exact bytes and object URL cleanup`, async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.revokedUrls = [];
      const revoke = URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL = (url) => {
        window.revokedUrls.push(url);
        revoke(url);
      };
    });
    const downloadEvent = page.waitForEvent("download");
    const action = page.evaluate(
      async (params) =>
        window.client.action("um.widget", "download", {
          params,
          isFileDownload: true,
        }),
      { filename, type },
    );
    const download = await downloadEvent;
    await action;
    expect(download.suggestedFilename()).toBe(expectedName);
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    expect(Buffer.concat(chunks)).toEqual(
      Buffer.from([0, 1, 2, 127, 128, 254, 255]),
    );
    expect(await page.evaluate(() => window.revokedUrls.length)).toBe(1);
    await expect(page.locator("a[download]")).toHaveCount(0);
  });

test("cancels an association request using a per-action signal", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.visitor = crypto.randomUUID();
    window.client.updateConfig({ headers: { "Visitor-Id": window.visitor } });
    window.cancelController = new AbortController();
    window.outcome = window.client
      .action("um.widget", "get", {
        params: { id: 1 },
        schema: "id, team { name }",
        proxy: false,
        signal: window.cancelController.signal,
      })
      .then(
        () => ({ success: true }),
        (error) => ({ message: error.message, code: error.code }),
      );
  });
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await (await fetch("/__requests")).json()).some(
          (request) =>
            request.pathname === "/teams/1" &&
            request.headers["visitor-id"] === window.visitor,
        ),
      ),
    )
    .toBe(true);
  const result = await page.evaluate(async () => {
    window.cancelController.abort();
    return window.outcome;
  });
  expect(result).toEqual({
    message: "Request was aborted",
    code: "ERR_CANCELED",
  });
  expect(
    await page.evaluate(() =>
      Object.keys(window.client.currentConfig().watcher.pendingRequests),
    ),
  ).toEqual([]);
});
