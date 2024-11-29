export interface ImageOverlay {
  id: string;
  file: File;
  start: number;
  duration: number;
  position: {
    x: number;
    y: number;
  };
}

export interface TimelineTrack {
  id: string;
  type: "video" | "audio" | "image";
  start: number;
  duration: number;
  content: string;
}
