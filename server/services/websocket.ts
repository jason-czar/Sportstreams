import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface WebSocketClient extends WebSocket {
  eventId?: string;
  userId?: string;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocketClient>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocketClient, req) => {
      console.log('WebSocket client connected');

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
        console.log('WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });
    });
  }

  private handleMessage(ws: WebSocketClient, message: any) {
    switch (message.type) {
      case 'join_event':
        this.joinEvent(ws, message.eventId, message.userId);
        break;
      case 'leave_event':
        this.leaveEvent(ws, message.eventId);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private joinEvent(ws: WebSocketClient, eventId: string, userId?: string) {
    ws.eventId = eventId;
    ws.userId = userId;

    if (!this.clients.has(eventId)) {
      this.clients.set(eventId, new Set());
    }
    
    this.clients.get(eventId)!.add(ws);
    console.log(`Client joined event ${eventId}`);
  }

  private leaveEvent(ws: WebSocketClient, eventId: string) {
    const eventClients = this.clients.get(eventId);
    if (eventClients) {
      eventClients.delete(ws);
      if (eventClients.size === 0) {
        this.clients.delete(eventId);
      }
    }
    
    ws.eventId = undefined;
    ws.userId = undefined;
  }

  private removeClient(ws: WebSocketClient) {
    if (ws.eventId) {
      this.leaveEvent(ws, ws.eventId);
    }
  }

  // Broadcast to all clients in an event
  broadcastToEvent(eventId: string, message: any) {
    const eventClients = this.clients.get(eventId);
    if (!eventClients) return;

    const messageStr = JSON.stringify(message);
    
    eventClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Broadcast camera update
  broadcastCameraUpdate(eventId: string, cameraId: string, isLive: boolean) {
    this.broadcastToEvent(eventId, {
      type: 'CAMERA_UPDATE',
      cameraId,
      isLive,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast program switch
  broadcastProgramSwitch(eventId: string, activeCameraId: string, programUrl: string) {
    this.broadcastToEvent(eventId, {
      type: 'PROGRAM_UPDATE',
      programUrl,
      activeCamera: activeCameraId,
      timestamp: new Date().toISOString()
    });
  }

  // Broadcast viewer count update
  broadcastViewerCount(eventId: string, count: number) {
    this.broadcastToEvent(eventId, {
      type: 'VIEWER_COUNT_UPDATE',
      count,
      timestamp: new Date().toISOString()
    });
  }
}

let wsService: WebSocketService;

export function initializeWebSocket(server: Server): WebSocketService {
  wsService = new WebSocketService(server);
  return wsService;
}

export function getWebSocketService(): WebSocketService {
  if (!wsService) {
    throw new Error('WebSocket service not initialized');
  }
  return wsService;
}
