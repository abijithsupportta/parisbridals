/**
 * File Delete API Route
 * 
 * Deletes a file from Cloudflare R2 storage by its public URL.
 * Extracts the S3 object key from the URL and calls deleteFileFromR2.
 * 
 * @route POST /api/upload/delete
 * @module app/api/upload/delete/route
 */

import { deleteFileFromR2 } from "@/lib/r2";
import { apiSuccess, apiBadRequest, apiInternalError } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return apiBadRequest("No URL provided");
    }

    // Extract R2 object key from the public URL
    // URL format: https://pub-xxx.r2.dev/products/12345-image.webp
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!publicUrl) {
      return apiInternalError("R2 not configured");
    }

    const key = url.replace(`${publicUrl}/`, "");
    if (!key || key === url) {
      return apiBadRequest("Invalid R2 URL");
    }

    await deleteFileFromR2(key);

    return apiSuccess({ key }, { message: 'File deleted successfully' });
  } catch (error) {
    console.error("Delete file error:", error);
    return apiInternalError("Failed to delete file");
  }
}
