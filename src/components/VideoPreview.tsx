import { useEffect, useRef } from "react";
import { Overlay } from "../types/editor";

interface VideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl: string;
  overlays: Overlay[];
  duration: number;
  currentTime: number;
  onVideoLoaded: (duration: number) => void;
  onTimeUpdate: (time: number) => void;
  onOverlayMove: (index: number, x: number, y: number) => void;
}

const VideoPreview = ({
  videoRef,
  videoUrl,
  overlays,
  duration,
  currentTime,
  onVideoLoaded,
  onTimeUpdate,
  onOverlayMove,
}: VideoPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener("loadedmetadata", () => {
        onVideoLoaded(videoRef.current?.duration || 0);
      });
    }
  }, [videoRef, onVideoLoaded]);

  const handleDrag = (index: number, e: React.DragEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    onOverlayMove(
      index,
      Math.max(0, Math.min(1, x)),
      Math.max(0, Math.min(1, y))
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full aspect-video"
        onTimeUpdate={() => onTimeUpdate(videoRef.current?.currentTime || 0)}
        controls
      />

      {overlays.map((overlay, index) => {
        if (currentTime < overlay.startTime || currentTime > overlay.endTime)
          return null;

        return (
          <div
            key={overlay.id}
            draggable
            onDragEnd={(e) => handleDrag(index, e)}
            style={{
              position: "absolute",
              left: `${overlay.position.x * 100}%`,
              top: `${overlay.position.y * 100}%`,
              cursor: "move",
            }}
          >
            {overlay.type === "text" ? (
              <span
                style={{
                  fontSize: `${overlay.fontSize}px`,
                  color: overlay.color,
                }}
              >
                {overlay.text}
              </span>
            ) : (
              <img
                src={overlay.image}
                alt="overlay"
                className="max-w-[200px] max-h-[200px]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VideoPreview;
