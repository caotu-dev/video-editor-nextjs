"use client";
import React, { useState } from "react";
import { useOverlayStore } from "@/shared/store/overlay";
import { TextOverlay } from "@/shared/types/Overlay";
const VideoOverlayControls = () => {
  const [duration, setDuration] = useState(0);
  const { overlays, updateOverlay, removeOverlay } = useOverlayStore();

  const handleOverlayTimeUpdate = (
    index: number,
    startTime: number,
    endTime: number
  ) => {
    updateOverlay(overlays[index].id, { startTime, endTime });
  };

  const handleOverlayPositionChange = (
    index: number,
    property: "x" | "y" | "size" | "width" | "height",
    value: number
  ) => {
    updateOverlay(overlays[index].id, {
      position: {
        ...overlays[index].position,
        [property]: Math.max(0, Math.min(1, value)),
      },
    });
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
    updateOverlay(overlays[index].id, updates);
  };

  return (
    <div className="p-4 max-h-[15rem] overflow-y-auto">
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
                onClick={() => removeOverlay(overlays[index].id)}
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
  );
};

export default VideoOverlayControls;
