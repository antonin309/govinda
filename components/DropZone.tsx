"use client";

import { useState, useRef } from "react";

interface DropZoneProps {
  type: "music" | "stock" | "endscreen" | "ad" | "saveitnow" | "cta";
  accept: string;
  label: string;
  onUploaded: () => void;
}

export default function DropZone({ type, accept, label, onUploaded }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.size > 0 && f.name !== ".DS_Store");
    if (!arr.length) return;
    setUploading(true);
    setStatus("");

    const fd = new FormData();
    fd.append("type", type);
    arr.forEach(f => fd.append("files", f));

    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      setStatus(`✓ ${data.saved.length} file${data.saved.length !== 1 ? "s" : ""} uploaded`);
      onUploaded();
    } catch {
      setStatus("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-[#7c3aed] bg-[#7c3aed]/10"
            : "border-[#2a2a2a] hover:border-[#444] bg-[#111]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={type !== "endscreen" && type !== "cta"}
          accept={accept}
          className="hidden"
          onChange={e => e.target.files && upload(e.target.files)}
        />
        <div className="text-2xl mb-2">{uploading ? "⏳" : "📂"}</div>
        <div className="text-[#777]" style={{ fontSize: 13 }}>
          {uploading ? "Uploading…" : label}
        </div>
        <div className="text-[#555] mt-1" style={{ fontSize: 12 }}>Drag & drop or click</div>
        {status && <div className="mt-2 text-green-400" style={{ fontSize: 12 }}>{status}</div>}
      </div>

      {type === "stock" && (
        <>
          <input
            ref={folderRef}
            type="file"
            // @ts-ignore
            webkitdirectory=""
            multiple
            className="hidden"
            onChange={e => e.target.files && upload(e.target.files)}
          />
          <button
            onClick={() => folderRef.current?.click()}
            className="w-full py-2 border border-[#222] rounded-xl text-[#555] hover:border-[#444] hover:text-[#aaa] transition-colors"
            style={{ fontSize: 12 }}
          >
            📁 Upload entire folder
          </button>
        </>
      )}
    </div>
  );
}
