"use client";
import React, { useRef } from "react";

import EditorTimeline from "./EditorTimeline";
import VideoCanvas from "./VideoCanvas";
import MediaGallery from "./MediaGallery";
import { useOverlayStore } from "@/shared/store/overlay";
import { useVideoStore } from "@/shared/store/video";

const VideoEditor = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const { overlays, updateOverlay } = useOverlayStore();

  const {
    duration,
    setDuration,
    currentTime,
    setCurrentTime,
    setPreviewUrl,
    previewUrl,
  } = useVideoStore();

  const handleVideoSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Reset video state
    setCurrentTime(0);
    setDuration(0);

    // Load video metadata
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.load();
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleOverlayMove = (
    index: number,
    position: { x: number; y: number }
  ) => {
    updateOverlay(overlays[index].id, { position });
  };

  return (
    <div className="p-4">
      <div className="space-y-4">
        {!previewUrl && (
          <MediaGallery
            onVideoSelect={handleVideoSelect}
            className="h-[calc(100vh-25rem)]"
          />
        )}

        {previewUrl && (
          <>
            <div className="mt-4">
              <video
                ref={videoRef}
                className="hidden"
                onLoadedMetadata={handleVideoLoaded}
                onTimeUpdate={handleVideoTimeUpdate}
                controls
              >
                <source src={previewUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              <VideoCanvas
                videoRef={videoRef}
                overlays={overlays}
                onOverlayMove={handleOverlayMove}
              />

              {duration > 0 && (
                <EditorTimeline
                  duration={duration}
                  currentTime={currentTime}
                  onTimeUpdate={handleTimeUpdate}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoEditor;
