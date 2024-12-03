import { useProcessorStore } from "@/shared/store/processor";
import { useOverlayStore } from "@/shared/store/overlay";
import { useVideoStore } from "@/shared/store/video";
import { useRef, useEffect } from "react";

const VideoProcess = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const { loading, progress, processVideo, initFFmpeg } = useProcessorStore();
  const { overlays } = useOverlayStore();
  const { previewUrl } = useVideoStore();

  useEffect(() => {
    initFFmpeg();
  }, [initFFmpeg]);

  const handleProcessVideo = () => {
    processVideo({
      videoUrl: previewUrl,
      overlays,
      audio: null,
      videoRef,
    });
  };

  return (
    <button
      onClick={handleProcessVideo}
      disabled={!previewUrl || loading}
      className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
    >
      {loading ? `Generating ${progress}%` : "Generete Video"}
    </button>
  );
};

export default VideoProcess;
