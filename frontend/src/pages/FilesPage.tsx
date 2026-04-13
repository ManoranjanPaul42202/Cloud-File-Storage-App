import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { PreviewModal } from "../components/PreviewModal";
import { fileExtensionLabel } from "../utils/previewKind";

const VISIBILITY_OPTIONS = ["private", "shared", "public"] as const;
const PERMISSION_OPTIONS = ["view", "download"] as const;

type FileItem = {
  id: number;
  user_id: number;
  file_name: string;
  s3_key: string;
  file_size: number;
  visibility: "private" | "shared" | "public";
  shared_count?: number;
  owner_email?: string;
  permission?: string;
};

export function FilesPage() {
  const { api } = useAuth();
  const [me, setMe] = useState<{ id: number; name: string; email: string } | null>(null);
  const [view, setView] = useState<"mine" | "shared">("mine");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sharedFiles, setSharedFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState<typeof VISIBILITY_OPTIONS[number]>("private");
  const [renameDraftById] = useState<Record<number, string>>({});
  const [visibilityDraftById] = useState<Record<number, typeof VISIBILITY_OPTIONS[number]>>({});
  const [shareDraftById, setShareDraftById] = useState<Record<
    number,
    { sharedWithEmail: string; permission: typeof PERMISSION_OPTIONS[number]; revokeEmail: string }
  >>({});
  const [activeShareId, setActiveShareId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<{
    fileName: string;
    url: string;
    expiresInSeconds: number;
    allowDownload?: boolean;
    allowCopyLink?: boolean;
  } | null>(null);
  const [selectedActionById, setSelectedActionById] = useState<Record<number, string>>({});

  const handleFileAction = async (file: FileItem) => {
    const action = selectedActionById[file.id] || "preview";

    switch (action) {
      case "preview":
        await openPreview(file);
        break;
      case "toggleShare":
        setActiveShareId(activeShareId === file.id ? null : file.id);
        break;
      case "rename":
        await handleRename(file);
        break;
      case "visibility":
        await handleVisibilityChange(file);
        break;
      case "delete":
        await handleDelete(file);
        break;
      default:
        break;
    }

    setSelectedActionById((prev) => ({ ...prev, [file.id]: "preview" }));
  };

  const closePreview = () => setPreview(null);

  const loadFiles = useCallback(async () => {
    const res = await api.get("/files");
    setFiles(res.data);
  }, [api]);

  const loadSharedFiles = useCallback(async () => {
    const res = await api.get("/files/shared");
    setSharedFiles(res.data);
  }, [api]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setMe(res.data.user);
    } catch {
      setMe(null);
    }
  }, [api]);

  useEffect(() => {
    refreshUser();
    loadFiles().catch(() => setMessage("Could not load files."));
    loadSharedFiles().catch(() => {});
  }, [loadFiles, loadSharedFiles, refreshUser]);

  const totalBytes = useMemo(
    () => files.reduce((sum, f) => sum + (Number(f.file_size) || 0), 0),
    [files]
  );

  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
  };

  const clearMessage = () => setTimeout(() => setMessage(""), 5000);

  const handleUpload = async () => {
    setMessage("");
    if (!selectedFile) {
      setMessage("Choose a file first.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("visibility", uploadVisibility);
      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMessage(res.data.message);
      setSelectedFile(null);
      setUploadVisibility("private");
      await loadFiles();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(ax.response?.data?.message || ax.message || "Upload failed.");
    } finally {
      setUploading(false);
      clearMessage();
    }
  };

  const openPreview = async (file: FileItem) => {
    setMessage("");
    try {
      const res = await api.get(`/files/download?fileId=${file.id}`);
      setPreview({
        fileName: file.file_name,
        url: res.data.url,
        expiresInSeconds: Number(res.data.expiresInSeconds) || 300,
        allowDownload: !(file.visibility === "private" || file.permission === "view"),
        allowCopyLink: !(file.visibility === "private" || file.permission === "view")
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(ax.response?.data?.message || ax.message || "Could not open preview.");
      setPreview(null); // Close any existing preview modal
      clearMessage();
    }
  };

  const handleRename = async (file: FileItem) => {
    const name = (renameDraftById[file.id] || "").trim();
    if (!name) {
      setMessage("Enter a new file name.");
      clearMessage();
      return;
    }
    try {
      const res = await api.patch(`/files/${file.id}`, { file_name: name });
      setMessage(res.data.message);
      await loadFiles();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(ax.response?.data?.message || ax.message || "Rename failed.");
    } finally {
      clearMessage();
    }
  };

  const handleVisibilityChange = async (file: FileItem) => {
    const nextVisibility = visibilityDraftById[file.id] ?? file.visibility;
    if (nextVisibility === file.visibility) {
      setMessage("Choose a different visibility to update.");
      clearMessage();
      return;
    }
    try {
      const res = await api.patch(`/files/${file.id}/visibility`, {
        visibility: nextVisibility
      });
      setMessage(res.data.message);
      await loadFiles();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(ax.response?.data?.message || ax.message || "Visibility update failed.");
    } finally {
      clearMessage();
    }
  };

  const handleShare = async (file: FileItem) => {
    const draft = shareDraftById[file.id] || { sharedWithEmail: "", permission: "view", revokeEmail: "" };
    const email = draft.sharedWithEmail.trim();
    if (!email) {
      setMessage("Enter an email to share with.");
      clearMessage();
      return;
    }
    try {
      const res = await api.post(`/files/${file.id}/share`, {
        shared_with_email: email,
        permission: draft.permission
      });
      setMessage(res.data.message);
      await loadFiles();
      await loadSharedFiles();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(ax.response?.data?.message || ax.message || "Share failed.");
    } finally {
      clearMessage();
    }
  };

  const handleRevoke = async (file: FileItem) => {
    const draft = shareDraftById[file.id] || { sharedWithEmail: "", permission: "view", revokeEmail: "" };
    const email = draft.revokeEmail.trim();
    if (!email) {
      setMessage("Enter an email to revoke.");
      clearMessage();
      return;
    }
    try {
      const res = await api.delete(
        `/files/${file.id}/share?shared_with_email=${encodeURIComponent(email)}`
      );
      setMessage(res.data.message);
      await loadFiles();
      await loadSharedFiles();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(ax.response?.data?.message || ax.message || "Revoke failed.");
    } finally {
      clearMessage();
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!window.confirm("Delete this file permanently?")) return;
    try {
      const res = await api.delete(`/files/${file.id}`);
      setMessage(res.data.message);
      await loadFiles();
      await loadSharedFiles();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(ax.response?.data?.message || ax.message || "Delete failed.");
    } finally {
      clearMessage();
    }
  };

  const currentFiles = view === "mine" ? files : sharedFiles;

  return (
    <main className="container">
      <div className="dashboard-hero">
        <h1>
          {me?.name ? `Hello, ${me.name.split(" ")[0]}` : "Your workspace"}
        </h1>
        <p>
          Upload, preview, and manage file visibility and sharing settings in one place.
        </p>
        {me && (
          <div className="user-chip">
            <strong>{me.name}</strong>
            <span>{me.email}</span>
          </div>
        )}
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{files.length}</div>
          <div className="stat-label">Files stored</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatBytes(totalBytes)}</div>
          <div className="stat-label">Total size</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">AES-256</div>
          <div className="stat-label">Storage encryption (S3)</div>
        </div>
      </div>

      <section className="card-block">
        <h2>Upload</h2>
        <div className="upload-zone">
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <select
            value={uploadVisibility}
            onChange={(e) => setUploadVisibility(e.target.value as typeof uploadVisibility)}
          >
            {VISIBILITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-sm btn-accent"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload to cloud"}
          </button>
          <button
            type="button"
            className="btn-sm"
            onClick={() => {
              loadFiles();
              loadSharedFiles();
              setMessage("Library refreshed.");
              clearMessage();
            }}
          >
            Refresh
          </button>
        </div>
        {message && (
          <p className={
              message.toLowerCase().includes("fail") ||
              message.includes("Could not") ||
              message.includes("Choose")
                ? "message error"
                : "message"
            }
          >
            {message}
          </p>
        )}
      </section>

      <section className="card-block">
        <div className="section-header">
          <div>
            <h2>Files</h2>
            <p>
              {view === "mine"
                ? "Manage your library, sharing, and visibility."
                : "Files that have been shared with you."}
            </p>
          </div>
          <div className="tab-group">
            <button
              type="button"
              className={"tab" + (view === "mine" ? " active" : "")}
              onClick={() => setView("mine")}
            >
              My files
            </button>
            <button
              type="button"
              className={"tab" + (view === "shared" ? " active" : "")}
              onClick={() => setView("shared")}
            >
              Shared with me
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Size</th>
                {view === "mine" ? (
                  <>
                    <th>Visibility</th>
                    <th>Shared</th>
                    <th>Actions</th>
                  </>
                ) : (
                  <>
                    <th>Owner</th>
                    <th>Permission</th>
                    <th>Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {currentFiles.length === 0 ? (
                <tr>
                  <td colSpan={view === "mine" ? 5 : 5}>
                    <div className="empty-state">
                      <p>
                        {view === "mine"
                          ? "No files yet. Upload a document or image to see it listed here."
                          : "No shared files yet. Ask a teammate to share a file with you."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentFiles.map((file) => (
                  <tr key={file.id}>
                    <td>
                      <div className="file-cell">
                        <span className="file-icon" title={file.file_name}>
                          {fileExtensionLabel(file.file_name)}
                        </span>
                        <div className="file-meta">
                          <strong>{file.file_name}</strong>
                          <span>ID {file.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatBytes(file.file_size)}</td>
                    {view === "mine" ? (
                      <>
                        <td>
                          <span className={`visibility-pill visibility-${file.visibility}`}>
                            {file.visibility}
                          </span>
                        </td>
                        <td>{file.shared_count ?? 0}</td>
                        <td>
                          <div className="actions-grid">
                            <select
                              value={selectedActionById[file.id] ?? "preview"}
                              onChange={(e) =>
                                setSelectedActionById((prev) => ({
                                  ...prev,
                                  [file.id]: e.target.value
                                }))
                              }
                            >
                              <option value="">Select action</option>
                              <option value="preview">Preview</option>
                              <option value="toggleShare">
                                {activeShareId === file.id ? "Hide share" : "Share"}
                              </option>
                              <option value="rename">Rename</option>
                              <option value="visibility">Update visibility</option>
                              <option value="delete">Delete</option>
                            </select>
                            <button type="button" className="btn-sm btn-accent" onClick={() => handleFileAction(file)}>
                              Go
                            </button>
                          </div>
                          {activeShareId === file.id && (
                            <div className="share-panel">
                              <div className="share-row">
                                <input
                                  placeholder="Email to share"
                                  value={shareDraftById[file.id]?.sharedWithEmail ?? ""}
                                  onChange={(e) =>
                                    setShareDraftById((prev) => ({
                                      ...prev,
                                      [file.id]: {
                                        sharedWithEmail: e.target.value,
                                        permission: prev[file.id]?.permission ?? "view",
                                        revokeEmail: prev[file.id]?.revokeEmail ?? ""
                                      }
                                    }))
                                  }
                                />
                                <select
                                  value={shareDraftById[file.id]?.permission ?? "view"}
                                  onChange={(e) =>
                                    setShareDraftById((prev) => ({
                                      ...prev,
                                      [file.id]: {
                                        sharedWithEmail: prev[file.id]?.sharedWithEmail ?? "",
                                        permission: e.target.value as typeof PERMISSION_OPTIONS[number],
                                        revokeEmail: prev[file.id]?.revokeEmail ?? ""
                                      }
                                    }))
                                  }
                                >
                                  {PERMISSION_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="btn-sm btn-accent"
                                  onClick={() => handleShare(file)}
                                >
                                  Share
                                </button>
                              </div>
                              <div className="share-row">
                                <input
                                  placeholder="Email to revoke"
                                  value={shareDraftById[file.id]?.revokeEmail ?? ""}
                                  onChange={(e) =>
                                    setShareDraftById((prev) => ({
                                      ...prev,
                                      [file.id]: {
                                        sharedWithEmail: prev[file.id]?.sharedWithEmail ?? "",
                                        permission: prev[file.id]?.permission ?? "view",
                                        revokeEmail: e.target.value
                                      }
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  className="btn-sm btn-danger"
                                  onClick={() => handleRevoke(file)}
                                >
                                  Revoke
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{file.owner_email || "Unknown"}</td>
                        <td>{file.permission || "view"}</td>
                        <td>
                          <div className="actions-cell">
                            <button type="button" className="btn-sm btn-accent" onClick={() => openPreview(file)}>
                              Preview
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {preview && (
        <PreviewModal
          open
          fileName={preview.fileName}
          url={preview.url}
          expiresInSeconds={preview.expiresInSeconds}
          allowDownload={preview.allowDownload}
          allowCopyLink={preview.allowCopyLink}
          onClose={closePreview}
        />
      )}
    </main>
  );
}
