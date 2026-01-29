import { useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "./ui/Button";

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onClose: () => void;
}

export const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
  const { theme } = useTheme();
  const darkMode = theme === "dark";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const startedRef = useRef(false);
  const elementId = "barcode-scanner-region";

  useEffect(() => {
    let isMounted = true;

    const initScanner = async () => {
      // Prevent double initialization
      if (scannerRef.current || startingRef.current) {
        console.log("Scanner already initialized, skipping");
        return;
      }

      try {
        startingRef.current = true;
        const container = document.getElementById(elementId);
        if (container) {
          container.innerHTML = "";
        }

        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: { width: 320, height: 220 },
          aspectRatio: 1.777778,
          formatsToSupport: [
            0,  // QR_CODE
            8,  // EAN_13 (most common for books)
            9,  // EAN_8
            10, // CODE_39
            11, // CODE_93
            12, // CODE_128
            13, // ITF
            14, // UPC_A
            15, // UPC_E
          ],
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            console.log("Detected barcode:", decodedText);
            if (isMounted) {
              stopScanning();
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // Ignore continuous scanning errors
          }
        );

        if (isMounted) {
          setScanning(true);
        }
        startedRef.current = true;
      } catch (err) {
        console.error("Scanner error:", err);
        if (isMounted) {
          setError("Unable to start camera. Please check permissions and try again.");
        }
      } finally {
        startingRef.current = false;
      }
    };

    const initWhenVisible = () => {
      if (startedRef.current) return;
      const el = document.getElementById(elementId);
      if (!el || el.offsetParent === null) {
        requestAnimationFrame(initWhenVisible);
        return;
      }
      initScanner();
    };

    initWhenVisible();

    return () => {
      isMounted = false;
      // Cleanup will happen when component actually unmounts
      if (scannerRef.current) {
        stopScanning();
      }
    };
  }, []);

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleClose = async () => {
    await stopScanning();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Scanner */}
      <div
        className={`relative w-full max-w-2xl mx-4 ${
          darkMode ? "bg-[#1a1a1a]" : "bg-white"
        } rounded-xl shadow-lg overflow-hidden`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            darkMode ? "border-[#2a2a2a]" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-honey" />
            <h2
              className={`text-xl font-semibold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Scan ISBN Barcode
            </h2>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? "hover:bg-[#2a2a2a] text-gray-400 hover:text-white"
                : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Region */}
        <div className={`p-6 ${darkMode ? "bg-[#0f0f0f]" : "bg-gray-50"}`}>
          {error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={handleClose}>Close</Button>
            </div>
          ) : (
            <>
              <div id={elementId} className="w-full barcode-scanner-region" />
              {scanning && (
                <div className="mt-4 text-center">
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Position the barcode within the scanning area
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
