const extractFilename = (headers) => {
  const contentDisposition = headers['content-disposition'];
  if (contentDisposition) {
    const matches = contentDisposition.match(/filename="?([^"]+)"?/);
    return matches ? matches[1] : 'download';
  }
  return 'download';
};

export const isDownloadFileRequest = (headers) => {
 const contentType = headers['content-type'] || '';
 return headers['content-disposition'] || 
   contentType.includes('application/octet-stream') ||
   contentType.includes('application/pdf') ||
   contentType.includes('application/zip') ||
   (contentType.startsWith('application/') && !contentType.includes('json'));
};

export const handleFileDownload = (headers, body) => {
  const blob = new Blob([body]);
  const url = window.URL.createObjectURL(blob);
  const filename = extractFilename(headers) || 'download';

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return {
    objects: [],
    object: null,
    headers: headers,
    type: 'download'
  };
}
