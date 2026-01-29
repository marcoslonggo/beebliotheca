declare module "@ericblade/quagga2" {
  import type { EventEmitter } from "events";

  type Reader =
    | "code_128_reader"
    | "ean_reader"
    | "ean_8_reader"
    | "code_39_reader"
    | "code_39_vin_reader"
    | "codabar_reader"
    | "upc_reader"
    | "upc_e_reader"
    | "i2of5_reader"
    | "2of5_reader"
    | "code_93_reader";

  interface InitConfig {
    inputStream: {
      type: "LiveStream" | "ImageStream";
      target?: HTMLElement | string;
      constraints?: MediaTrackConstraints;
    };
    decoder: {
      readers: Reader[];
    };
    locate?: boolean;
  }

  interface DetectionResult {
    codeResult: {
      code: string;
    };
  }

  interface QuaggaInstance extends EventEmitter {
    start(): void;
    stop(): void;
    onDetected(callback: (data: DetectionResult) => void): void;
    offDetected(callback: (data: DetectionResult) => void): void;
  }

  const Quagga: QuaggaInstance & {
    init(config: InitConfig, callback: (err?: unknown) => void): void;
  };

  export default Quagga;
}
