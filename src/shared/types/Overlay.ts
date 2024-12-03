export interface BaseOverlay {
  id: string;
  type: "image" | "text";
  startTime: number;
  endTime: number;
  position: { x: number; y: number };
}

export interface ImageOverlay extends BaseOverlay {
  type: "image";
  image: string;
  size: number;
  width: number;
  height: number;
}

export interface TextOverlay extends BaseOverlay {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
}

export type Overlay = ImageOverlay | TextOverlay;
