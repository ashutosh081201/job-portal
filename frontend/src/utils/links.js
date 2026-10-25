// prepend https:// if missing
export const normalizeUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
};

// extract just the username from full LinkedIn URL or bare username
export const extractLinkedInUsername = (value) => {
  if (!value) return "";
  let v = value.trim();
  v = v.replace(/^https?:\/\//, "");
  v = v.replace(/^www\./, "");
  v = v.replace(/^linkedin\.com\/(in\/)?/, "");
  v = v.replace(/\/$/, "");
  return v;
};

// extract just the username from full GitHub URL or bare username
export const extractGithubUsername = (value) => {
  if (!value) return "";
  let v = value.trim();
  v = v.replace(/^https?:\/\//, "");
  v = v.replace(/^www\./, "");
  v = v.replace(/^github\.com\//, "");
  v = v.replace(/\/$/, "");
  return v;
};
