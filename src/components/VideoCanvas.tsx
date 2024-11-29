"use client";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface VideoCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  overlays: Array<{
    type: "image" | "text";
    image?: string;
    text?: string;
    fontSize?: number;
    color?: string;
    startTime: number;
    endTime: number;
    position: { x: number; y: number };
  }>;
  onOverlayMove?: (index: number, position: { x: number; y: number }) => void;
}

const VideoCanvas: React.FC<VideoCanvasProps> = ({
  videoRef,
  overlays,
  onOverlayMove,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.OrthographicCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const videoTextureRef = useRef<THREE.VideoTexture>();
  const overlayMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number>();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedMeshIndex, setDraggedMeshIndex] = useState<number>(-1);

  const clampPosition = (
    x: number,
    y: number,
    meshWidth: number,
    meshHeight: number
  ) => {
    // Convert from THREE.js coordinates (-1 to 1) to normalized (0 to 1)
    const normalizedX = (x + 1) / 2;
    const normalizedY = (-y + 1) / 2;

    // Calculate bounds considering the overlay size
    const minX = meshWidth / 2;
    const maxX = 1 - meshWidth / 2;
    const minY = meshHeight / 2;
    const maxY = 1 - meshHeight / 2;

    // Clamp the position
    const clampedX = Math.max(minX, Math.min(maxX, normalizedX));
    const clampedY = Math.max(minY, Math.min(maxY, normalizedY));

    return { x: clampedX, y: clampedY };
  };

  const setupScene = () => {
    if (!canvasRef.current || !videoRef.current) return;
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) return;

    // Cleanup previous scene if it exists
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }

    sceneRef.current = new THREE.Scene();

    // Get the container width
    const containerWidth =
      canvasRef.current.parentElement?.clientWidth || window.innerWidth;
    // Calculate height maintaining aspect ratio
    const containerHeight =
      containerWidth *
      (videoRef.current.videoHeight / videoRef.current.videoWidth);

    const aspect = videoRef.current.videoWidth / videoRef.current.videoHeight;

    cameraRef.current = new THREE.OrthographicCamera(
      -1,
      1,
      1 / aspect,
      -1 / aspect,
      0,
      1000
    );
    cameraRef.current.position.z = 1;

    rendererRef.current = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
    });

    // Set renderer size to container width instead of video width
    rendererRef.current.setSize(containerWidth, containerHeight);

    // Create video texture
    videoTextureRef.current = new THREE.VideoTexture(videoRef.current);
    videoTextureRef.current.minFilter = THREE.LinearFilter;
    videoTextureRef.current.magFilter = THREE.LinearFilter;

    const videoMaterial = new THREE.MeshBasicMaterial({
      map: videoTextureRef.current,
    });
    const videoGeometry = new THREE.PlaneGeometry(2, 2 / aspect);
    const videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
    sceneRef.current.add(videoMesh);

    animate();
  };

  const animate = () => {
    if (!videoRef.current) return;

    animationFrameRef.current = requestAnimationFrame(animate);

    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      if (videoTextureRef.current) {
        videoTextureRef.current.needsUpdate = true;
      }

      // Show overlays within their time ranges
      overlayMeshesRef.current.forEach((mesh) => {
        const { startTime, endTime } = mesh.userData;
        const currentTime = videoRef.current!.currentTime;
        mesh.visible = currentTime >= startTime && currentTime <= endTime;
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current || !sceneRef.current || !cameraRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(overlayMeshesRef.current);

    if (intersects.length > 0) {
      const meshIndex = overlayMeshesRef.current.indexOf(
        intersects[0].object as THREE.Mesh
      );
      setIsDragging(true);
      setDraggedMeshIndex(meshIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || draggedMeshIndex === -1 || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const mesh = overlayMeshesRef.current[draggedMeshIndex];
    if (mesh) {
      // Get mesh dimensions in normalized coordinates
      const meshWidth =
        (mesh.geometry as THREE.PlaneGeometry).parameters.width / 2;
      const meshHeight =
        (mesh.geometry as THREE.PlaneGeometry).parameters.height / 2;

      // Clamp position to prevent going out of bounds
      const clampedPosition = clampPosition(
        x * 2 - 1,
        -(y * 2 - 1),
        meshWidth,
        meshHeight
      );

      // Update mesh position
      mesh.position.x = clampedPosition.x * 2 - 1;
      mesh.position.y = -(clampedPosition.y * 2 - 1);

      // Notify parent component
      onOverlayMove?.(draggedMeshIndex, clampedPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedMeshIndex(-1);
  };

  const createTextTexture = (text: string, fontSize: number, color: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    // Set canvas size
    canvas.width = 512;
    canvas.height = 128;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return new THREE.CanvasTexture(canvas);
  };

  useEffect(() => {
    if (!videoRef.current) return;

    const handleVideoMetadata = () => {
      setupScene();
    };

    const handleResize = () => {
      setupScene();
    };

    videoRef.current.addEventListener("loadedmetadata", handleVideoMetadata);
    window.addEventListener("resize", handleResize);

    if (videoRef.current.readyState >= 2) {
      setupScene();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      videoRef.current?.removeEventListener(
        "loadedmetadata",
        handleVideoMetadata
      );
      window.removeEventListener("resize", handleResize);
      rendererRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !videoRef.current) return;

    // Remove existing overlays
    overlayMeshesRef.current.forEach((mesh) => {
      sceneRef.current?.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    overlayMeshesRef.current = [];

    // Create new overlays
    overlays.forEach((overlay, index) => {
      if (overlay.type === "image") {
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = "anonymous";

        // Create a temporary mesh with a placeholder material
        const geometry = new THREE.PlaneGeometry(0.5, 0.5);
        const tempMaterial = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
        });
        const mesh = new THREE.Mesh(geometry, tempMaterial);

        // Clamp initial position
        const clampedPosition = clampPosition(
          overlay.position.x * 2 - 1,
          -(overlay.position.y * 2 - 1),
          0.5,
          0.5
        );

        mesh.position.set(
          clampedPosition.x * 2 - 1,
          -(clampedPosition.y * 2 - 1),
          0.1
        );
        mesh.userData = {
          type: "overlay",
          startTime: overlay.startTime,
          endTime: overlay.endTime,
        };

        sceneRef.current?.add(mesh);
        overlayMeshesRef.current.push(mesh);

        // Load texture asynchronously
        loader.load(
          overlay.image,
          (texture) => {
            const material = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              side: THREE.DoubleSide,
            });
            mesh.material.dispose();
            mesh.material = material;
          },
          undefined,
          (error) => {
            console.error("Error loading overlay texture:", error);
          }
        );
      } else if (overlay.type === "text") {
        const texture = createTextTexture(
          overlay.text,
          overlay.fontSize,
          overlay.color
        );
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
        });

        // Create mesh with size proportional to font size
        const scale = overlay.fontSize / 32; // Base scale on font size
        const geometry = new THREE.PlaneGeometry(0.5 * scale, 0.125 * scale);
        const mesh = new THREE.Mesh(geometry, material);

        // Set position
        const clampedPosition = clampPosition(
          overlay.position.x * 2 - 1,
          -(overlay.position.y * 2 - 1),
          0.5 * scale,
          0.125 * scale
        );

        mesh.position.set(
          clampedPosition.x * 2 - 1,
          -(clampedPosition.y * 2 - 1),
          0.1
        );

        mesh.userData = {
          type: "text",
          startTime: overlay.startTime,
          endTime: overlay.endTime,
        };

        sceneRef.current?.add(mesh);
        overlayMeshesRef.current.push(mesh);
      }
    });
  }, [overlays, videoRef]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="absolute bottom-0 left-0 right-0 flex justify-center p-2">
        <button
          onClick={() => videoRef.current?.play()}
          className="mx-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Play
        </button>
        <button
          onClick={() => videoRef.current?.pause()}
          className="mx-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Pause
        </button>
      </div>
    </div>
  );
};

export default VideoCanvas;
