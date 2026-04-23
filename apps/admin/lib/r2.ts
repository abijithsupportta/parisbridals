/**
 * Cloudflare R2 Storage Utility
 * 
 * Provides S3-compatible storage operations for image/file uploads.
 * R2 is Cloudflare's S3-compatible object storage with zero egress fees.
 * 
 * Environment Variables Required:
 * - R2_ENDPOINT: S3 API endpoint (e.g., https://<account>.r2.cloudflarestorage.com)
 * - R2_ACCESS_KEY_ID: R2 access key
 * - R2_SECRET_ACCESS_KEY: R2 secret key
 * - R2_BUCKET_NAME: Bucket name (default: praisbridals)
 * - R2_PUBLIC_URL: Public CDN/dev URL for serving uploaded files
 * - R2_ACCOUNT_ID: Cloudflare account ID
 * 
 * @module lib/r2
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Resolves R2 configuration from environment variables.
 * All R2_* variables are required. Throws a descriptive error if any are missing.
 * Called lazily on first operation so module import doesn't fail if env is not ready.
 *
 * @returns Validated R2 configuration object
 * @throws Error listing any missing environment variables
 */
function getR2Config() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  const missing: string[] = [];
  if (!endpoint) missing.push("R2_ENDPOINT");
  if (!accessKeyId) missing.push("R2_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("R2_SECRET_ACCESS_KEY");
  if (!bucketName) missing.push("R2_BUCKET_NAME");
  if (!publicUrl) missing.push("R2_PUBLIC_URL");

  if (missing.length > 0) {
    throw new Error(
      `Missing R2 environment variables: ${missing.join(", ")}. ` +
      `Add them to .env.local and restart the dev server.`
    );
  }

  return {
    endpoint: endpoint as string,
    accessKeyId: accessKeyId as string,
    secretAccessKey: secretAccessKey as string,
    bucketName: bucketName as string,
    publicUrl: publicUrl as string,
  };
}

// Cache the S3 client across invocations (module-level singleton)
let _r2Client: S3Client | null = null;

/**
 * Returns a lazily-initialized S3 client configured for Cloudflare R2.
 * Region is "auto" because R2 does not use AWS regions.
 */
function getR2Client(): S3Client {
  if (_r2Client) return _r2Client;
  const cfg = getR2Config();
  _r2Client = new S3Client({
    region: "auto",
    endpoint: cfg.endpoint,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
  return _r2Client;
}

/**
 * Uploads a file buffer to R2 storage.
 *
 * @param file - The file content as a Node.js Buffer
 * @param key - The S3 object key (path within bucket, e.g., "categories/12345-image.jpg")
 * @param contentType - MIME type of the file (e.g., "image/jpeg")
 * @returns The publicly accessible URL of the uploaded file
 * @throws Error if the upload fails or env vars are missing
 */
export async function uploadFileToR2(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const cfg = getR2Config();
  const client = getR2Client();

  const command = new PutObjectCommand({
    Bucket: cfg.bucketName,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await client.send(command);

  return `${cfg.publicUrl}/${key}`;
}

/**
 * Deletes a file from R2 storage by its object key.
 *
 * @param key - The S3 object key to delete
 * @throws Error if the deletion fails or env vars are missing
 */
export async function deleteFileFromR2(key: string): Promise<void> {
  const cfg = getR2Config();
  const client = getR2Client();

  const command = new DeleteObjectCommand({
    Bucket: cfg.bucketName,
    Key: key,
  });

  await client.send(command);
}

/**
 * Generates a unique S3 object key for file upload.
 * Prepends a timestamp to avoid filename collisions and sanitizes
 * the original filename to remove unsafe characters.
 * 
 * @param folder - The logical folder/category (e.g., "categories", "products", "banners")
 * @param filename - Original filename from the user's upload
 * @returns A safe, unique S3 key like "categories/1713829200000-product.jpg"
 */
export function generateR2Key(folder: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${folder}/${timestamp}-${sanitizedFilename}`;
}
