const extractFilename = (headers) => {
  const contentDisposition = headers['content-disposition'];
  if (contentDisposition) {
    const matches = contentDisposition.match(/filename="?([^"]+)"?/);
    return matches ? matches[1] : 'download';
  }
  return 'download';
};

export const isDownloadFileRequest = (headers) => {
  return headers['content-disposition'] || 
    headers['content-type']?.includes('application/octet-stream') ||
    headers['content-type']?.includes('application/pdf') ||
    headers['content-type']?.includes('application/zip');
} 

export const handleFileDonwload = (headers, body) => {
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