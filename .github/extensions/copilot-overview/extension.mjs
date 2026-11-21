import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

const servers = new Map();
const htmlPath = new URL("./index.html", import.meta.url);

async function startServer() {
    const server = createServer(async (req, res) => {
        if (req.method !== "GET" || new URL(req.url, "http://127.0.0.1").pathname !== "/") {
            res.writeHead(404).end("Not found");
            return;
        }
        try {
            const html = await readFile(htmlPath);
            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            });
            res.end(html);
        } catch (error) {
            res.writeHead(500).end("Unable to load presentation");
            console.error(error);
        }
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

await joinSession({
    canvases: [
        createCanvas({
            id: "copilot-overview",
            displayName: "GitHub Copilot 機能概要",
            description: "公式情報に基づくGitHub Copilotの機能概要資料を表示します。",
            inputSchema: { type: "object", properties: {}, additionalProperties: false },
            actions: [{
                name: "get_presentation_info",
                description: "資料の内容と操作方法を確認します。",
                handler: () => ({
                    title: "GitHub Copilot 機能概要",
                    document: ".github/extensions/copilot-overview/index.html",
                    modes: ["資料", "スライド"],
                    navigation: "スライド表示では左右の矢印キーまたは画面上のボタンで移動できます。",
                }),
            }],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer();
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "GitHub Copilot 機能概要", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve, reject) => entry.server.close((error) => error ? reject(error) : resolve()));
                }
            },
        }),
    ],
});
