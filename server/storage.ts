import { 
  users, 
  familyGroups, 
  wishlistItems, 
  activities, 
  secretNotes,
  type User, 
  type InsertUser, 
  type FamilyGroup, 
  type InsertFamilyGroup,
  type WishlistItem,
  type InsertWishlistItem,
  type Activity,
  type SecretNote,
  type InsertSecretNote
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFamilyCode(familyCode: string, name: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserFamilyGroup(userId: number, familyGroupId: number): Promise<User | undefined>;

  // Family group methods
  getFamilyGroup(id: number): Promise<FamilyGroup | undefined>;
  getFamilyGroupByInviteCode(inviteCode: string): Promise<FamilyGroup | undefined>;
  createFamilyGroup(group: InsertFamilyGroup & { inviteCode: string }): Promise<FamilyGroup>;
  getFamilyMembers(familyGroupId: number): Promise<User[]>;

  // Wishlist methods
  getWishlistItems(userId: number): Promise<WishlistItem[]>;
  getWishlistItem(id: number): Promise<WishlistItem | undefined>;
  createWishlistItem(userId: number, item: InsertWishlistItem): Promise<WishlistItem>;
  updateWishlistItem(id: number, updates: Partial<WishlistItem>): Promise<WishlistItem | undefined>;
  deleteWishlistItem(id: number): Promise<boolean>;
  reserveWishlistItem(id: number, reservedByUserId: number): Promise<WishlistItem | undefined>;
  unreserveWishlistItem(id: number): Promise<WishlistItem | undefined>;

  // Activity methods
  createActivity(activity: { userId: number; familyGroupId: number; action: string; itemName?: string; targetUserId?: number }): Promise<Activity>;
  getFamilyActivities(familyGroupId: number, limit?: number): Promise<Activity[]>;

  // Secret notes methods
  createSecretNote(userId: number, note: InsertSecretNote): Promise<SecretNote>;
  getSecretNotes(wishlistItemId: number, userId: number): Promise<SecretNote[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private familyGroups: Map<number, FamilyGroup>;
  private wishlistItems: Map<number, WishlistItem>;
  private activities: Map<number, Activity>;
  private secretNotes: Map<number, SecretNote>;
  private currentUserId: number;
  private currentFamilyGroupId: number;
  private currentWishlistItemId: number;
  private currentActivityId: number;
  private currentSecretNoteId: number;

  constructor() {
    this.users = new Map();
    this.familyGroups = new Map();
    this.wishlistItems = new Map();
    this.activities = new Map();
    this.secretNotes = new Map();
    this.currentUserId = 1;
    this.currentFamilyGroupId = 1;
    this.currentWishlistItemId = 1;
    this.currentActivityId = 1;
    this.currentSecretNoteId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      familyGroupId: null 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserFamilyGroup(userId: number, familyGroupId: number): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, familyGroupId };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getFamilyGroup(id: number): Promise<FamilyGroup | undefined> {
    return this.familyGroups.get(id);
  }

  async getFamilyGroupByInviteCode(inviteCode: string): Promise<FamilyGroup | undefined> {
    return Array.from(this.familyGroups.values()).find(group => group.inviteCode === inviteCode);
  }

  async createFamilyGroup(group: InsertFamilyGroup & { inviteCode: string }): Promise<FamilyGroup> {
    const id = this.currentFamilyGroupId++;
    const familyGroup: FamilyGroup = { 
      ...group, 
      id,
      createdAt: new Date()
    };
    this.familyGroups.set(id, familyGroup);
    return familyGroup;
  }

  async getFamilyMembers(familyGroupId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.familyGroupId === familyGroupId);
  }

  async getWishlistItems(userId: number): Promise<WishlistItem[]> {
    return Array.from(this.wishlistItems.values())
      .filter(item => item.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getWishlistItem(id: number): Promise<WishlistItem | undefined> {
    return this.wishlistItems.get(id);
  }

  async createWishlistItem(userId: number, item: InsertWishlistItem): Promise<WishlistItem> {
    const id = this.currentWishlistItemId++;
    const wishlistItem: WishlistItem = { 
      ...item, 
      id, 
      userId,
      isReserved: false,
      reservedByUserId: null,
      createdAt: new Date()
    };
    this.wishlistItems.set(id, wishlistItem);
    return wishlistItem;
  }

  async updateWishlistItem(id: number, updates: Partial<WishlistItem>): Promise<WishlistItem | undefined> {
    const item = this.wishlistItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, ...updates };
    this.wishlistItems.set(id, updatedItem);
    return updatedItem;
  }

  async deleteWishlistItem(id: number): Promise<boolean> {
    return this.wishlistItems.delete(id);
  }

  async reserveWishlistItem(id: number, reservedByUserId: number): Promise<WishlistItem | undefined> {
    const item = this.wishlistItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, isReserved: true, reservedByUserId };
    this.wishlistItems.set(id, updatedItem);
    return updatedItem;
  }

  async unreserveWishlistItem(id: number): Promise<WishlistItem | undefined> {
    const item = this.wishlistItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, isReserved: false, reservedByUserId: null };
    this.wishlistItems.set(id, updatedItem);
    return updatedItem;
  }

  async createActivity(activity: { userId: number; familyGroupId: number; action: string; itemName?: string; targetUserId?: number }): Promise<Activity> {
    const id = this.currentActivityId++;
    const activityRecord: Activity = { 
      ...activity, 
      id,
      createdAt: new Date()
    };
    this.activities.set(id, activityRecord);
    return activityRecord;
  }

  async getFamilyActivities(familyGroupId: number, limit = 10): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.familyGroupId === familyGroupId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async createSecretNote(userId: number, note: InsertSecretNote): Promise<SecretNote> {
    const id = this.currentSecretNoteId++;
    const secretNote: SecretNote = { 
      ...note, 
      id, 
      userId,
      createdAt: new Date()
    };
    this.secretNotes.set(id, secretNote);
    return secretNote;
  }

  async getSecretNotes(wishlistItemId: number, userId: number): Promise<SecretNote[]> {
    return Array.from(this.secretNotes.values()).filter(
      note => note.wishlistItemId === wishlistItemId && note.userId === userId
    );
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByFamilyCode(familyCode: string, name: string): Promise<User | undefined> {
    const result = await db.select().from(users)
      .where(eq(users.familyCode, familyCode));
    const user = result.find(u => u.name === name);
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserFamilyGroup(userId: number, familyGroupId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ familyGroupId })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getFamilyGroup(id: number): Promise<FamilyGroup | undefined> {
    const [group] = await db.select().from(familyGroups).where(eq(familyGroups.id, id));
    return group || undefined;
  }

  async getFamilyGroupByInviteCode(inviteCode: string): Promise<FamilyGroup | undefined> {
    const [group] = await db.select().from(familyGroups).where(eq(familyGroups.inviteCode, inviteCode));
    return group || undefined;
  }

  async createFamilyGroup(group: InsertFamilyGroup & { inviteCode: string }): Promise<FamilyGroup> {
    const [familyGroup] = await db
      .insert(familyGroups)
      .values(group)
      .returning();
    return familyGroup;
  }

  async getFamilyMembers(familyGroupId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.familyGroupId, familyGroupId));
  }

  async getWishlistItems(userId: number): Promise<WishlistItem[]> {
    return await db.select().from(wishlistItems)
      .where(eq(wishlistItems.userId, userId))
      .orderBy(desc(wishlistItems.createdAt));
  }

  async getWishlistItem(id: number): Promise<WishlistItem | undefined> {
    const [item] = await db.select().from(wishlistItems).where(eq(wishlistItems.id, id));
    return item || undefined;
  }

  async createWishlistItem(userId: number, item: InsertWishlistItem): Promise<WishlistItem> {
    const [wishlistItem] = await db
      .insert(wishlistItems)
      .values({ ...item, userId })
      .returning();
    return wishlistItem;
  }

  async updateWishlistItem(id: number, updates: Partial<WishlistItem>): Promise<WishlistItem | undefined> {
    const [item] = await db
      .update(wishlistItems)
      .set(updates)
      .where(eq(wishlistItems.id, id))
      .returning();
    return item || undefined;
  }

  async deleteWishlistItem(id: number): Promise<boolean> {
    const result = await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  async reserveWishlistItem(id: number, reservedByUserId: number): Promise<WishlistItem | undefined> {
    const [item] = await db
      .update(wishlistItems)
      .set({ isReserved: true, reservedByUserId })
      .where(eq(wishlistItems.id, id))
      .returning();
    return item || undefined;
  }

  async unreserveWishlistItem(id: number): Promise<WishlistItem | undefined> {
    const [item] = await db
      .update(wishlistItems)
      .set({ isReserved: false, reservedByUserId: null })
      .where(eq(wishlistItems.id, id))
      .returning();
    return item || undefined;
  }

  async createActivity(activity: { userId: number; familyGroupId: number; action: string; itemName?: string; targetUserId?: number }): Promise<Activity> {
    const [activityRecord] = await db
      .insert(activities)
      .values({
        ...activity,
        itemName: activity.itemName || null,
        targetUserId: activity.targetUserId || null
      })
      .returning();
    return activityRecord;
  }

  async getFamilyActivities(familyGroupId: number, limit = 10): Promise<Activity[]> {
    return await db.select().from(activities)
      .where(eq(activities.familyGroupId, familyGroupId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createSecretNote(userId: number, note: InsertSecretNote): Promise<SecretNote> {
    const [secretNote] = await db
      .insert(secretNotes)
      .values({ ...note, userId })
      .returning();
    return secretNote;
  }

  async getSecretNotes(wishlistItemId: number, userId: number): Promise<SecretNote[]> {
    return await db.select().from(secretNotes)
      .where(eq(secretNotes.wishlistItemId, wishlistItemId));
  }
}

export const storage = new DatabaseStorage();
