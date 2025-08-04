export interface MuxPlaybackOptions {
  playbackId: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export function getMuxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function getMuxThumbnailUrl(playbackId: string, options?: {
  width?: number;
  height?: number;
  time?: number;
}): string {
  const params = new URLSearchParams();
  
  if (options?.width) params.append('width', options.width.toString());
  if (options?.height) params.append('height', options.height.toString());
  if (options?.time) params.append('time', options.time.toString());
  
  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${queryString ? `?${queryString}` : ''}`;
}

export function createMuxPlayerElement(options: MuxPlaybackOptions): HTMLVideoElement {
  const video = document.createElement('video');
  video.src = getMuxPlaybackUrl(options.playbackId);
  video.autoplay = options.autoplay || false;
  video.muted = options.muted || false;
  video.controls = options.controls || true;
  video.playsInline = true;
  
  return video;
}
