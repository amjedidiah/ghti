"use client";

import { COMPRESS_ABOVE_BYTES, scaledDimensions } from "@/lib/files";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

/**
 * Shrink a large phone photo before upload: longest side 2000px, JPEG at 82%.
 * Keeps the original if it is small, not an image, or would not get smaller.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= COMPRESS_ABOVE_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const { width, height } = scaledDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    // White background, so transparent PNGs do not turn black as JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file;
    const name = `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file; // Older browsers: upload as is; the size check still applies.
  }
}

export class UploadError extends Error {}

/**
 * Upload straight to the private `documents` bucket as the signed-in user
 * (storage RLS decides), reporting progress from 0 to 1.
 */
export async function uploadWithProgress({
  path,
  file,
  onProgress,
}: {
  path: string;
  file: File;
  onProgress: (fraction: number) => void;
}): Promise<void> {
  const { data } = await createClient().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new UploadError("Your session has ended. Sign in again, then retry.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${getSupabaseUrl()}/storage/v1/object/documents/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", getSupabasePublishableKey());
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      if (xhr.status === 413) return reject(new UploadError("That file is over the 5 MB limit."));
      if (xhr.status === 401 || xhr.status === 403) {
        return reject(
          new UploadError(
            "We could not upload to your application. Refresh the page and try again.",
          ),
        );
      }
      reject(new UploadError("The upload failed. Check your connection and try again."));
    };
    xhr.onerror = () =>
      reject(new UploadError("The upload failed. Check your connection and try again."));
    xhr.send(file);
  });
}
