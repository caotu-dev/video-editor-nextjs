"use client";
import React from 'react';

interface EditorTimelineProps {
  duration: number;  // Duration in seconds
  currentTime: number;
  onTimeUpdate: (time: number) => void;
}

const EditorTimeline: React.FC<EditorTimelineProps> = ({ 
  duration, 
  currentTime, 
  onTimeUpdate 
}) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTimeUpdate(parseFloat(e.target.value));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full space-y-2">
      <input
        type="range"
        min="0"
        max={duration}
        value={currentTime}
        onChange={handleSliderChange}
        className="w-full"
        step="0.1"
      />
      <div className="flex justify-between text-sm">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default EditorTimeline; 