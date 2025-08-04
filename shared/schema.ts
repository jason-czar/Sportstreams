import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Authentication tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  displayName: varchar("display_name", { length: 100 }),
  avatar: text("avatar"),
  role: text("role").notNull().default("user"), // user, organizer, admin
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
}, (table) => [
  index("IDX_session_expire").on(table.expire)
]);

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  sportType: text("sport_type").notNull(),
  startDateTime: timestamp("start_date_time").notNull(),
  duration: integer("duration").notNull(), // in hours
  eventCode: text("event_code").notNull().unique(),
  muxStreamId: text("mux_stream_id"),
  playbackId: text("playback_id"),
  ingestUrl: text("ingest_url"),
  
  // Event ownership and permissions (nullable initially for migration)
  organizerId: text("organizer_id").references(() => users.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").default(true),
  maxCameras: integer("max_cameras").default(9),
  
  status: text("status").notNull().default("idle"), // idle, live, ended
  activeCamera: text("active_camera"),
  viewerCount: integer("viewer_count").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const cameras = pgTable("cameras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  operatorId: text("operator_id").references(() => users.id, { onDelete: "set null" }),
  label: text("label").notNull(),
  streamKey: text("stream_key").notNull(),
  rtmpUrl: text("rtmp_url").notNull(),
  isLive: boolean("is_live").default(false),
  thumbnailUrl: text("thumbnail_url"),
  quality: text("quality").default("720p"),
  operatorName: text("operator_name"), // Fallback for anonymous operators
  deviceInfo: json("device_info"), // Mobile device info
  joinedAt: timestamp("joined_at").default(sql`now()`),
  lastActiveAt: timestamp("last_active_at").default(sql`now()`),
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

// Chat messages
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  username: text("username").notNull(),
  message: text("message").notNull(),
  isModerated: boolean("is_moderated").default(false),
  moderatedBy: text("moderated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),
  cameras: many(cameras),
  chatMessages: many(chatMessages),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
  }),
  cameras: many(cameras),
  switchLogs: many(switchLogs),
  simulcastTargets: many(simulcastTargets),
  chatMessages: many(chatMessages),
}));

export const camerasRelations = relations(cameras, ({ one, many }) => ({
  event: one(events, {
    fields: [cameras.eventId],
    references: [events.id],
  }),
  operator: one(users, {
    fields: [cameras.operatorId],
    references: [users.id],
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

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  event: one(events, {
    fields: [chatMessages.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  emailVerified: true,
  emailVerificationToken: true,
  passwordResetToken: true,
  passwordResetExpires: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  eventCode: true,
  muxStreamId: true,
  playbackId: true,
  ingestUrl: true,
  status: true,
  activeCamera: true,
  viewerCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCameraSchema = createInsertSchema(cameras).omit({
  id: true,
  isLive: true,
  thumbnailUrl: true,
  joinedAt: true,
  lastActiveAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  isModerated: true,
  moderatedBy: true,
  createdAt: true,
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

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Camera = typeof cameras.$inferSelect;
export type InsertCamera = z.infer<typeof insertCameraSchema>;
export type SwitchLog = typeof switchLogs.$inferSelect;
export type InsertSwitchLog = z.infer<typeof insertSwitchLogSchema>;
export type SimulcastTarget = typeof simulcastTargets.$inferSelect;
export type InsertSimulcastTarget = z.infer<typeof insertSimulcastTargetSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
