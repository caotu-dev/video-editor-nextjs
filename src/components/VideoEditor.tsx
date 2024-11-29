"use client";
import React, { useState, useRef, useEffect } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import EditorTimeline from "./EditorTimeline";
import VideoCanvas from "./VideoCanvas";
import MediaGallery from "./MediaGallery";
import TextOverlayControls from "./TextOverlayControls";
import AudioGallery from "./AudioGallery";

interface TextOverlay {
  type: "text";
  id: string;
  text: string;
  fontSize: number;
  color: string;
  startTime: number;
  endTime: number;
  position: { x: number; y: number };
}

interface ImageOverlay {
  type: "image";
  id: string;
  image: string;
  startTime: number;
  endTime: number;
  position: { x: number; y: number };
  size: number;
  width: number;
  height: number;
}

type Overlay = ImageOverlay | TextOverlay;

const VideoEditor = () => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const ffmpegRef = useRef<FFmpeg>();
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(
    null
  );

  useEffect(() => {
    const loadFFmpeg = async () => {
      const ffmpeg = new FFmpeg();
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
      });
      ffmpegRef.current = ffmpeg;
    };

    loadFFmpeg();
  }, []);

  const handleVideoSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);

    // Reset video state
    setCurrentTime(0);
    setDuration(0);

    // Load video metadata
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.load();
    }
  };

  const handleImageSelect = (file: File) => {
    addImageOverlay(file);
  };

  const handleAudioUpload = (file: File) => {
    setAudio(file);
  };

  const processVideo = async () => {
    if (!videoUrl || !ffmpegRef.current) return;
    setLoading(true);
    setProgress(0);
    setProcessedVideoUrl(null);

    try {
      const ffmpeg = ffmpegRef.current;

      ffmpeg.on("progress", ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      // Get video dimensions
      const tempVideo = document.createElement("video");
      tempVideo.src = videoUrl;
      await new Promise((resolve) => {
        tempVideo.onloadedmetadata = resolve;
      });
      const videoWidth = tempVideo.videoWidth;
      const videoHeight = tempVideo.videoHeight;

      // Write input video
      const videoResponse = await fetch(videoUrl);
      const videoArrayBuffer = await videoResponse.arrayBuffer();
      await ffmpeg.writeFile("input.mp4", new Uint8Array(videoArrayBuffer));

      // Process overlays
      for (let i = 0; i < overlays.length; i++) {
        const response = await fetch(overlays[i].image);
        const arrayBuffer = await response.arrayBuffer();
        await ffmpeg.writeFile(`overlay_${i}.png`, new Uint8Array(arrayBuffer));
      }

      // Process audio if exists
      if (audio) {
        const audioArrayBuffer = await audio.arrayBuffer();
        await ffmpeg.writeFile("audio.mp3", new Uint8Array(audioArrayBuffer));
      }

      // Create complex filter for overlays
      let filterComplex = "";
      let lastOutput = "0:v";

      overlays.forEach((overlay, index) => {
        const x = Math.round((overlay.position.x - 0.5) * videoWidth);
        const y = Math.round((overlay.position.y - 0.5) * videoHeight);

        if (overlay.type === "image") {
          filterComplex += `[${index + 1}:v]scale=${
            overlay.width * overlay.size
          }:${overlay.height * overlay.size}[scaled${index}];`;
          if (index === overlays.length - 1) {
            filterComplex += `[${lastOutput}][scaled${index}]overlay=${x}:${y}:enable='between(t,${overlay.startTime},${overlay.endTime})'[v${index}]`;
          } else {
            filterComplex += `[${lastOutput}][scaled${index}]overlay=${x}:${y}:enable='between(t,${overlay.startTime},${overlay.endTime})'[v${index}];`;
            lastOutput = `v${index}`;
          }
        }
      });

      // Build FFmpeg command
      const command = [
        "-i",
        "input.mp4",
        ...overlays.flatMap((_, i) => ["-i", `overlay_${i}.png`]),
        ...(audio ? ["-i", "audio.mp3"] : []),
        ...(overlays.length > 0
          ? [
              "-filter_complex",
              filterComplex,
              "-map",
              `[v${overlays.length - 1}]`,
            ]
          : ["-c:v", "copy"]),
        ...(audio ? ["-map", `${overlays.length + 1}:a`] : ["-map", "0:a"]),
        "-c:a",
        "aac",
        "output.mp4",
      ];

      console.log("FFmpeg command:", command);

      await ffmpeg.exec(command);

      const data = await ffmpeg.readFile("output.mp4");
      const outputBlob = new Blob([data], { type: "video/mp4" });
      const outputUrl = URL.createObjectURL(outputBlob);

      if (videoRef.current) {
        videoRef.current.src = outputUrl;
      }
      setProcessedVideoUrl(outputUrl);
    } catch (error) {
      console.error("Error processing video:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
    } finally {
      setLoading(false);
      setProgress(0);
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

  const addImageOverlay = async (file: File) => {
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setOverlays((prev) => [
      ...prev,
      {
        type: "image",
        id: crypto.randomUUID(),
        image: imageUrl,
        startTime: currentTime,
        endTime: currentTime + 2,
        position: { x: 0.1, y: 0.1 },
        size: 1,
        width: 0,
        height: 0,
      },
    ]);
  };

  const addTextOverlay = (text: string, fontSize: number, color: string) => {
    setOverlays((prev) => [
      ...prev,
      {
        type: "text",
        id: crypto.randomUUID(),
        text,
        fontSize,
        color,
        startTime: currentTime,
        endTime: currentTime + 2,
        position: { x: 0.1, y: 0.1 },
      },
    ]);
  };

  const handleOverlayMove = (
    index: number,
    position: { x: number; y: number }
  ) => {
    setOverlays((prev) =>
      prev.map((overlay, i) =>
        i === index ? { ...overlay, position } : overlay
      )
    );
  };

  const handleOverlayTimeUpdate = (
    index: number,
    startTime: number,
    endTime: number
  ) => {
    setOverlays((prev) =>
      prev.map((overlay, i) =>
        i === index ? { ...overlay, startTime, endTime } : overlay
      )
    );
  };

  const handleOverlayPositionChange = (
    index: number,
    property: "x" | "y" | "size" | "width" | "height",
    value: number
  ) => {
    setOverlays((prev) =>
      prev.map((overlay, i) =>
        i === index
          ? {
              ...overlay,
              ...(property === "size"
                ? { size: Math.max(0.1, Math.min(5, value)) }
                : property === "width" || property === "height"
                ? { [property]: Math.max(1, value) }
                : {
                    position: {
                      ...overlay.position,
                      [property]: Math.max(0, Math.min(1, value)),
                    },
                  }),
            }
          : overlay
      )
    );
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 10);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds}`;
  };

  const handleTextOverlayUpdate = (
    index: number,
    updates: Partial<TextOverlay>
  ) => {
    setOverlays((prev) =>
      prev.map((overlay, i) => {
        if (i === index && overlay.type === "text") {
          return { ...overlay, ...updates };
        }
        return overlay;
      })
    );
  };

  const handleDownload = () => {
    if (!processedVideoUrl) return;

    const link = document.createElement("a");
    link.href = processedVideoUrl;
    link.download = "processed-video.mp4";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Video Editor</h1>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Upload Video</h2>
            <MediaGallery
              onVideoSelect={handleVideoSelect}
              onImageSelect={handleImageSelect}
              className="h-40"
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Upload Overlays</h2>
            <MediaGallery
              onVideoSelect={() => {}} // Ignore videos here
              onImageSelect={handleImageSelect}
              className="h-40"
            />
          </div>
        </div>

        <AudioGallery onAudioSelect={handleAudioUpload} />

        {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Add Text Overlay</h2>
            <TextOverlayControls onAddText={addTextOverlay} />
          </div>
        </div> */}

        {videoUrl && (
          <>
            <div className="mt-4">
              <h2 className="text-xl mb-2">Preview:</h2>
              <video
                ref={videoRef}
                className="hidden"
                onLoadedMetadata={handleVideoLoaded}
                onTimeUpdate={handleVideoTimeUpdate}
                controls
              >
                <source src={videoUrl} type="video/mp4" />
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

            <div className="flex gap-4">
              <button
                onClick={processVideo}
                disabled={!videoUrl || loading}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
              >
                {loading ? `Processing ${progress}%` : "Process Video"}
              </button>

              {processedVideoUrl && (
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Download Processed Video
                </button>
              )}
            </div>

            {loading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </>
        )}

        <div className="mt-4">
          <h3 className="text-lg mb-2">Overlays:</h3>
          <ul className="space-y-4">
            {overlays.map((overlay, index) => (
              <li key={overlay.id} className="p-4 bg-gray-500 rounded-lg">
                <div className="flex items-center gap-4 mb-3">
                  {overlay.type === "text" ? (
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="font-medium">Text:</span>
                        <input
                          type="text"
                          value={overlay.text}
                          onChange={(e) =>
                            handleTextOverlayUpdate(index, {
                              text: e.target.value,
                            })
                          }
                          className="flex-1 px-2 py-1 border rounded"
                        />
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <label className="text-sm">Font Size:</label>
                          <input
                            type="number"
                            value={overlay.fontSize}
                            onChange={(e) =>
                              handleTextOverlayUpdate(index, {
                                fontSize: Math.max(
                                  12,
                                  Math.min(100, Number(e.target.value))
                                ),
                              })
                            }
                            min="12"
                            max="100"
                            className="w-20 px-2 py-1 border rounded"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm">Color:</label>
                          <input
                            type="color"
                            value={overlay.color}
                            onChange={(e) =>
                              handleTextOverlayUpdate(index, {
                                color: e.target.value,
                              })
                            }
                            className="w-20 h-8"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="font-medium">Image</span>
                  )}

                  <span>
                    From {formatTime(overlay.startTime)} to{" "}
                    {formatTime(overlay.endTime)}
                  </span>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={overlay.endTime}
                      value={overlay.startTime}
                      onChange={(e) =>
                        handleOverlayTimeUpdate(
                          index,
                          parseFloat(e.target.value),
                          overlay.endTime
                        )
                      }
                      className="w-20 px-2 py-1 bg-gray-500 border rounded"
                    />
                    <span>to</span>
                    <input
                      type="number"
                      step="0.1"
                      min={overlay.startTime}
                      max={duration}
                      value={overlay.endTime}
                      onChange={(e) =>
                        handleOverlayTimeUpdate(
                          index,
                          overlay.startTime,
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-20 px-2 bg-gray-500 py-1 border rounded"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setOverlays((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>

                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <label className="text-sm">X Position:</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={overlay.position.x}
                      onChange={(e) =>
                        handleOverlayPositionChange(
                          index,
                          "x",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-32"
                    />
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={overlay.position.x.toFixed(2)}
                      onChange={(e) =>
                        handleOverlayPositionChange(
                          index,
                          "x",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-20 px-2 py-1 border rounded"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Y Position:</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={overlay.position.y}
                      onChange={(e) =>
                        handleOverlayPositionChange(
                          index,
                          "y",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-32"
                    />
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={overlay.position.y.toFixed(2)}
                      onChange={(e) =>
                        handleOverlayPositionChange(
                          index,
                          "y",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-20 bg-gray-500 px-2 py-1 border rounded"
                    />
                  </div>
                  {overlay.type === "image" && (
                    <>
                      <div className="flex items-center gap-2">
                        <label className="text-sm">Width:</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={Math.round(overlay.width)}
                          onChange={(e) =>
                            handleOverlayPositionChange(
                              index,
                              "width",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-20 px-2 py-1 border rounded"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm">Height:</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={Math.round(overlay.height)}
                          onChange={(e) =>
                            handleOverlayPositionChange(
                              index,
                              "height",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-20 px-2 py-1 border rounded"
                        />
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;
