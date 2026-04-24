/**
 * File Upload API Route
 * 
 * Handles multipart/form-data file uploads and stores them in Cloudflare R2.
 * Expected form fields:
 *   - file: The binary file to upload
 *   - folder: (optional) Logical folder name, defaults to "uploads"
 * 
 * Returns JSON: { success: true, data: { url, key } }
 * 
 * @route POST /api/upload
 * @module app/api/upload/route
 */

import { uploadFileToR2, generateR2Key } from "@/lib/r2";
import { apiSuccess, apiBadRequest, apiInternalError } from "@/lib/apiResponse";

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
    const buffer = Buffer.from(bytes);

    // Generate a unique, sanitized S3 key to prevent collisions
    const key = generateR2Key(folder, file.name);

    // Upload to R2 and get the public URL
    const url = await uploadFileToR2(buffer, key, file.type);

    return apiSuccess({ url, key }, { message: 'File uploaded successfully' });
  } catch (error) {
    console.error("Upload error:", error);
    return apiInternalError("Failed to upload file");
  }
}
