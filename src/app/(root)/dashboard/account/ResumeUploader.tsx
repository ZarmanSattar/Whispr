"use client";

import { useState, useEffect, useRef } from "react";

interface ResumeStatus {
  hasResume: boolean;
  charCount: number;
}

export default function ResumeUploader() {
  const [status, setStatus] = useState<ResumeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/resume/status")
      .then((r) => r.json())
      .then((data: ResumeStatus) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setStatus({ hasResume: false, charCount: 0 });
        setLoading(false);
      });
  }, []);

  const validateAndSetFile = (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      setUploadError("Only PDF and DOCX files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be under 5MB.");
      return;
    }
    setUploadError("");
    setSelectedFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("resume", selectedFile);
      const res = await fetch("/api/resume", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed.");
        return;
      }
      setStatus({ hasResume: true, charCount: data.charCount });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await fetch("/api/resume", { method: "DELETE" });
      setStatus({ hasResume: false, charCount: 0 });
      setConfirmRemove(false);
    } catch {
      // silently reset
    } finally {
      setRemoving(false);
    }
  };

  const handleReplace = () => {
    setStatus({ hasResume: false, charCount: 0 });
    setSelectedFile(null);
    setUploadError("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-playfair text-xl font-bold text-[#f0ede8] border-l-2 border-[#d4a03a] pl-3">
          Resume
        </h2>
      </div>

      {loading ? (
        <p className="text-sm text-[#7a7870]">Loading...</p>
      ) : status?.hasResume ? (
        /* Uploaded state */
        <div className="bg-[#111114] border border-white/[0.06] p-5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              {/* Document with checkmark */}
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 fill-none stroke-[#d4a03a] stroke-[1.5]"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <polyline points="9 15 11 17 15 13" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#f0ede8]">
                Resume on file
              </div>
              <div className="text-xs text-[#7a7870] mt-0.5">
                {status.charCount} characters indexed
              </div>

              {confirmRemove ? (
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs text-[#7a7870]">Are you sure?</span>
                  <button
                    onClick={handleRemove}
                    disabled={removing}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmRemove(false)}
                    className="text-xs text-[#7a7870] hover:text-[#f0ede8] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={handleReplace}
                    className="text-xs tracking-[0.08em] uppercase text-[#7a7870] hover:text-[#f0ede8] border border-white/[0.08] hover:border-white/20 px-4 py-1.5 transition-all"
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => setConfirmRemove(true)}
                    className="text-xs tracking-[0.08em] uppercase text-red-400/70 hover:text-red-400 border border-red-900/30 hover:border-red-900/60 px-4 py-1.5 transition-all"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Upload zone */
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-[#111114] border border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-[#d4a03a]" : "border-white/[0.12]"
            }`}
          >
            {/* Amber document icon */}
            <div className="flex justify-center mb-4">
              <svg
                viewBox="0 0 24 24"
                className="w-8 h-8 fill-none stroke-[#d4a03a] stroke-[1.5]"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>

            {selectedFile ? (
              <div>
                <div className="text-sm font-medium text-[#f0ede8] mb-1">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-[#7a7870] mb-4">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </div>
                {uploading ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-[#d4a03a]/30 border-t-[#d4a03a] rounded-full animate-spin" />
                    <span className="text-xs text-[#7a7870]">
                      Reading your resume...
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={handleUpload}
                      className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-6 py-2.5 hover:bg-[#f0c060] transition-all"
                    >
                      Upload
                    </button>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="text-xs tracking-[0.08em] uppercase text-[#7a7870] hover:text-[#f0ede8] border border-white/[0.08] px-4 py-2.5 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-[#f0ede8] mb-2">
                  Upload your Resume or CV
                </div>
                <div className="text-xs text-[#7a7870] mb-6 max-w-xs mx-auto leading-relaxed">
                  PDF or DOCX -- max 5MB. Whispr reads your background to
                  personalize your interview questions.
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.1em] uppercase px-6 py-2.5 hover:bg-[#f0c060] transition-all"
                >
                  Choose File
                </button>
              </div>
            )}
          </div>

          {uploadError && (
            <p className="text-xs text-red-400 mt-2">{uploadError}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      )}
    </div>
  );
}
