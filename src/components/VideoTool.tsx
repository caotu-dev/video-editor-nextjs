"use client";
import React, { useRef } from "react";
import { useOverlayStore } from "../shared/store/overlay";
import VideoProcess from "./VideoProcess";
import VideoDownload from "./VideoDownload";

const VideoTool: React.FC = () => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const addOverlay = useOverlayStore((state) => state.addOverlay);

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);

      // Create new image overlay
      const newOverlay = {
        type: "image" as const,
        id: crypto.randomUUID(),
        image: imageUrl,
        startTime: 0,
        endTime: 2,
        position: { x: 0.5, y: 0.5 },
        size: 1,
        width: 100,
        height: 100,
      };

      addOverlay(newOverlay);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleImageChange}
        accept="image/*"
        className="hidden"
      />
      <button
        type="button"
        onClick={handleImageClick}
        className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
      >
        Insert image
      </button>
      <button
        type="button"
        className="py-2.5 px-5 me-2 mb-2 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700"
      >
        Insert text
      </button>

      <VideoProcess />
      <VideoDownload />
    </div>
  );
};

export default VideoTool;
