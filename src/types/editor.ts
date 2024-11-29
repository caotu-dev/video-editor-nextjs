export interface Position {
  x: number;
  y: number;
}

export interface BaseOverlay {
  id: string;
  startTime: number;
  endTime: number;
  position: Position;
}

export interface TextOverlay extends BaseOverlay {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
}

export interface ImageOverlay extends BaseOverlay {
  type: "image";
  image: string;
}

export type Overlay = TextOverlay | ImageOverlay;
