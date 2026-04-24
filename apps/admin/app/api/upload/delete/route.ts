/**
 * File Delete API Route
 * 
 * Deletes a file from Cloudflare R2 storage by its public URL.
 * Extracts the S3 object key from the URL and calls deleteFileFromR2.
 * 
 * @route POST /api/upload/delete
 * @module app/api/upload/delete/route
 */

import { NextResponse } from "next/server";
import { deleteFileFromR2 } from "@/lib/r2";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Extract R2 object key from the public URL
    // URL format: https://pub-xxx.r2.dev/products/12345-image.webp
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!publicUrl) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 500 });
    }

    const key = url.replace(`${publicUrl}/`, "");
    if (!key || key === url) {
      return NextResponse.json({ error: "Invalid R2 URL" }, { status: 400 });
    }

    await deleteFileFromR2(key);

    return NextResponse.json({ success: true, key });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
