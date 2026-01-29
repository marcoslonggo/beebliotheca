import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  IconButton,
  Button,
  Stack,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Alert
} from "@mui/material";
import {
  CameraAlt as CameraAltIcon,
  Close as CloseIcon,
  Upload as UploadIcon,
  FlashlightOn as FlashlightOnIcon,
  FlashlightOff as FlashlightOffIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Videocam as VideocamIcon
} from "@mui/icons-material";
import { BarcodeDetector } from 'barcode-detector';

interface BookScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

interface VideoDevice {
  deviceId: string;
  label: string;
}

const BookScannerDialog = ({ open, onClose, onDetected }: BookScannerDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);

  const [scanMode, setScanMode] = useState<'photo' | 'live'>('live');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<string>("");

  // Live camera state
  const [devices, setDevices] = useState<VideoDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [minZoom, setMinZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Get available video devices
  const getVideoDevices = async () => {
    try {
      // On iOS Safari, we need to request permission first before we can get device labels
      // Request initial stream to trigger permission prompt
      const initialStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      // Now enumerate devices - labels will be available after permission granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`
        }));

      // Stop the initial stream - we'll start a new one with selected device
      initialStream.getTracks().forEach(track => track.stop());

      setDevices(videoDevices);

      // Select environment (rear) camera by default if available
      const rearCamera = videoDevices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );

      if (rearCamera) {
        setSelectedDevice(rearCamera.deviceId);
      } else if (videoDevices.length > 0) {
        setSelectedDevice(videoDevices[0].deviceId);
      }
    } catch (err: any) {
      console.error("Error getting video devices:", err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : "Could not access camera. Please check your browser settings and try again."
      );
    }
  };

  // Start camera stream
  const startCamera = async (deviceId?: string) => {
    try {
      setCameraError(null);
      stopCamera();

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: deviceId ? undefined : { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check capabilities
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      const settings = track.getSettings() as any;

      // Check torch support
      if (capabilities.torch) {
        setTorchSupported(true);
        setTorchEnabled(settings.torch || false);
      } else {
        setTorchSupported(false);
      }

      // Check zoom support
      if (capabilities.zoom) {
        setZoomSupported(true);
        setMinZoom(capabilities.zoom.min || 1);
        setMaxZoom(capabilities.zoom.max || 10);
        setZoomLevel(settings.zoom || 1);
      } else {
        setZoomSupported(false);
      }

      // Start continuous scanning
      startContinuousScanning();
    } catch (err: any) {
      console.error("Error starting camera:", err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? "Camera permission denied. Please allow camera access to use this feature."
          : "Could not start camera. Please try another camera or use photo mode."
      );
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Toggle torch
  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const newTorchState = !torchEnabled;

      await track.applyConstraints({
        advanced: [{ torch: newTorchState } as any]
      });

      setTorchEnabled(newTorchState);
    } catch (err) {
      console.error("Error toggling torch:", err);
    }
  };

  // Adjust zoom
  const adjustZoom = async (delta: number) => {
    if (!streamRef.current || !zoomSupported) return;

    try {
      const track = streamRef.current.getVideoTracks()[0];
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel + delta));

      await track.applyConstraints({
        advanced: [{ zoom: newZoom } as any]
      });

      setZoomLevel(newZoom);
    } catch (err) {
      console.error("Error adjusting zoom:", err);
    }
  };

  const getDetector = () => {
    if (!detectorRef.current) {
      detectorRef.current = new BarcodeDetector({
        formats: [
          'ean_13', 'ean_8', 'upc_a', 'upc_e',
          'code_128', 'code_39', 'code_93',
          'codabar', 'itf'
        ]
      });
    }

    return detectorRef.current;
  };

  const getScanRegion = (videoWidth: number, videoHeight: number) => {
    const maxWidth = videoWidth * 0.8;
    const maxHeight = videoHeight * 0.8;
    const targetAspect = 3 / 2;

    let cropWidth = maxWidth;
    let cropHeight = cropWidth / targetAspect;

    if (cropHeight > maxHeight) {
      cropHeight = maxHeight;
      cropWidth = cropHeight * targetAspect;
    }

    const sx = Math.max(0, (videoWidth - cropWidth) / 2);
    const sy = Math.max(0, (videoHeight - cropHeight) / 2);

    return {
      sx: Math.round(sx),
      sy: Math.round(sy),
      sw: Math.round(cropWidth),
      sh: Math.round(cropHeight)
    };
  };

  // Scan from video frame
  const scanVideoFrame = async (): Promise<string | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return null;
    }

    const { sx, sy, sw, sh } = getScanRegion(video.videoWidth, video.videoHeight);
    canvas.width = sw;
    canvas.height = sh;
    context.imageSmoothingEnabled = false;
    context.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    try {
      const barcodes = await getDetector().detect(canvas);

      if (barcodes.length > 0) {
        return barcodes[0].rawValue;
      }
    } catch (err) {
      console.error("Detection error:", err);
    }

    return null;
  };

  // Start continuous scanning
  const startContinuousScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    setScanProgress("Searching for barcode...");

    scanIntervalRef.current = window.setInterval(async () => {
      const code = await scanVideoFrame();

      if (code) {
        setScanProgress("Barcode detected!");
        stopCamera();
        onDetected(code);
        onClose();
      }
    }, 250); // Scan every 250ms
  };

  // Scan from image
  const scanImage = async (imageElement: HTMLImageElement) => {
    try {
      setScanProgress("Detecting barcode...");
      const barcodes = await getDetector().detect(imageElement);

      if (barcodes.length === 0) {
        throw new Error("No barcode found");
      }

      setScanProgress("Barcode found!");
      return barcodes[0].rawValue;
    } catch (err) {
      console.error("Barcode detection error:", err);
      throw new Error("Could not detect a barcode");
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setScanning(true);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const img = new Image();
    img.onload = async () => {
      try {
        const barcode = await scanImage(img);
        URL.revokeObjectURL(url);
        setPreviewUrl(null);
        onDetected(barcode);
        onClose();
      } catch (err) {
        setError("Could not detect a barcode in this image. Please try again with a clearer photo.");
        setScanning(false);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      setPreviewUrl(null);
      setError("Failed to load image. Please try again.");
      setScanning(false);
    };

    img.src = url;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Effects
  useEffect(() => {
    if (open && scanMode === 'live') {
      getVideoDevices();
    }
  }, [open, scanMode]);

  useEffect(() => {
    if (open && scanMode === 'live' && selectedDevice) {
      startCamera(selectedDevice);
    }

    return () => {
      stopCamera();
    };
  }, [open, scanMode, selectedDevice]);

  const handleClose = () => {
    stopCamera();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setError(null);
    setScanning(false);
    setScanProgress("");
    setCameraError(null);
    onClose();
  };

  const handleTakePhoto = () => {
    fileInputRef.current?.click();
  };

  if (!open) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen
      PaperProps={{
        sx: {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          m: 0
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pb: 1,
        flexShrink: 0
      }}>
        <Box component="span" sx={{ fontSize: '1.25rem', fontWeight: 500 }}>
          Scan Barcode
        </Box>
        <IconButton onClick={handleClose} edge="end">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs value={scanMode} onChange={(_, v) => setScanMode(v)}>
          <Tab icon={<VideocamIcon />} label="Live Camera" value="live" />
          <Tab icon={<CameraAltIcon />} label="Take Photo" value="photo" />
        </Tabs>
      </Box>

      <DialogContent sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: 2,
        flex: 1,
        overflow: 'auto'
      }}>
        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* Live Camera Mode */}
        {scanMode === 'live' && (
          <Stack spacing={2} sx={{ height: '100%' }}>
            {cameraError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {cameraError}
              </Alert>
            ) : null}

            {/* Camera selector */}
            {devices.length > 1 && (
              <FormControl size="small" fullWidth>
                <InputLabel>Camera</InputLabel>
                <Select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  label="Camera"
                >
                  {devices.map(device => (
                    <MenuItem key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Video preview */}
            <Box sx={{
              position: 'relative',
              flex: 1,
              backgroundColor: 'black',
              borderRadius: 2,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />

              {/* Scanning overlay */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                {/* Scan frame */}
                <Box sx={{
                  width: '80%',
                  maxWidth: 400,
                  aspectRatio: '3/2',
                  border: '3px solid',
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                }} />

                {/* Status text */}
                <Box sx={{
                  mt: 2,
                  px: 3,
                  py: 1,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  borderRadius: 1
                }}>
                  <Typography variant="body2" color="white" textAlign="center">
                    {scanProgress || "Align barcode in the frame"}
                  </Typography>
                </Box>
              </Box>

              {/* Camera controls */}
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'auto'
                }}
              >
                {/* Zoom controls */}
                {zoomSupported && (
                  <>
                    <IconButton
                      onClick={() => adjustZoom(-0.5)}
                      disabled={zoomLevel <= minZoom}
                      sx={{
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                        '&:disabled': { color: 'grey.600' }
                      }}
                    >
                      <ZoomOutIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => adjustZoom(0.5)}
                      disabled={zoomLevel >= maxZoom}
                      sx={{
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.8)' },
                        '&:disabled': { color: 'grey.600' }
                      }}
                    >
                      <ZoomInIcon />
                    </IconButton>
                  </>
                )}

                {/* Torch control */}
                {torchSupported && (
                  <IconButton
                    onClick={toggleTorch}
                    sx={{
                      backgroundColor: torchEnabled ? 'primary.main' : 'rgba(0,0,0,0.7)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: torchEnabled ? 'primary.dark' : 'rgba(0,0,0,0.8)'
                      }
                    }}
                  >
                    {torchEnabled ? <FlashlightOnIcon /> : <FlashlightOffIcon />}
                  </IconButton>
                )}
              </Stack>
            </Box>

            <Typography variant="caption" color="text.secondary" textAlign="center">
              Position the barcode within the frame. Detection happens automatically.
            </Typography>
          </Stack>
        )}

        {/* Photo Mode */}
        {scanMode === 'photo' && !scanning && !error && (
          <>
            <Typography variant="body1" textAlign="center" color="text.secondary">
              Take a photo of the book's barcode
            </Typography>

            <Box
              sx={{
                width: '100%',
                aspectRatio: '4/3',
                backgroundColor: 'grey.100',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed',
                borderColor: 'grey.300'
              }}
            >
              <Stack alignItems="center" spacing={2}>
                <CameraAltIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ px: 2 }}>
                  ISBN-13, ISBN-10, UPC, or other barcodes
                </Typography>
              </Stack>
            </Box>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                size="large"
                startIcon={<CameraAltIcon />}
                onClick={handleTakePhoto}
                fullWidth
              >
                Take Photo
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<UploadIcon />}
                onClick={handleTakePhoto}
                fullWidth
              >
                Choose File
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary" textAlign="center">
              Make sure the barcode is clearly visible and well-lit
            </Typography>
          </>
        )}

        {/* Scanning state (photo mode) */}
        {scanMode === 'photo' && scanning && (
          <Stack alignItems="center" spacing={3} sx={{ py: 4 }}>
            {previewUrl && (
              <Box
                component="img"
                src={previewUrl}
                sx={{
                  maxWidth: '100%',
                  maxHeight: 400,
                  borderRadius: 2,
                  boxShadow: 2
                }}
                alt="Barcode preview"
              />
            )}
            <CircularProgress size={60} />
            <Typography variant="h6" color="text.secondary">
              Scanning barcode...
            </Typography>
            {scanProgress && (
              <Typography variant="body2" color="primary">
                {scanProgress}
              </Typography>
            )}
          </Stack>
        )}

        {/* Error state (photo mode) */}
        {scanMode === 'photo' && error && (
          <Stack spacing={2} alignItems="center">
            {previewUrl && (
              <Box
                component="img"
                src={previewUrl}
                sx={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  borderRadius: 2,
                  boxShadow: 2,
                  opacity: 0.7
                }}
                alt="Failed scan"
              />
            )}
            <Alert severity="error">{error}</Alert>
            <Button
              variant="contained"
              startIcon={<CameraAltIcon />}
              onClick={() => {
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }
                setError(null);
                handleTakePhoto();
              }}
              fullWidth
            >
              Try Again
            </Button>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookScannerDialog;
