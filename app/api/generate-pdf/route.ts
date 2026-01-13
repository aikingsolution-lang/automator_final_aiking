import { NextResponse } from "next/server";

export const runtime = "nodejs"; // IMPORTANT for serverless on Vercel

export async function POST(req: Request) {
    try {
        const { html } = await req.json();

        if (!html || typeof html !== "string") {
            return NextResponse.json({ error: "Missing HTML" }, { status: 400 });
        }

        let browser;

        // Check if we're in local development or serverless (Vercel)
        const isLocalDev = process.env.NODE_ENV === "development" || !process.env.VERCEL;

        if (isLocalDev) {
            // Use regular puppeteer for local development
            const puppeteer = await import("puppeteer");
            browser = await puppeteer.default.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        } else {
            // Use @sparticuz/chromium for serverless (Vercel)
            const chromium = await import("@sparticuz/chromium");
            const puppeteerCore = await import("puppeteer-core");

            const executablePath = await chromium.default.executablePath();
            browser = await puppeteerCore.default.launch({
                args: chromium.default.args,
                executablePath,
                headless: true,
            });
        }

        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
        });

        await browser.close();

        const pdfArrayBuffer = pdfBuffer.buffer.slice(
            pdfBuffer.byteOffset,
            pdfBuffer.byteOffset + pdfBuffer.byteLength
        ) as ArrayBuffer;

        return new NextResponse(pdfArrayBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": 'attachment; filename="resume.pdf"',
            },
        });
    } catch (e) {
        console.error("PDF API error:", e);
        return NextResponse.json({ error: "Failed to generate PDF", details: String(e) }, { status: 500 });
    }
}
