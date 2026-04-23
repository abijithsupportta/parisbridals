/**
 * File Upload API Route
 * 
 * Handles multipart/form-data file uploads and stores them in Cloudflare R2.
 * Expected form fields:
 *   - file: The binary file to upload
 *   - folder: (optional) Logical folder name, defaults to "uploads"
 * 
 * Returns JSON: { url: string, key: string }
 *   - url: Publicly accessible URL of the uploaded file
 *   - key: S3 object key for future reference (e.g., deletion)
 * 
 * @route POST /api/upload
 * @module app/api/upload/route
 */

import { NextResponse } from "next/server";
import { uploadFileToR2, generateR2Key } from "@/lib/r2";

export async function POST(request: Request) {
  try {
    // Parse the multipart form data from the incoming request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert browser File to Node.js Buffer for S3 upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate a unique, sanitized S3 key to prevent collisions
    const key = generateR2Key(folder, file.name);

    // Upload to R2 and get the public URL
    const url = await uploadFileToR2(buffer, key, file.type);

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
