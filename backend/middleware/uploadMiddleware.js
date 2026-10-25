const multer = require("multer");
const crypto = require("crypto");
const cloudinary = require("../config/cloudinary");
const { HttpError } = require("../utils/http");

const multerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files allowed"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadToCloudinary = async (buffer, publicId) => {
  const base64String = buffer.toString("base64");
  const dataURI = "data:application/pdf;base64," + base64String;

  const result = await cloudinary.uploader.upload(dataURI, {
    folder: "jobverse-resumes",
    public_id: publicId,
    resource_type: "raw",
    overwrite: false,
  });

  return result;
};

const upload = {
  single: (fieldName) => {
    return (req, res, next) => {
      multerUpload.single(fieldName)(req, res, async (err) => {
        if (err) return next(err);
        if (!req.file) return next();

        try {
          const hash = crypto
            .createHash("sha256")
            .update(req.file.buffer)
            .digest("hex")
            .slice(0, 32);

          const result = await uploadToCloudinary(req.file.buffer, hash);

          req.file.filename = hash + ".pdf";
          req.file.path = result.secure_url;
          req.file.cloudinaryPublicId = result.public_id;

          next();
        } catch (cloudinaryErr) {
          console.error("Cloudinary upload error:", cloudinaryErr.message);
          next(new HttpError(502, "Could not upload your resume. Please try again."));
        }
      });
    };
  },
};

module.exports = upload;
