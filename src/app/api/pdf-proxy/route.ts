import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// Demo proxy to avoid browser CORS issues when loading PDFs from external hosts.
export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
        return new Response("Missing `url` query param", { status: 400 });
    }

    // Basic allowlist for demo safety.
    // If you add more sources, extend this check intentionally.
    if (!url.startsWith("https://xiromed.com/")) {
        return new Response("URL not allowed for proxy", { status: 403 });
    }

    try {
        const upstream = await fetch(url, {
            method: "GET",
            redirect: "follow",
        });

        if (!upstream.ok) {
            return new Response(`Upstream fetch failed (${upstream.status})`, { status: 502 });
        }

        const arrayBuffer = await upstream.arrayBuffer();

        return new Response(arrayBuffer, {
            status: 200,
            headers: {
                "Content-Type": upstream.headers.get("content-type") ?? "application/pdf",
                "Cache-Control": "public, max-age=3600",
                // Not strictly needed for same-origin, but harmless.
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (e) {
        return new Response(`Proxy error: ${e instanceof Error ? e.message : "unknown"}`, { status: 500 });
    }
}

