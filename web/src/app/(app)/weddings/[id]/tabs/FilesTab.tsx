"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  Document,
  deleteDocument,
  listWeddingDocuments,
  uploadWeddingDocument,
} from "@/lib/api";
import { documentTypeLabel, formatDate, formatFileSize } from "@/lib/format";
import SectionHeading from "@/components/SectionHeading";
import Badge from "@/components/Badge";
import DeleteButton from "@/components/DeleteButton";
import { cardClass, documentTypeTone } from "@/lib/ui";

const linkWine = "text-xs font-medium text-wine-500 hover:text-wine-600 hover:underline";

export default function FilesTab({
  weddingId,
  isOwner,
}: {
  weddingId: string;
  isOwner: boolean;
}) {
  const [documents, setDocuments] = useState<Document[] | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refreshDocuments() {
    try {
      const data = await listWeddingDocuments(weddingId);
      setDocuments(data);
      setDocumentError(null);
    } catch (err) {
      setDocumentError(err instanceof ApiError ? err.message : "Failed to load documents");
    }
  }

  useEffect(() => {
    refreshDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingId]);

  async function handleUploadFile(file: File) {
    setUploading(true);
    setUploadProgress(0);
    setDocumentError(null);
    try {
      await uploadWeddingDocument(weddingId, file, setUploadProgress);
      await refreshDocuments();
    } catch (err) {
      setDocumentError(err instanceof ApiError ? err.message : "Failed to upload file");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUploadFile(file);
  }

  async function handleDeleteDocument(documentId: string) {
    try {
      await deleteDocument(documentId);
      await refreshDocuments();
    } catch (err) {
      setDocumentError(err instanceof ApiError ? err.message : "Failed to delete document");
    }
  }

  return (
    <section className={cardClass}>
      <SectionHeading>Documents</SectionHeading>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`mb-4 cursor-pointer rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragActive
            ? "border-wine-400 bg-wine-50"
            : "border-gold-200 bg-ivory-100/60 hover:border-gold-300"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.txt,.csv"
        />
        {uploading ? (
          <div className="space-y-2">
            <p className="text-sm text-plum-600">Uploading... {uploadProgress}%</p>
            <div className="mx-auto h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gold-100">
              <div
                className="h-full bg-wine-500 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-plum-400">
            <span className="font-medium text-wine-500">Click to upload</span> or drag and drop
            a file here — PDFs, images, and common document formats, up to 10MB.
          </p>
        )}
      </div>

      {documentError && <p className="mb-3 text-sm text-rose-700">{documentError}</p>}

      {documents && documents.length === 0 && (
        <p className="rounded-lg border border-gold-100 px-3 py-6 text-center text-sm text-plum-400">
          No documents yet.
        </p>
      )}

      {documents && documents.length > 0 && (
        <>
          {/* Mobile: stacked cards. */}
          <div className="space-y-3 sm:hidden">
            {documents.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-gold-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="break-all font-medium text-plum">{doc.fileName}</p>
                  <Badge tone={documentTypeTone(doc.fileType)}>
                    {documentTypeLabel(doc.fileType)}
                  </Badge>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-plum-400">
                  <span>{formatFileSize(doc.fileSizeBytes)}</span>
                  <span>Uploaded by {doc.uploadedBy.name}</span>
                  <span>{formatDate(doc.uploadedAt)}</span>
                </div>
                <div className="mt-2.5 flex items-center gap-4">
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className={linkWine}>
                    View / Download
                  </a>
                  {isOwner && <DeleteButton onDelete={() => handleDeleteDocument(doc.id)} />}
                </div>
              </div>
            ))}
          </div>

          {/* Tablet and up: full table. */}
          <div className="hidden overflow-x-auto rounded-lg border border-gold-100 sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory-100 text-xs uppercase tracking-wide text-plum-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Size</th>
                  <th className="px-3 py-2 font-medium">Uploaded by</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-3 py-2 font-medium text-plum">{doc.fileName}</td>
                    <td className="px-3 py-2">
                      <Badge tone={documentTypeTone(doc.fileType)}>
                        {documentTypeLabel(doc.fileType)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-plum-600">
                      {formatFileSize(doc.fileSizeBytes)}
                    </td>
                    <td className="px-3 py-2 text-plum-600">{doc.uploadedBy.name}</td>
                    <td className="px-3 py-2 text-plum-400">{formatDate(doc.uploadedAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkWine}
                        >
                          View
                        </a>
                        {isOwner && (
                          <DeleteButton onDelete={() => handleDeleteDocument(doc.id)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
