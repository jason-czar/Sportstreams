import { 
  events, cameras, switchLogs, simulcastTargets, users, chatMessages,
  type Event, type InsertEvent,
  type Camera, type InsertCamera,
  type SwitchLog, type InsertSwitchLog,
  type SimulcastTarget, type InsertSimulcastTarget,
  type User, type InsertUser,
  type ChatMessage, type InsertChatMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  createUser(user: InsertUser): Promise<User>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Events
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventByCode(eventCode: string): Promise<Event | undefined>;
  getEventsByOrganizer(organizerId: string): Promise<Event[]>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  
  // Cameras
  createCamera(camera: InsertCamera): Promise<Camera>;
  getCamera(id: string): Promise<Camera | undefined>;
  getCamerasByEvent(eventId: string): Promise<Camera[]>;
  updateCamera(id: string, updates: Partial<Camera>): Promise<Camera | undefined>;
  deleteCamera(id: string): Promise<boolean>;
  
  // Switch Logs
  createSwitchLog(switchLog: InsertSwitchLog): Promise<SwitchLog>;
  getSwitchLogsByEvent(eventId: string): Promise<SwitchLog[]>;
  
  // Simulcast Targets
  createSimulcastTarget(target: InsertSimulcastTarget): Promise<SimulcastTarget>;
  getSimulcastTargetsByEvent(eventId: string): Promise<SimulcastTarget[]>;
  deleteSimulcastTarget(id: string): Promise<boolean>;
  
  // Chat Messages
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByEvent(eventId: string): Promise<ChatMessage[]>;
  moderateChatMessage(id: string, moderatorId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Events
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values({
        ...insertEvent,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return event;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async getEventByCode(eventCode: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.eventCode, eventCode));
    return event || undefined;
  }

  async getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.organizerId, organizerId));
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event || undefined;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Cameras
  async createCamera(insertCamera: InsertCamera): Promise<Camera> {
    const [camera] = await db
      .insert(cameras)
      .values(insertCamera)
      .returning();
    return camera;
  }

  async getCamera(id: string): Promise<Camera | undefined> {
    const [camera] = await db.select().from(cameras).where(eq(cameras.id, id));
    return camera || undefined;
  }

  async getCamerasByEvent(eventId: string): Promise<Camera[]> {
    return await db
      .select()
      .from(cameras)
      .where(eq(cameras.eventId, eventId))
      .orderBy(cameras.joinedAt);
  }

  async updateCamera(id: string, updates: Partial<Camera>): Promise<Camera | undefined> {
    const [camera] = await db
      .update(cameras)
      .set(updates)
      .where(eq(cameras.id, id))
      .returning();
    return camera || undefined;
  }

  async deleteCamera(id: string): Promise<boolean> {
    const result = await db.delete(cameras).where(eq(cameras.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Switch Logs
  async createSwitchLog(insertSwitchLog: InsertSwitchLog): Promise<SwitchLog> {
    const [switchLog] = await db
      .insert(switchLogs)
      .values(insertSwitchLog)
      .returning();
    return switchLog;
  }

  async getSwitchLogsByEvent(eventId: string): Promise<SwitchLog[]> {
    return await db
      .select()
      .from(switchLogs)
      .where(eq(switchLogs.eventId, eventId))
      .orderBy(desc(switchLogs.switchedAt));
  }

  // Simulcast Targets
  async createSimulcastTarget(insertTarget: InsertSimulcastTarget): Promise<SimulcastTarget> {
    const [target] = await db
      .insert(simulcastTargets)
      .values(insertTarget)
      .returning();
    return target;
  }

  async getSimulcastTargetsByEvent(eventId: string): Promise<SimulcastTarget[]> {
    return await db
      .select()
      .from(simulcastTargets)
      .where(eq(simulcastTargets.eventId, eventId));
  }

  async deleteSimulcastTarget(id: string): Promise<boolean> {
    const result = await db.delete(simulcastTargets).where(eq(simulcastTargets.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Chat Messages
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getChatMessagesByEvent(eventId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.eventId, eventId))
      .orderBy(desc(chatMessages.createdAt));
  }

  async moderateChatMessage(id: string, moderatorId: string): Promise<boolean> {
    const result = await db
      .update(chatMessages)
      .set({
        isModerated: true,
        moderatedBy: moderatorId,
      })
      .where(eq(chatMessages.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();
