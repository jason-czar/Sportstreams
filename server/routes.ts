import type { Express } from "express";
import { createServer, type Server } from "http";
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { storage } from "./storage";
import { muxService } from "./services/mux";
import { initializeWebSocket, getWebSocketService } from "./services/websocket";
import { insertEventSchema, insertCameraSchema } from "@shared/schema";
import { requireAuth, optionalAuth } from "./middleware/auth";
import authRoutes from "./routes/auth";
import { z } from "zod";
import { randomBytes } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Configure session middleware
  const pgSession = connectPg(session);
  const sessionStore = new pgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: 7 * 24 * 60 * 60 * 1000, // 1 week
    tableName: 'sessions',
  });

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }));

  // Initialize WebSocket service
  initializeWebSocket(httpServer);

  // Auth routes
  app.use('/api/auth', authRoutes);

  // Create Event (requires authentication)
  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      // Parse and transform the data
      const body = req.body;
      
      // Convert startDateTime string to Date object
      if (body.startDateTime && typeof body.startDateTime === 'string') {
        body.startDateTime = new Date(body.startDateTime);
      }
      
      const eventData = insertEventSchema.parse(body);
      
      // Generate unique event code
      const timestamp = Date.now().toString(36).toUpperCase();
      const eventCode = `${eventData.name.replace(/\s+/g, '').slice(0, 8).toUpperCase()}-${timestamp}`;
      
      // Create Mux live stream (will use development mode if Mux isn't available)
      const muxStream = await muxService.createLiveStream();
      
      // Create event in database with organizer
      const event = await storage.createEvent({
        name: eventData.name,
        description: eventData.description,
        sportType: eventData.sportType,
        startDateTime: eventData.startDateTime,
        duration: eventData.duration,
        organizerId: req.user!.id, // Set the current user as organizer
        isPublic: eventData.isPublic ?? true,
        maxCameras: eventData.maxCameras ?? 9,
      });

      // Update with Mux data
      const updatedEvent = await storage.updateEvent(event.id, {
        eventCode,
        muxStreamId: muxStream.id,
        playbackId: muxStream.playback_ids[0]?.id,
        ingestUrl: muxStream.rtmp.url,
      });

      res.json({
        eventCode: updatedEvent?.eventCode || eventCode,
        eventId: event.id,
        ingestUrl: updatedEvent?.ingestUrl || muxStream.rtmp.url,
        playbackId: updatedEvent?.playbackId || muxStream.playback_ids[0]?.id,
      });
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create event" });
    }
  });

  // Get Event by Code
  app.get("/api/events/code/:code", async (req, res) => {
    try {
      const event = await storage.getEventByCode(req.params.code);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const cameras = await storage.getCamerasByEvent(event.id);
      
      res.json({
        ...event,
        cameras,
      });
    } catch (error) {
      console.error("Error getting event:", error);
      res.status(500).json({ error: "Failed to get event" });
    }
  });

  // Get Event by ID
  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      
      const cameras = await storage.getCamerasByEvent(event.id);
      
      res.json({
        ...event,
        cameras,
      });
    } catch (error) {
      console.error("Error getting event:", error);
      res.status(500).json({ error: "Failed to get event" });
    }
  });

  // Join as Camera
  app.post("/api/events/:eventId/cameras", async (req, res) => {
    try {
      const eventId = req.params.eventId;
      const cameraData = z.object({
        label: z.string(),
        operatorName: z.string().optional(),
        quality: z.string().default("720p"),
      }).parse(req.body);

      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Generate unique stream key
      const streamKey = `${event.muxStreamId}_${randomBytes(8).toString('hex')}`;
      
      // Create camera
      const camera = await storage.createCamera({
        eventId,
        label: cameraData.label,
        quality: cameraData.quality,
        operatorName: cameraData.operatorName,
        streamKey,
        rtmpUrl: event.ingestUrl || '',
      });

      res.json({
        cameraId: camera.id,
        streamKey: camera.streamKey,
        ingestUrl: camera.rtmpUrl,
        label: camera.label,
      });
    } catch (error) {
      console.error("Error creating camera:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to join camera" });
    }
  });

  // Update Camera Status
  app.patch("/api/cameras/:id/status", async (req, res) => {
    try {
      const cameraId = req.params.id;
      const { isLive } = z.object({ isLive: z.boolean() }).parse(req.body);

      const camera = await storage.updateCamera(cameraId, { isLive });
      if (!camera) {
        return res.status(404).json({ error: "Camera not found" });
      }

      // Broadcast camera status update
      const wsService = getWebSocketService();
      wsService.broadcastCameraUpdate(camera.eventId, cameraId, isLive);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating camera status:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update camera status" });
    }
  });

  // Switch Active Camera
  app.patch("/api/events/:id/switch", async (req, res) => {
    try {
      const eventId = req.params.id;
      const { cameraId } = z.object({ cameraId: z.string() }).parse(req.body);

      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const camera = await storage.getCamera(cameraId);
      if (!camera || camera.eventId !== eventId) {
        return res.status(404).json({ error: "Camera not found" });
      }

      // Update active camera
      await storage.updateEvent(eventId, { activeCamera: cameraId });
      
      // Log the switch
      await storage.createSwitchLog({
        eventId,
        cameraId,
      });

      // Broadcast program switch
      const wsService = getWebSocketService();
      const programUrl = event.playbackId ? muxService.getPlaybackUrl(event.playbackId) : '';
      wsService.broadcastProgramSwitch(eventId, cameraId, programUrl);

      res.json({ success: true });
    } catch (error) {
      console.error("Error switching camera:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to switch camera" });
    }
  });

  // Start Stream
  app.post("/api/events/:id/start", async (req, res) => {
    try {
      const eventId = req.params.id;
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (!event.muxStreamId) {
        return res.status(400).json({ error: "No Mux stream configured" });
      }

      await muxService.startLiveStream(event.muxStreamId);
      await storage.updateEvent(eventId, { status: "live" });

      res.json({ success: true });
    } catch (error) {
      console.error("Error starting stream:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start stream" });
    }
  });

  // Stop Stream
  app.post("/api/events/:id/stop", async (req, res) => {
    try {
      const eventId = req.params.id;
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (!event.muxStreamId) {
        return res.status(400).json({ error: "No Mux stream configured" });
      }

      await muxService.stopLiveStream(event.muxStreamId);
      await storage.updateEvent(eventId, { status: "ended" });

      res.json({ success: true });
    } catch (error) {
      console.error("Error stopping stream:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to stop stream" });
    }
  });

  // Add Simulcast Targets
  app.post("/api/events/:id/simulcast", async (req, res) => {
    try {
      const eventId = req.params.id;

      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (!event.muxStreamId) {
        return res.status(400).json({ error: "No Mux stream configured" });
      }

      // Check if stream is idle (required for adding simulcast targets)
      const streamStatus = await muxService.getLiveStreamStatus(event.muxStreamId);
      if (streamStatus !== 'idle') {
        return res.status(400).json({ error: "Can only add simulcast targets when stream is idle" });
      }

      const results = [];

      // Use centralized YouTube stream key
      const youtubeKey = process.env.YOUTUBE_STREAM_KEY;
      if (youtubeKey) {
        try {
          const youtubeTarget = await muxService.addSimulcastTarget(
            event.muxStreamId,
            'rtmps://a.rtmp.youtube.com/live2',
            youtubeKey
          );
          
          await storage.createSimulcastTarget({
            eventId,
            platform: 'youtube',
            targetUrl: 'rtmps://a.rtmp.youtube.com/live2',
            streamKey: youtubeKey,
            muxTargetId: youtubeTarget.id,
          });

          results.push({ platform: 'youtube', status: 'added' });
        } catch (error) {
          results.push({ platform: 'youtube', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // Use centralized Twitch stream key
      const twitchKey = process.env.TWITCH_STREAM_KEY;
      if (twitchKey) {
        try {
          const twitchTarget = await muxService.addSimulcastTarget(
            event.muxStreamId,
            'rtmp://live.twitch.tv/app',
            twitchKey
          );
          
          await storage.createSimulcastTarget({
            eventId,
            platform: 'twitch',
            targetUrl: 'rtmp://live.twitch.tv/app',
            streamKey: twitchKey,
            muxTargetId: twitchTarget.id,
          });

          results.push({ platform: 'twitch', status: 'added' });
        } catch (error) {
          results.push({ platform: 'twitch', status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      if (results.length === 0) {
        return res.status(400).json({ error: "No streaming keys configured. Please contact admin." });
      }

      res.json({ results });
    } catch (error) {
      console.error("Error adding simulcast targets:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to add simulcast targets" });
    }
  });

  return httpServer;
}
