"use client";
/**
 * MediaUploader — Drag & drop file uploader with auto-crop.
 * Uses @dnd-kit for drag & drop and react-image-crop for cropping.
 * Use this component everywhere image/video uploading is required in admin.
 */
import React, { useState, useRef, useCallback } from "react";
import { DndContext, DragEndEvent, useDroppable } from "@dnd-kit/core";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./MediaUploader.module.css";

export interface UploadedFile {
  id:           string;
  url:          string;
  filename:     string;
  originalName: string;
  mimeType:     string;
  sizeBytes:    number;
  width?:       number;
  height?:      number;
}

interface MediaUploaderProps {
  accept?:       string[];   // ["image/jpeg","image/png"] | ["video/mp4"]
  maxSizeMb?:    number;     // Default 10
  maxFiles?:     number;     // Default 1
  aspectRatio?:  number;     // If set, shows crop UI (e.g. 16/9, 1, 4/3)
  recommendedDimensions?: { width: number; height: number; label: string };
  folder?:       string;
  multiple?:     boolean;
  onUpload:      (files: UploadedFile[]) => void;
  disabled?:     boolean;
  className?:    string;
}

function DropZone({ onDrop, children, disabled }: { onDrop: (files: File[]) => void; children: React.ReactNode; disabled?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "media-drop" });
  const [dragging, setDragging] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!disabled) setDragging(true);
  }
  function handleDragLeave() { setDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onDrop(files);
  }

  return (
    <div
      ref={setNodeRef}
      className={[styles.dropZone, isOver || dragging ? styles.dropping : "", disabled ? styles.disabled : ""].join(" ")}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
}

export function MediaUploader({
  accept          = ["image/jpeg", "image/png", "image/webp"],
  maxSizeMb       = 10,
  maxFiles        = 1,
  aspectRatio,
  recommendedDimensions,
  folder          = "general",
  multiple        = false,
  onUpload,
  disabled        = false,
  className       = "",
}: MediaUploaderProps) {
  const [files,       setFiles]       = useState<File[]>([]);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [cropModal,   setCropModal]   = useState(false);
  const [cropSrc,     setCropSrc]     = useState<string>("");
  const [crop,        setCrop]        = useState<Crop>();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error,       setError]       = useState<string>("");

  const inputRef  = useRef<HTMLInputElement>(null);
  const imgRef    = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const MAX_BYTES = maxSizeMb * 1024 * 1024;

  function validate(file: File): string | null {
    if (accept.length && !accept.includes(file.type)) return `File type not accepted. Use: ${accept.join(", ")}`;
    if (file.size > MAX_BYTES) return `File too large — max ${maxSizeMb}MB`;
    return null;
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const initial = aspectRatio
      ? centerCrop(makeAspectCrop({ unit: "%", width: 90 }, aspectRatio, width, height), width, height)
      : { unit: "%", width: 100, height: 100, x: 0, y: 0 } as Crop;
    setCrop(initial);
  }

  function handleFiles(incoming: File[]) {
    setError("");
    const valid: File[] = [];
    for (const f of incoming) {
      const err = validate(f);
      if (err) { setError(err); return; }
      valid.push(f);
    }

    if (aspectRatio && valid[0]?.type.startsWith("image/")) {
      setPendingFile(valid[0]);
      setCropSrc(URL.createObjectURL(valid[0]));
      setCropModal(true);
    } else {
      setFiles(valid.slice(0, maxFiles));
      uploadFiles(valid.slice(0, maxFiles));
    }
  }

  function applyCrop() {
    if (!imgRef.current || !canvasRef.current || !crop || !pendingFile) return;
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    const scaleX = img.naturalWidth  / img.width;
    const scaleY = img.naturalHeight / img.height;
    const ctx    = canvas.getContext("2d")!;
    const pixelCrop = {
      x:      (crop.x  / 100) * img.width  * scaleX,
      y:      (crop.y  / 100) * img.height * scaleY,
      width:  (crop.width  / 100) * img.width  * scaleX,
      height: (crop.height / 100) * img.height * scaleY,
    };
    const targetWidth = recommendedDimensions?.width ?? Math.round(pixelCrop.width);
    const targetHeight = recommendedDimensions?.height ?? Math.round(pixelCrop.height);
    canvas.width  = targetWidth;
    canvas.height = targetHeight;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, targetWidth, targetHeight);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], pendingFile.name, { type: pendingFile.type });
      setCropModal(false);
      setFiles([croppedFile]);
      uploadFiles([croppedFile], { width: targetWidth, height: targetHeight });
    }, pendingFile.type, 0.92);
  }

  async function uploadFiles(toUpload: File[], dimensions?: { width: number; height: number }) {
    setUploading(true);
    setProgress(0);
    const uploaded: UploadedFile[] = [];

    try {
      for (let i = 0; i < toUpload.length; i++) {
        const f = toUpload[i];
        const form = new FormData();
        form.append("file",   f);
        form.append("folder", folder);
        if (dimensions) {
          form.append("width", String(dimensions.width));
          form.append("height", String(dimensions.height));
        }

        const res  = await fetch("/api/media/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? "Upload failed");
        uploaded.push(data.data);
        setProgress(Math.round(((i + 1) / toUpload.length) * 100));
      }
      onUpload(uploaded);
    } catch (err: unknown) {
      setError((err as Error).message ?? "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <DndContext onDragEnd={() => {}}>
      <div className={[styles.wrap, className].join(" ")}>
        {recommendedDimensions && (
          <p className={styles.hint}>
            📐 {recommendedDimensions.label}
            {aspectRatio && " · Auto-crop enabled"}
          </p>
        )}

        <DropZone onDrop={handleFiles} disabled={disabled || uploading}>
          <input
            ref={inputRef}
            type="file"
            accept={accept.join(",")}
            multiple={multiple}
            className={styles.fileInput}
            onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
          />

          {uploading ? (
            <div className={styles.uploadingState}>
              <Spinner size="md" />
              <p>Uploading... {progress}%</p>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className={styles.idleState} onClick={() => inputRef.current?.click()}>
              <span className={styles.uploadIcon}>☁️</span>
              <p className={styles.uploadText}>Drag & drop or click to upload</p>
              <p className={styles.uploadSub}>{accept.map((t) => t.split("/")[1].toUpperCase()).join(", ")} · Max {maxSizeMb}MB</p>
            </div>
          )}
        </DropZone>

        {error && <p className={styles.error}>{error}</p>}

        {/* Hidden canvas for crop */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Crop modal */}
        <Modal isOpen={cropModal} onClose={() => setCropModal(false)} title="Crop Image" maxWidth="700px">
          {cropSrc && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ReactCrop
                crop={crop}
                onChange={(_, pct) => setCrop(pct)}
                aspect={aspectRatio}
                keepSelection
              >
                <img
                  ref={imgRef}
                  src={cropSrc}
                  onLoad={onImageLoad}
                  alt="Crop preview"
                  style={{ maxWidth: "100%", maxHeight: "400px" }}
                />
              </ReactCrop>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Drag the selection to crop. {aspectRatio && `Aspect ratio locked to ${aspectRatio === 1 ? "1:1 (square)" : aspectRatio === 16/9 ? "16:9" : aspectRatio === 4/3 ? "4:3" : aspectRatio.toFixed(2)}`}
              </p>
              <Button variant="primary" fullWidth onClick={applyCrop}>Apply Crop & Upload</Button>
            </div>
          )}
        </Modal>
      </div>
    </DndContext>
  );
}
