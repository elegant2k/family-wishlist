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

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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

export const storage = new MemStorage();
