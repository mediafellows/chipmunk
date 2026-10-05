const extractFilename = (headers) => {
  const contentDisposition = headers['content-disposition'];
  if (contentDisposition) {
    // RFC 5987's UTF-8 filename takes precedence over the ASCII fallback.
    const extended = contentDisposition.match(/(?:^|;)\s*filename\*\s*=\s*(?:"([^"]*)"|([^;]*))/i);
    const encoded = (extended?.[1] || extended?.[2] || "").trim();
    if (/^UTF-8'[^']*'/i.test(encoded)) {
      try {
        const filename = decodeURIComponent(encoded.replace(/^UTF-8'[^']*'/i, ""));
        if (filename) return filename.split(/[\\/]/).pop();
      } catch { /* A malformed extended filename may still have a valid fallback. */ }
    }
    const plain = contentDisposition.match(/(?:^|;)\s*filename\s*=\s*(?:"((?:\\.|[^"])*)"|([^;]*))/i);
    const filename = (plain?.[1] || plain?.[2] || "").replace(/\\(.)/g, "$1").trim();
    if (filename) return filename.split(/[\\/]/).pop();
  }

  // Fallback based on content-type if no content-disposition
  const contentType = headers['content-type'] || '';
  if (contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
    return 'download.xlsx';
  } else if (contentType.includes('application/pdf')) {
    return 'download.pdf';
  } else if (contentType.includes('application/zip')) {
    return 'download.zip';
  }

  return 'download';
};

export const isDownloadFileRequest = (headers) => {
  return Boolean(headers['content-disposition'] ||
    headers['content-type']?.includes('application/octet-stream') ||
    headers['content-type']?.includes('application/pdf') ||
    headers['content-type']?.includes('application/zip') ||
    headers['content-type']?.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
} 

export const handleFileDownload = (headers, body) => {
  const blob = body instanceof Blob ? body : new Blob([body], { type: headers['content-type'] || 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const filename = extractFilename(headers) || 'download';
  let a: HTMLAnchorElement;
  try {
    a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
  } finally {
    try { a?.parentNode?.removeChild(a); }
    finally { window.URL.revokeObjectURL(url); }
  }
  return {
    objects: [],
    object: null,
    headers: headers,
    type: 'download'
  };
}
