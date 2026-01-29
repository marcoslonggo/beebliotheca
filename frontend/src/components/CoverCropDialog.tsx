import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import smartcrop from "smartcrop";
import { Dialog, DialogFooter } from "./ui/Dialog";
import { Button } from "./ui/Button";

interface CoverCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  onCancel: () => void;
  onConfirm: (blob: Blob, previewUrl: string) => void;
}

type Point = { x: number; y: number };

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const clampPoint = (value: number) => Math.min(1, Math.max(0, value));

const getDefaultPoints = (): Point[] => ([
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.9, y: 0.9 },
  { x: 0.1, y: 0.9 },
]);

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const computeHomography = (src: Point[], dst: Point[]) => {
  const matrix: number[][] = [];
  const vector: number[] = [];

  for (let i = 0; i < 4; i += 1) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    vector.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    vector.push(v);
  }

  const size = 8;
  for (let i = 0; i < size; i += 1) {
    let maxRow = i;
    for (let j = i + 1; j < size; j += 1) {
      if (Math.abs(matrix[j][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = j;
      }
    }
    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];
    [vector[i], vector[maxRow]] = [vector[maxRow], vector[i]];

    const pivot = matrix[i][i] || 1e-12;
    for (let j = i; j < size; j += 1) {
      matrix[i][j] /= pivot;
    }
    vector[i] /= pivot;

    for (let row = 0; row < size; row += 1) {
      if (row === i) continue;
      const factor = matrix[row][i];
      for (let col = i; col < size; col += 1) {
        matrix[row][col] -= factor * matrix[i][col];
      }
      vector[row] -= factor * vector[i];
    }
  }

  const [h11, h12, h13, h21, h22, h23, h31, h32] = vector;
  return [
    h11, h12, h13,
    h21, h22, h23,
    h31, h32, 1,
  ];
};

const invertHomography = (h: number[]) => {
  const [
    a, b, c,
    d, e, f,
    g, h2, i,
  ] = h;
  const A = e * i - f * h2;
  const B = f * g - d * i;
  const C = d * h2 - e * g;
  const D = c * h2 - b * i;
  const E = a * i - c * g;
  const F = b * g - a * h2;
  const G = b * f - c * e;
  const H = c * d - a * f;
  const I = a * e - b * d;
  const det = a * A + b * B + c * C;
  const invDet = det === 0 ? 0 : 1 / det;
  return [
    A * invDet, D * invDet, G * invDet,
    B * invDet, E * invDet, H * invDet,
    C * invDet, F * invDet, I * invDet,
  ];
};

const sampleBilinear = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const dx = x - x0;
  const dy = y - y0;

  const idx = (xx: number, yy: number) => (yy * width + xx) * 4;

  const i00 = idx(x0, y0);
  const i10 = idx(x1, y0);
  const i01 = idx(x0, y1);
  const i11 = idx(x1, y1);

  const result = [0, 0, 0, 0];
  for (let c = 0; c < 4; c += 1) {
    const v00 = data[i00 + c];
    const v10 = data[i10 + c];
    const v01 = data[i01 + c];
    const v11 = data[i11 + c];
    const v0 = v00 * (1 - dx) + v10 * dx;
    const v1 = v01 * (1 - dx) + v11 * dx;
    result[c] = v0 * (1 - dy) + v1 * dy;
  }
  return result;
};

const warpPerspective = async (imageSrc: string, points: Point[]): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const srcWidth = image.naturalWidth;
  const srcHeight = image.naturalHeight;

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) throw new Error("Canvas context unavailable");
  srcCtx.drawImage(image, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);

  const [p0, p1, p2, p3] = points;
  let dstWidth = Math.max(distance(p0, p1), distance(p3, p2));
  let dstHeight = Math.max(distance(p0, p3), distance(p1, p2));

  const maxDim = 1400;
  const scale = Math.min(1, maxDim / Math.max(dstWidth, dstHeight));
  dstWidth = Math.max(1, Math.floor(dstWidth * scale));
  dstHeight = Math.max(1, Math.floor(dstHeight * scale));

  const src = [
    p0,
    p1,
    p2,
    p3,
  ];
  const dst = [
    { x: 0, y: 0 },
    { x: dstWidth - 1, y: 0 },
    { x: dstWidth - 1, y: dstHeight - 1 },
    { x: 0, y: dstHeight - 1 },
  ];

  const homography = computeHomography(src, dst);
  const inverse = invertHomography(homography);

  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = dstWidth;
  dstCanvas.height = dstHeight;
  const dstCtx = dstCanvas.getContext("2d");
  if (!dstCtx) throw new Error("Canvas context unavailable");
  const dstImage = dstCtx.createImageData(dstWidth, dstHeight);
  const dstData = dstImage.data;

  for (let y = 0; y < dstHeight; y += 1) {
    for (let x = 0; x < dstWidth; x += 1) {
      const denom = inverse[6] * x + inverse[7] * y + inverse[8];
      const srcX = (inverse[0] * x + inverse[1] * y + inverse[2]) / denom;
      const srcY = (inverse[3] * x + inverse[4] * y + inverse[5]) / denom;
      const idx = (y * dstWidth + x) * 4;
      if (srcX >= 0 && srcX < srcWidth && srcY >= 0 && srcY < srcHeight) {
        const [r, g, b, a] = sampleBilinear(srcData.data, srcWidth, srcHeight, srcX, srcY);
        dstData[idx] = r;
        dstData[idx + 1] = g;
        dstData[idx + 2] = b;
        dstData[idx + 3] = a;
      } else {
        dstData[idx + 3] = 255;
      }
    }
  }

  dstCtx.putImageData(dstImage, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    dstCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create blob"));
        return;
      }
      resolve(blob);
    }, "image/jpeg", 0.92);
  });
};

export const CoverCropDialog = ({
  open,
  imageSrc,
  onCancel,
  onConfirm,
}: CoverCropDialogProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [points, setPoints] = useState<Point[]>(getDefaultPoints);
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displayRect, setDisplayRect] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!open) {
      setPoints(getDefaultPoints());
      imageRef.current = null;
      setActivePoint(null);
      setIsProcessing(false);
    }
  }, [open]);

  const updateDisplayRect = useCallback(() => {
    const image = imageRef.current;
    const container = containerRef.current;
    if (!image || !container) return;
    const containerRect = container.getBoundingClientRect();
    const imageAspect = image.naturalWidth / image.naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;
    let displayWidth = containerRect.width;
    let displayHeight = containerRect.height;
    if (containerAspect > imageAspect) {
      displayHeight = containerRect.height;
      displayWidth = displayHeight * imageAspect;
    } else {
      displayWidth = containerRect.width;
      displayHeight = displayWidth / imageAspect;
    }
    const offsetX = (containerRect.width - displayWidth) / 2;
    const offsetY = (containerRect.height - displayHeight) / 2;
    setDisplayRect({ width: displayWidth, height: displayHeight, offsetX, offsetY });
    setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
  }, []);

  const handleImageLoaded = useCallback((image: HTMLImageElement) => {
    imageRef.current = image;
    updateDisplayRect();
  }, [updateDisplayRect]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => updateDisplayRect();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open, updateDisplayRect]);

  const handleAutoCrop = useCallback(async () => {
    if (!imageSrc) return;
    try {
      const image = await createImage(imageSrc);
      const result = await smartcrop.crop(image, { width: 600, height: 900 });
      const area = result.topCrop;
      const nextPoints = [
        { x: area.x / image.width, y: area.y / image.height },
        { x: (area.x + area.width) / image.width, y: area.y / image.height },
        { x: (area.x + area.width) / image.width, y: (area.y + area.height) / image.height },
        { x: area.x / image.width, y: (area.y + area.height) / image.height },
      ];
      setPoints(nextPoints.map((point) => ({
        x: clampPoint(point.x),
        y: clampPoint(point.y),
      })));
    } catch (error) {
      console.error("Auto-crop failed:", error);
    }
  }, [imageSrc]);

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !imageRef.current) return;
    try {
      setIsProcessing(true);
      const pixelPoints = points.map((point) => ({
        x: point.x * imageSize.width,
        y: point.y * imageSize.height,
      }));
      const blob = await warpPerspective(imageSrc, pixelPoints);
      const previewUrl = URL.createObjectURL(blob);
      onConfirm(blob, previewUrl);
    } catch (error) {
      console.error("Failed to crop image:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [imageSize.height, imageSize.width, imageSrc, onConfirm, points]);

  const polygonPoints = useMemo(() => {
    const { width, height, offsetX, offsetY } = displayRect;
    if (!width || !height) return "";
    return points
      .map((point) => {
        const x = offsetX + point.x * width;
        const y = offsetY + point.y * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [displayRect, points]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (activePoint === null) return;
    const container = containerRef.current;
    if (!container) return;
    if (displayRect.width <= 0 || displayRect.height <= 0) return;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left - displayRect.offsetX;
    const y = event.clientY - rect.top - displayRect.offsetY;
    const nextX = clampPoint(x / displayRect.width);
    const nextY = clampPoint(y / displayRect.height);
    setPoints((prev) => prev.map((point, index) => (
      index === activePoint ? { x: nextX, y: nextY } : point
    )));
  }, [activePoint, displayRect]);

  const handlePointerUp = useCallback(() => {
    setActivePoint(null);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Crop Cover"
      maxWidth="lg"
      scrollable={false}
      contentClassName="flex flex-col h-full"
    >
      <div className="flex flex-col gap-4 h-full min-h-[60vh]">
        <div
          ref={containerRef}
          className="relative w-full flex-1 min-h-0 bg-black rounded-lg overflow-hidden flex items-center justify-center"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {imageSrc && (
            <>
              {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
              <img
                src={imageSrc}
                alt="Cover photo"
                onLoad={(event) => handleImageLoaded(event.currentTarget)}
                className="max-h-full max-w-full"
              />
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {polygonPoints && (
                  <polygon
                    points={polygonPoints}
                    fill="rgba(0,0,0,0.35)"
                    stroke="#f5c44d"
                    strokeWidth={2}
                  />
                )}
              </svg>
              {points.map((point, index) => {
                const left = displayRect.offsetX + point.x * displayRect.width;
                const top = displayRect.offsetY + point.y * displayRect.height;
                return (
                  <div
                    key={index}
                    className="absolute h-6 w-6 -ml-3 -mt-3 rounded-full bg-[#f5c44d] border-2 border-white shadow cursor-pointer"
                    style={{ left, top }}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setActivePoint(index);
                    }}
                  />
                );
              })}
            </>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Drag the corner points to match the book cover.
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleAutoCrop} disabled={!imageSrc}>
            Auto-crop
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!imageSrc || isProcessing}>
            {isProcessing ? "Processing..." : "Use Photo"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
