import Mux from '@mux/mux-node';

const { video } = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || process.env.MUX_TOKEN,
  tokenSecret: process.env.MUX_TOKEN_SECRET || process.env.MUX_SECRET,
});

export interface MuxLiveStream {
  id: string;
  playback_ids: Array<{ id: string; policy: string }>;
  stream_key: string;
  rtmp: {
    url: string;
    stream_key: string;
  };
  status: string;
}

export interface MuxSimulcastTarget {
  id: string;
  url: string;
  stream_key: string;
  status: string;
}

export class MuxService {
  async createLiveStream(): Promise<MuxLiveStream> {
    try {
      const liveStream = await video.liveStreams.create({
        playback_policy: ['public'],
        new_asset_settings: {
          playback_policy: ['public']
        },
        reconnect_window: 60,
        reduced_latency: true, // Enable LL-HLS for sub-5s latency
      });

      return {
        id: liveStream.id,
        playback_ids: liveStream.playback_ids || [],
        stream_key: liveStream.stream_key,
        rtmp: {
          url: 'rtmp://global-live.mux.com:5222/app',
          stream_key: liveStream.stream_key
        },
        status: liveStream.status
      };
    } catch (error) {
      console.error('Error creating Mux live stream:', error);
      throw new Error('Failed to create live stream');
    }
  }

  async startLiveStream(streamId: string): Promise<void> {
    try {
      // Mux live streams start automatically when receiving video input
      console.log(`Live stream ${streamId} ready to receive input`);
    } catch (error) {
      console.error('Error starting Mux live stream:', error);
      throw new Error('Failed to start live stream');
    }
  }

  async stopLiveStream(streamId: string): Promise<void> {
    try {
      await video.liveStreams.signalComplete(streamId);
    } catch (error) {
      console.error('Error stopping Mux live stream:', error);
      throw new Error('Failed to stop live stream');
    }
  }

  async addSimulcastTarget(streamId: string, url: string, streamKey: string): Promise<MuxSimulcastTarget> {
    try {
      const target = await video.liveStreams.createSimulcastTarget(streamId, {
        url,
        stream_key: streamKey
      });

      return {
        id: target.id,
        url: target.url,
        stream_key: target.stream_key || streamKey,
        status: target.status
      };
    } catch (error) {
      console.error('Error adding simulcast target:', error);
      throw new Error('Failed to add simulcast target');
    }
  }

  async removeSimulcastTarget(streamId: string, targetId: string): Promise<void> {
    try {
      await video.liveStreams.deleteSimulcastTarget(streamId, targetId);
    } catch (error) {
      console.error('Error removing simulcast target:', error);
      throw new Error('Failed to remove simulcast target');
    }
  }

  async getLiveStreamStatus(streamId: string): Promise<string> {
    try {
      const liveStream = await video.liveStreams.retrieve(streamId);
      return liveStream.status;
    } catch (error) {
      console.error('Error getting live stream status:', error);
      throw new Error('Failed to get live stream status');
    }
  }

  getPlaybackUrl(playbackId: string): string {
    return `https://stream.mux.com/${playbackId}.m3u8`;
  }
}

export const muxService = new MuxService();
