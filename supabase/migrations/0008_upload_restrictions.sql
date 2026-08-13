-- Server-side upload caps: the client checks these too, but only Storage-level
-- config actually stops a direct API call that skips the UI.
update storage.buckets
set file_size_limit = 52428800, -- 50 MB, matches uploader.tsx's MAX_BYTES
    allowed_mime_types = array[
      'application/pdf',
      'text/plain',
      'text/markdown',
      'image/webp' -- figures.ts uploads rasterized figures back into this bucket
    ]
where id = 'session-files';
