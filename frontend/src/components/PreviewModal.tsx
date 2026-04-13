import { useEffect, useState } from "react";
import { getPreviewKind } from "../utils/previewKind";

type PreviewModalProps = {
  open: boolean;
  fileName: string;
  url: string;
  expiresInSeconds: number;
  allowDownload?: boolean;
  allowCopyLink?: boolean;
  onClose: () => void;
};

export function PreviewModal({
  open,
  fileName,
  url,
  expiresInSeconds,
  allowDownload = true,
  allowCopyLink = true,
  onClose
}: PreviewModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(expiresInSeconds);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(expiresInSeconds);
    setMediaLoading(true);
    setMediaError(false);

    // Set a timeout to show error if loading takes too long
    const loadingTimeout = setTimeout(() => {
      if (mediaLoading) {
        setMediaLoading(false);
        setMediaError(true);
      }
    }, 5000); // 5 seconds timeout

    return () => clearTimeout(loadingTimeout);
  }, [open, url, expiresInSeconds]);

  useEffect(() => {
    if (!open || !url) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, url, expiresInSeconds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copyLink = () => {
    navigator.clipboard.writeText(url);
  };

  if (!open) return null;

  const kind = getPreviewKind(fileName);
  const activeUrl = secondsLeft > 0 ? url : "";
  const showLoading = secondsLeft > 0 && mediaLoading && !mediaError && kind === "image";

  const renderPreview = () => {
    if (secondsLeft === 0) {
      return <p className="expired">Preview disabled — link expired.</p>;
    }
    if (!activeUrl) {
      return <p>Preview not available.</p>;
    }
    if (mediaError && kind === "image") {
      return (
        <div className="preview-error">
          <p>Could not display this image in the preview.</p>
          <p className="preview-fallback" style={{ marginTop: 8 }}>
            Try &quot;Open in new tab&quot; — the signed link may be blocked by browser or bucket
            settings.
          </p>
        </div>
      );
    }
    if (kind === "image") {
      if (mediaLoading) {
        return <p>Loading image...</p>;
      }
      return (
        <img
          key={activeUrl}
          src={activeUrl}
          alt={fileName}
          className="preview-media"
          onLoad={() => {
            setMediaLoading(false);
            setMediaError(false);
          }}
          onError={() => {
            setMediaLoading(false);
            setMediaError(true);
          }}
        />
      );
    }
    if (kind === "video") {
      return <video src={activeUrl} controls className="preview-media" key={activeUrl} />;
    }
    if (kind === "audio") {
      return <audio src={activeUrl} controls className="preview-media-audio" key={activeUrl} />;
    }
    if (kind === "pdf") {
      return (
        <object
          key={activeUrl}
          data={activeUrl}
          type="application/pdf"
          className="preview-object"
        >
          <iframe title={fileName} src={activeUrl} className="preview-frame" />
        </object>
      );
    }
    if (kind === "iframe") {
      return (
        <iframe title={fileName} src={activeUrl} className="preview-frame" key={activeUrl} />
      );
    }
    if (kind === "office") {
      const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        activeUrl
      )}`;
      return <iframe title={fileName} src={officeUrl} className="preview-frame" key={officeUrl} />;
    }
    return (
      <p className="preview-fallback">
        No in-browser preview for this file type. Use <strong>Open in new tab</strong> or{" "}
        <strong>Download</strong> while the link is valid.
      </p>
    );
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h2>{fileName}</h2>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <p className="countdown">
          {secondsLeft > 0 ? (
            <>
              Secure link expires in <strong>{secondsLeft}</strong>s. After that, preview and
              download stop working until you generate a new link.
            </>
          ) : (
            <span className="expired-banner">
              Link expired. Close and choose <strong>Preview</strong> again.
            </span>
          )}
        </p>

        <div className="modal-toolbar">
          {secondsLeft > 0 ? (
            <>
              {allowDownload && (
                <a
                  className="btn-download"
                  href={url}
                  download={fileName}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>
              )}
              {allowCopyLink && (
                <button type="button" className="btn-copy-link" onClick={copyLink}>
                  Copy link
                </button>
              )}
            </>
          ) : (
            <span className="btn-download disabled">Download unavailable</span>
          )}
        </div>

        <div className={`preview-body ${secondsLeft === 0 ? "preview-expired" : ""}`}>
          {showLoading && (
            <div className="preview-loading">
              <div>
                <div className="spinner" aria-hidden />
                Loading preview…
              </div>
            </div>
          )}
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}
