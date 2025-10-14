import { useRef, useState } from "react";
import { UploadsAPI } from "../../lib/api";

/**
 * Drag–drop multi-image uploader.
 * Expects backend route: POST /api/uploads (FormData "files") -> { ok:true, urls:[...] }
 * value: [{ url, alt, isPrimary, sortOrder }]; onChange(nextArray)
 */
export default function ImageUploader({ value = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const { ok, data } = await UploadsAPI.uploadFiles(files);
      if (!ok || !data?.urls) throw new Error(data?.message || "Upload failed");
      const base = value?.length || 0;
      const urls = data.urls.map((url, i) => ({
        url,
        alt: "",
        isPrimary: false,
        sortOrder: base + i,
      }));
      onChange([...(value || []), ...urls]);
    } catch (e) {
      setError(e.message || "Upload error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const markPrimary = (idx) => {
    const next = (value || []).map((img, i) => ({ ...img, isPrimary: i === idx }));
    onChange(next);
  };

  const removeAt = (idx) => {
    const next = [...(value || [])];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Images</label>

      <div
        className="border-2 border-dashed rounded p-4 text-center cursor-pointer bg-white"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        {uploading ? "Uploading…" : "Drag & drop images here, or click to select (PNG/JPG/WEBP, ≤3MB)"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <div className="text-rose-600 text-sm mt-2">{error}</div>}

      {!!(value?.length) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {value.map((img, idx) => (
            <div key={idx} className="border rounded p-2 bg-white">
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={img.url} className="w-full h-32 object-cover rounded" />
              <div className="flex justify-between items-center mt-2 text-sm">
                <button
                  className={`px-2 py-1 rounded ${img.isPrimary ? "bg-emerald-600 text-white" : "border"}`}
                  onClick={() => markPrimary(idx)}
                >
                  {img.isPrimary ? "Primary" : "Make Primary"}
                </button>
                <button className="px-2 py-1 rounded border" onClick={() => removeAt(idx)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


