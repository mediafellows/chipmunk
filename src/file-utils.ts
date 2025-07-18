const extractFilename = (headers) => {
  const contentDisposition = headers['content-disposition'];
  if (contentDisposition) {
    const matches = contentDisposition.match(/filename="?([^"]+)"?/);
    return matches ? matches[1] : 'download';
  }
  return 'download';
};

export const hasFileInBody = (body) => {
  if (!body) return false;
  
  // Check if body contains File, Blob, or FileList objects
  return Object.values(body).some(value => 
    value instanceof File || 
    value instanceof Blob || 
    value instanceof FileList ||
    (Array.isArray(value) && value.some(v => v instanceof File || v instanceof Blob))
  );
};

export const handleFileUpload = (req, body) => {
  // Handle regular objects (your existing code)
  if (body) {
    Object.keys(body).forEach(key => {
      const value = body[key];
      
      if (value instanceof File || value instanceof Blob) {
        req.attach(key, value);
      } else if (value instanceof FileList) {
        Array.from(value).forEach((file, index) => {
          req.attach(`${key}_${index}`, file);
        });
      } else if (Array.isArray(value) && value.some(v => v instanceof File || v instanceof Blob)) {
        value.forEach((file, index) => {
          if (file instanceof File || file instanceof Blob) {
            req.attach(`${key}_${index}`, file);
          } else {
            req.field(key, file);
          }
        });
      } else {
        req.field(key, value);
      }
    });
  }

  return req;
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