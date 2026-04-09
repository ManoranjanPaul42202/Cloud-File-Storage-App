const express = require("express");
const router = express.Router();
const multer = require("multer");
const fileController = require("../controllers/fileController");
const authMiddleware = require("../middlewares/authMiddleware");

const upload = multer({ dest: "uploads/" });

router.use(authMiddleware);
router.get("/download", fileController.getDownloadUrl);
router.post("/upload", upload.single("file"), fileController.uploadFile);
router.get("/", fileController.getFiles);
router.get("/:id", fileController.getFileById);
router.patch("/:id", fileController.renameFile);
router.delete("/:id", fileController.deleteFile);

module.exports = router;
