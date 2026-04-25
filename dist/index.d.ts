export interface SignatureCoordinate {
  x: number;
  y: number;
}

export interface SignatureTimelinePoint {
  time: number;
  coordinate: SignatureCoordinate;
  tryk: number | null;
}

export interface SignatureEventDetail {
  blob: Blob | null;
  file: File | null;
  imageData: ImageData | null;
  dataUrl: string;
  base64: string;
  timeline: SignatureTimelinePoint[];
  strokes: SignatureTimelinePoint[][];
  mimeType: string;
  timestamp: string;
  isEmpty: boolean;
  width: number;
  height: number;
}

export class NetsiSignature extends HTMLElement {
  static formAssociated: boolean;
  signed: boolean;
  value: string;
  base64: string;
  dataUrl: string;
  timeline: SignatureTimelinePoint[];
  strokes: SignatureTimelinePoint[][];
  clear(): void;
  undo(): void;
  redo(): void;
  toBlob(type?: string, quality?: number): Promise<Blob | null>;
  toDataURL(type?: string, quality?: number): string;
  toBase64(type?: string, quality?: number): string;
  getSignatureData(): Promise<SignatureEventDetail>;
}

declare global {
  interface HTMLElementTagNameMap {
    'netsi-signature': NetsiSignature;
  }

  interface HTMLElementEventMap {
    'signature:start': CustomEvent<SignatureEventDetail>;
    'signature:draw': CustomEvent<SignatureEventDetail>;
    'signature:end': CustomEvent<SignatureEventDetail>;
    'signature:clear': CustomEvent<SignatureEventDetail>;
  }
}
