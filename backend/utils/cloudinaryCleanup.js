const Application = require("../models/Application");
const cloudinary = require("../config/cloudinary");

// Deletes an uploaded resume PDF from Cloudinary once no application points at
// it any more. Uploads are content-hashed, so one file can back several applications.
const cleanupCloudinaryFile = async (resumeUrl) => {
  try {
    if (!resumeUrl) return;
    if (!resumeUrl.includes("cloudinary.com")) return;
    if (!resumeUrl.includes("/raw/upload/")) return;
    const stillReferenced = await Application.findOne({ resumeUrl });
    if (stillReferenced) return;
    const uploadIndex = resumeUrl.indexOf("/upload/");
    const afterUpload = resumeUrl.slice(uploadIndex + 8);
    const withoutVersion = afterUpload.replace(/^v\d+\//, "");
    const publicId = withoutVersion.replace(/\.[^/.]+$/, "");
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  } catch (err) {
    console.log("Cloudinary cleanup failed for", resumeUrl, "-", err.message);
  }
};

module.exports = cleanupCloudinaryFile;
