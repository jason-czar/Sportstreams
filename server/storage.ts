import { 
  events, cameras, switchLogs, simulcastTargets,
  type Event, type InsertEvent,
  type Camera, type InsertCamera,
  type SwitchLog, type InsertSwitchLog,
  type SimulcastTarget, type InsertSimulcastTarget
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Events
  createEvent(event: InsertEvent): Promise<Event>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventByCode(eventCode: string): Promise<Event | undefined>;
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
}

export class DatabaseStorage implements IStorage {
  // Events
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(insertEvent)
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

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const [event] = await db
      .update(events)
      .set(updates)
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
}

export const storage = new DatabaseStorage();
