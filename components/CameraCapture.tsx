"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live camera: opens the device camera in the page and takes a still.
 * If the camera is blocked or missing, falls back to the phone's own camera / file picker.
 */
export function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1600 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("The camera is blocked or not available."));
    if (!navigator.mediaDevices) setError("This browser can't open the camera here.");
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="camera" role="dialog" aria-label="Camera">
      <div className="camera-inner">
        {error ? (
          <div className="camera-fallback">
            <p>{error}</p>
            <label className="button button-wide">
              Choose or take a photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => e.target.files?.[0] && onCapture(e.target.files[0])}
              />
            </label>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
        )}
        <div className="camera-actions">
          {!error && (
            <button type="button" className="button button-wide shutter" onClick={snap}>
              Take photo
            </button>
          )}
          <button type="button" className="button-quiet camera-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
