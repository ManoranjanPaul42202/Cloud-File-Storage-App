export type PreviewKind =
  | "image"
  | "pdf"
  | "video"
  | "audio"
  | "iframe"
  | "office"
  | "none";

const ext = (fileName: string) => {
  const i = fileName.lastIndexOf(".");
  if (i < 0) return "";
  return fileName.slice(i + 1).toLowerCase();
};

export function getPreviewKind(fileName: string): PreviewKind {
  const e = ext(fileName);
  if (
    ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "jfif", "tif", "tiff"].includes(e)
  ) {
    return "image";
  }
  if (e === "pdf") return "pdf";
  if (["mp4", "webm", "ogv"].includes(e)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(e)) return "audio";
  if (["txt", "csv", "json", "html", "htm", "md", "xml"].includes(e)) {
    return "iframe";
  }
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(e)) {
    return "office";
  }
  return "none";
}

export function fileExtensionLabel(fileName: string): string {
  const e = ext(fileName);
  return e ? e.slice(0, 4) : "file";
}
