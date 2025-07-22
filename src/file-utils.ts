const extractFilename = (headers) => {
  const contentDisposition = headers['content-disposition'];
  if (contentDisposition) {
    const matches = contentDisposition.match(/filename[*]?=['"]?([^'";\r\n]+)['"]?/);
    return matches ? decodeURIComponent(matches[1]) : 'download';
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
