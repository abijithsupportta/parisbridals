/**
 * File Upload API Route
 *
 * Handles multipart/form-data file uploads and stores them in Cloudflare R2.
 * Expected form fields:
 *   - file: The binary file to upload
 *   - folder: (optional) Logical folder name, defaults to "uploads"
 * Returns JSON: { success: true, data: { url, key } }
 *   - url: Publicly accessible URL of the uploaded file
 *   - key: S3 object key for future reference (e.g., deletion)
 *
 * HEIC/HEIF files are automatically converted to JPEG for web compatibility.
 *
 * @route POST /api/upload
 * @module app/api/upload/route
 */

import { uploadFileToR2, generateR2Key } from "@/lib/r2";
import { apiSuccess, apiBadRequest, apiInternalError } from "@/lib/apiResponse";
// @ts-ignore - no types available for heic-convert
import convert from "heic-convert";

function isHeicFile(file: File): boolean {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  return (
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    fileName.endsWith(".heic") ||
    fileName.endsWith(".heif")
  );
}

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  try {
    const result = await convert({
      buffer: buffer as any,
      format: "JPEG",
      quality: 0.8,
    });
    return Buffer.from(result as any);
  } catch (error) {
    console.error("HEIC conversion error:", error);
    throw new Error("Failed to convert HEIC file to JPEG");
  }
}
export async function POST(request: Request) {
  try {
    // Parse the multipart form data from the incoming request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";

    if (!file) {
      return apiBadRequest("No file provided");
    }

    // Convert browser File to Node.js Buffer for S3 upload
    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);
    let fileName = file.name;
    let mimeType = file.type;

    // Convert HEIC/HEIF to JPEG
    if (isHeicFile(file)) {
      try {
        buffer = await convertHeicToJpeg(buffer as any) as any;
        // Change file extension to .jpg
        fileName = fileName.replace(/\.(heic|heif)$/i, ".jpg");
        mimeType = "image/jpeg";
      } catch (error) {
        console.error("HEIC conversion failed, uploading original:", error);
        // Continue with original file if conversion fails
      }
    }

    // Generate a unique, sanitized S3 key to prevent collisions
    const key = generateR2Key(folder, fileName);

    // Upload to R2 and get the public URL
    const url = await uploadFileToR2(buffer, key, mimeType);

    return apiSuccess({ url, key }, { message: 'File uploaded successfully' });
  } catch (error) {
    console.error("Upload error:", error);
    return apiInternalError("Failed to upload file");
  }
}
