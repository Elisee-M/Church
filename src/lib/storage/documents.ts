"use client";

import { createClient } from "@/lib/supabase/client";

export type UploadResult = { path: string; bucket: string };

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadDocument(opts: {
  bucket: string;
  path: string;
  file: File;
}): Promise<UploadResult> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(opts.bucket).upload(opts.path, opts.file, {
    upsert: true,
    contentType: opts.file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return { path: opts.path, bucket: opts.bucket };
}

export async function getSignedDocumentUrl(bucket: string, path: string, expiresIn = 3600) {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export function buildDocumentPath(parts: string[], fileName: string) {
  const clean = parts.filter(Boolean).map((p) => p.replace(/^\/+|\/+$/g, ""));
  return [...clean, `${Date.now()}-${sanitizeFileName(fileName)}`].join("/");
}
