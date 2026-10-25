export const getPDFViewerUrl = (pdfUrl) => {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
};
