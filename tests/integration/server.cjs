// Local-only Mediastore fixture shared by Node and browser integration tests.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");

async function startFixture(port = 0) {
  const events = new EventEmitter();
  const requests = [];
  const held = new Set();
  let origin;

  const action = (method, template, variables = []) => ({
    method,
    template: origin + template,
    mappings: variables.map((variable) => ({ variable, source: variable })),
  });
  const context = (model) => ({
    "@context": {
      properties:
        model === "widget"
          ? {
              id: { type: "number" },
              name: { type: "string" },
              team: {
                type: `${origin}/v20140601/context/team`,
                collection: false,
              },
            }
          : { id: { type: "number" }, name: { type: "string" } },
      collection_actions: {
        query: action("GET", `/${model}s{?q,ids,page,per}`, [
          "q",
          "ids",
          "page",
          "per",
        ]),
        get: action("GET", `/${model}s/{id}`, ["id"]),
        create: action("POST", "/echo"),
        update: action("PUT", "/echo"),
        patch: action("PATCH", "/echo"),
        delete: action("DELETE", "/echo"),
        proxy: action("POST", "/proxy"),
        status: action("GET", "/status/{status}", ["status"]),
        download: action("GET", "/download{?filename,type}", [
          "filename",
          "type",
        ]),
        redirect: action("GET", "/redirect{?target,code}", ["target", "code"]),
      },
      member_actions: { get: action("GET", `/${model}s/{id}`, ["id"]) },
    },
  });

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, origin);
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      const text = bytes.toString("utf8");
      const body =
        req.headers["content-type"]?.includes("application/json") && text
          ? JSON.parse(text)
          : text;
      const record = {
        method: req.method,
        pathname: url.pathname,
        query: Object.fromEntries(url.searchParams),
        headers: req.headers,
        body,
        bytes,
      };
      requests.push(record);
      events.emit("request", record);
      res.on("close", () => {
        held.delete(res);
        record.closed = true;
        events.emit("closed", record);
      });
      const json = (value, status = 200) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(value));
      };

      if (url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          '<!doctype html><title>Chipmunk integration fixture</title><script src="/chipmunk.bundle.js"></script>',
        );
      } else if (url.pathname === "/chipmunk.bundle.js") {
        res.writeHead(200, { "Content-Type": "text/javascript" });
        res.end(
          fs.readFileSync(
            path.resolve(__dirname, "../../dist/chipmunk.bundle.js"),
          ),
        );
      } else if (url.pathname === "/__requests") {
        json(
          requests
            .filter((record) => !record.pathname.startsWith("/__"))
            .map(({ bytes, ...record }) => record),
        );
      } else if (url.pathname === "/health") {
        json({ ready: true });
      } else if (url.pathname.startsWith("/v20140601/context/")) {
        json(context(url.pathname.split("/").pop()));
      } else if (url.pathname === "/echo") {
        json({ method: req.method, headers: req.headers, body });
      } else if (url.pathname === "/redirect") {
        res.writeHead(Number(url.searchParams.get("code") || 302), {
          Location: url.searchParams.get("target") || "/echo",
        });
        res.end();
      } else if (url.pathname === "/download") {
        const headers = {
          "Content-Type":
            url.searchParams.get("type") || "application/octet-stream",
        };
        if (url.searchParams.has("filename"))
          headers["Content-Disposition"] = url.searchParams.get("filename");
        res.writeHead(200, headers);
        res.end(Buffer.from([0, 1, 2, 127, 128, 254, 255]));
      } else if (url.pathname.startsWith("/status/")) {
        const status = Number(url.pathname.split("/").pop());
        if (status === 204) {
          res.writeHead(204);
          res.end();
        } else json({ description: "fixture error", status }, status);
      } else if (url.pathname === "/disconnect") {
        req.socket.destroy();
      } else if (url.pathname === "/proxy" && body.opts?.params?.q !== "hold") {
        json({ objects: [{ id: 7 }], echoed: body });
      } else if (
        url.searchParams.get("q")?.startsWith("hold") ||
        url.pathname === "/teams/1" ||
        (url.pathname === "/proxy" && body.opts?.params?.q === "hold")
      ) {
        held.add(res);
      } else if (url.pathname.startsWith("/widgets")) {
        const widget = {
          "@id": `${origin}/widgets/1`,
          "@context": `${origin}/v20140601/context/widget`,
          id: 1,
          name: "widget",
          team: { "@id": `${origin}/teams/1` },
        };
        json(url.pathname === "/widgets" ? { members: [widget] } : widget);
      } else {
        json({ description: "fixture route not found" }, 404);
      }
    } catch (error) {
      res.writeHead(500);
      res.end(error.message);
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  origin = `http://localhost:${server.address().port}`;
  return {
    origin,
    requests,
    nextRequest(pathname) {
      return new Promise((resolve) => {
        const listener = (record) => {
          if (record.pathname === pathname) {
            events.off("request", listener);
            resolve(record);
          }
        };
        events.on("request", listener);
      });
    },
    async close() {
      events.removeAllListeners();
      held.forEach((res) => res.destroy());
      server.closeAllConnections();
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

module.exports = { startFixture };

if (require.main === module) {
  startFixture(Number(process.env.CHIPMUNK_TEST_PORT || 3217))
    .then((fixture) => {
      console.log(`Fixture ready at ${fixture.origin}`);
      for (const signal of ["SIGINT", "SIGTERM"])
        process.once(signal, () => fixture.close().then(() => process.exit(0)));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
