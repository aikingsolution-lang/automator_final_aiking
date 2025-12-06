import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export const runtime = "nodejs"; // IMPORTANT for serverless on Vercel

export async function POST(req: Request) {
    try {
        const { html } = await req.json();

        if (!html || typeof html !== "string") {
            return NextResponse.json({ error: "Missing HTML" }, { status: 400 });
        }

        const executablePath = await chromium.executablePath();

        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath,
            headless: true,
        });

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
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
