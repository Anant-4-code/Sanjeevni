import { useEffect, useRef } from "react";

type Detection = {
  label: string;
  confidence: number;
  box: { x: number; y: number; w: number; h: number };
};

interface XrayCanvasProps {
  imageUrl: string;
  detections: Detection[];
  showDetections?: boolean;
  confidenceThreshold?: number;
}

export default function XrayCanvas({
  imageUrl,
  detections,
  showDetections = true,
  confidenceThreshold = 0.5,
}: XrayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (showDetections) {
        detections
          .filter((d) => d.confidence >= confidenceThreshold)
          .forEach((d) => {
            const color = d.label === "fracture" ? "#FF4444" : "#FFAA22";
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(d.box.x, d.box.y, d.box.w, d.box.h);

            // Label background
            const label = `${d.label} — ${Math.round(d.confidence * 100)}%`;
            ctx.font = "bold 14px Inter, sans-serif";
            const metrics = ctx.measureText(label);
            const labelY = Math.max(d.box.y - 6, 18);
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(d.box.x - 1, labelY - 14, metrics.width + 8, 18);

            ctx.fillStyle = color;
            ctx.fillText(label, d.box.x + 3, labelY);
          });
      }
    };
    img.src = imageUrl;
  }, [imageUrl, detections, showDetections, confidenceThreshold]);

  return (
    <div className="animate-fade-in">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg border border-doc-border"
        style={{ maxHeight: "400px", objectFit: "contain" }}
      />
      {detections.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {detections.map((d, i) => (
            <span
              key={i}
              className={`severity-pill ${
                d.label === "fracture" ? "severity-critical" : "severity-warning"
              }`}
            >
              {d.label} ({Math.round(d.confidence * 100)}%)
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
