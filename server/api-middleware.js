import { ApiError, getServiceStatus, optimizeSeo } from "./seo-ai.js";

export function seoOptimizerApiMiddleware() {
  return async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");

    if (!url.pathname.startsWith("/api/")) {
      next();
      return;
    }

    try {
      if (url.pathname === "/api/status" && req.method === "GET") {
        sendJson(res, 200, await getServiceStatus());
        return;
      }

      if (url.pathname === "/api/optimize" && req.method === "POST") {
        const body = await readJsonBody(req);
        sendJson(res, 200, await optimizeSeo(body));
        return;
      }

      if (req.method === "OPTIONS") {
        sendJson(res, 204, {});
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500;
      const message = error instanceof Error ? error.message : "Unexpected server error";

      if (status >= 500) {
        console.error("[seo-api]", error);
      }

      sendJson(res, status, { error: message });
    }
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk.toString();

      if (raw.length > 64 * 1024) {
        reject(new ApiError("Request body is too large.", 413));
        req.destroy();
      }
    });

    req.on("error", reject);
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new ApiError("Request body must be valid JSON.", 400));
      }
    });
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(status === 204 ? "" : JSON.stringify(body));
}
