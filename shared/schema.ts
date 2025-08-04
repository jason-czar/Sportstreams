import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sportType: text("sport_type").notNull(),
  startDateTime: timestamp("start_date_time").notNull(),
  duration: integer("duration").notNull(), // in hours
  eventCode: text("event_code").notNull().unique(),
  muxStreamId: text("mux_stream_id"),
  playbackId: text("playback_id"),
  ingestUrl: text("ingest_url"),

  status: text("status").notNull().default("idle"), // idle, live, ended
  activeCamera: text("active_camera"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const cameras = pgTable("cameras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  streamKey: text("stream_key").notNull(),
  rtmpUrl: text("rtmp_url").notNull(),
  isLive: boolean("is_live").default(false),
  thumbnailUrl: text("thumbnail_url"),
  quality: text("quality").default("720p"),
  operatorName: text("operator_name"),
  joinedAt: timestamp("joined_at").default(sql`now()`),
});

export const switchLogs = pgTable("switch_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  cameraId: text("camera_id").notNull().references(() => cameras.id, { onDelete: "cascade" }),
  switchedAt: timestamp("switched_at").default(sql`now()`),
});

export const simulcastTargets = pgTable("simulcast_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // youtube, twitch
  targetUrl: text("target_url").notNull(),
  streamKey: text("stream_key").notNull(),
  muxTargetId: text("mux_target_id"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Relations
export const eventsRelations = relations(events, ({ many }) => ({
  cameras: many(cameras),
  switchLogs: many(switchLogs),
  simulcastTargets: many(simulcastTargets),
}));

export const camerasRelations = relations(cameras, ({ one, many }) => ({
  event: one(events, {
    fields: [cameras.eventId],
    references: [events.id],
  }),
  switchLogs: many(switchLogs),
}));

export const switchLogsRelations = relations(switchLogs, ({ one }) => ({
  event: one(events, {
    fields: [switchLogs.eventId],
    references: [events.id],
  }),
  camera: one(cameras, {
    fields: [switchLogs.cameraId],
    references: [cameras.id],
  }),
}));

export const simulcastTargetsRelations = relations(simulcastTargets, ({ one }) => ({
  event: one(events, {
    fields: [simulcastTargets.eventId],
    references: [events.id],
  }),
}));

// Insert schemas
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertCameraSchema = createInsertSchema(cameras).omit({
  id: true,
  isLive: true,
  thumbnailUrl: true,
  joinedAt: true,
});

export const insertSwitchLogSchema = createInsertSchema(switchLogs).omit({
  id: true,
  switchedAt: true,
});

export const insertSimulcastTargetSchema = createInsertSchema(simulcastTargets).omit({
  id: true,
  status: true,
  createdAt: true,
});

// Types
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Camera = typeof cameras.$inferSelect;
export type InsertCamera = z.infer<typeof insertCameraSchema>;
export type SwitchLog = typeof switchLogs.$inferSelect;
export type InsertSwitchLog = z.infer<typeof insertSwitchLogSchema>;
export type SimulcastTarget = typeof simulcastTargets.$inferSelect;
export type InsertSimulcastTarget = z.infer<typeof insertSimulcastTargetSchema>;
