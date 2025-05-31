import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  familyGroupId: integer("family_group_id"),
});

export const familyGroups = pgTable("family_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price"),
  category: text("category"),
  priority: text("priority").notNull().default("medium"),
  storeLink: text("store_link"),
  imageUrl: text("image_url"),
  isReserved: boolean("is_reserved").default(false),
  reservedByUserId: integer("reserved_by_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  familyGroupId: integer("family_group_id").notNull(),
  action: text("action").notNull(),
  itemName: text("item_name"),
  targetUserId: integer("target_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const secretNotes = pgTable("secret_notes", {
  id: serial("id").primaryKey(),
  wishlistItemId: integer("wishlist_item_id").notNull(),
  userId: integer("user_id").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
});

export const insertFamilyGroupSchema = createInsertSchema(familyGroups).pick({
  name: true,
});

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).pick({
  name: true,
  description: true,
  price: true,
  category: true,
  priority: true,
  storeLink: true,
  imageUrl: true,
});

export const insertSecretNoteSchema = createInsertSchema(secretNotes).pick({
  wishlistItemId: true,
  note: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type FamilyGroup = typeof familyGroups.$inferSelect;
export type InsertFamilyGroup = z.infer<typeof insertFamilyGroupSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type Activity = typeof activities.$inferSelect;
export type SecretNote = typeof secretNotes.$inferSelect;
export type InsertSecretNote = z.infer<typeof insertSecretNoteSchema>;
