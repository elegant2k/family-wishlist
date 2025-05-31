import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertFamilyGroupSchema, insertWishlistItemSchema, insertSecretNoteSchema } from "@shared/schema";
import { z } from "zod";

// Generate a random invite code
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Session user type
interface SessionUser {
  id: number;
  name: string;
  email: string;
  familyGroupId: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

// Simple session middleware
const sessions = new Map<string, SessionUser>();

function sessionMiddleware(req: any, res: any, next: any) {
  const sessionId = req.headers['x-session-id'];
  if (sessionId && sessions.has(sessionId)) {
    req.user = sessions.get(sessionId);
  }
  next();
}

function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(sessionMiddleware);

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists (only if email provided)
      if (userData.email) {
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser) {
          return res.status(400).json({ message: "Bruker med denne e-postadressen finnes allerede" });
        }
      }

      const user = await storage.createUser(userData);
      
      // Create session
      const sessionId = Math.random().toString(36);
      const sessionUser: SessionUser = {
        id: user.id,
        name: user.name,
        email: user.email || null,
        familyGroupId: user.familyGroupId
      };
      sessions.set(sessionId, sessionUser);

      res.json({ user: sessionUser, sessionId });
    } catch (error) {
      res.status(400).json({ message: "Ugyldig data", error });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "E-postadresse er påkrevd" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Ugyldig innlogging" });
      }

      // Create session
      const sessionId = Math.random().toString(36);
      const sessionUser: SessionUser = {
        id: user.id,
        name: user.name,
        email: user.email || null,
        familyGroupId: user.familyGroupId
      };
      sessions.set(sessionId, sessionUser);

      res.json({ user: sessionUser, sessionId });
    } catch (error) {
      res.status(400).json({ message: "Innlogging feilet", error });
    }
  });

  // Family code login for children
  app.post("/api/auth/login-child", async (req, res) => {
    try {
      const { familyCode, name, password } = req.body;
      
      if (!familyCode || !name) {
        return res.status(400).json({ message: "Familiekode og navn er påkrevd" });
      }
      
      const user = await storage.getUserByFamilyCode(familyCode, name);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Ugyldig familiekode, navn eller passord" });
      }

      // Create session
      const sessionId = Math.random().toString(36);
      const sessionUser: SessionUser = {
        id: user.id,
        name: user.name,
        email: user.email || null,
        familyGroupId: user.familyGroupId
      };
      sessions.set(sessionId, sessionUser);

      res.json({ user: sessionUser, sessionId });
    } catch (error) {
      res.status(400).json({ message: "Innlogging feilet", error });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    const sessionId = req.headers['x-session-id'] as string;
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    res.json({ user: req.user });
  });

  // Family group routes
  app.post("/api/family-groups", requireAuth, async (req, res) => {
    try {
      const groupData = insertFamilyGroupSchema.parse(req.body);
      const inviteCode = generateInviteCode();
      
      const group = await storage.createFamilyGroup({ ...groupData, inviteCode });
      
      // Add user to the group
      await storage.updateUserFamilyGroup(req.user!.id, group.id);
      
      // Update session
      req.user!.familyGroupId = group.id;
      const sessionId = req.headers['x-session-id'] as string;
      sessions.set(sessionId, req.user!);

      // Create activity
      await storage.createActivity({
        userId: req.user!.id,
        familyGroupId: group.id,
        action: "created_group"
      });

      res.json(group);
    } catch (error) {
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  app.post("/api/family-groups/join", requireAuth, async (req, res) => {
    try {
      const { inviteCode } = req.body;
      
      const group = await storage.getFamilyGroupByInviteCode(inviteCode);
      if (!group) {
        return res.status(404).json({ message: "Invalid invite code" });
      }

      await storage.updateUserFamilyGroup(req.user!.id, group.id);
      
      // Update session
      req.user!.familyGroupId = group.id;
      const sessionId = req.headers['x-session-id'] as string;
      sessions.set(sessionId, req.user!);

      // Create activity
      await storage.createActivity({
        userId: req.user!.id,
        familyGroupId: group.id,
        action: "joined_group"
      });

      res.json(group);
    } catch (error) {
      res.status(400).json({ message: "Failed to join group", error });
    }
  });

  app.get("/api/family-groups/current", requireAuth, async (req, res) => {
    if (!req.user!.familyGroupId) {
      return res.status(404).json({ message: "No family group" });
    }

    const group = await storage.getFamilyGroup(req.user!.familyGroupId);
    if (!group) {
      return res.status(404).json({ message: "Family group not found" });
    }

    const members = await storage.getFamilyMembers(group.id);
    res.json({ ...group, members });
  });

  // Wishlist routes
  app.get("/api/wishlists/my", requireAuth, async (req, res) => {
    const items = await storage.getWishlistItems(req.user!.id);
    res.json(items);
  });

  app.get("/api/wishlists/family", requireAuth, async (req, res) => {
    if (!req.user!.familyGroupId) {
      return res.status(404).json({ message: "No family group" });
    }

    const members = await storage.getFamilyMembers(req.user!.familyGroupId);
    const familyWishlists = await Promise.all(
      members.map(async (member) => {
        const items = await storage.getWishlistItems(member.id);
        return {
          user: member,
          items: items.map(item => ({
            ...item,
            canEdit: item.userId === req.user!.id
          }))
        };
      })
    );

    res.json(familyWishlists);
  });

  app.post("/api/wishlist-items", requireAuth, async (req, res) => {
    try {
      const itemData = insertWishlistItemSchema.parse(req.body);
      
      const item = await storage.createWishlistItem(req.user!.id, itemData);

      // Create activity if in family group
      if (req.user!.familyGroupId) {
        await storage.createActivity({
          userId: req.user!.id,
          familyGroupId: req.user!.familyGroupId,
          action: "added_item",
          itemName: item.name
        });
      }

      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  app.put("/api/wishlist-items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;

      const existingItem = await storage.getWishlistItem(id);
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Check ownership
      if (existingItem.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const item = await storage.updateWishlistItem(id, updates);
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Update failed", error });
    }
  });

  app.delete("/api/wishlist-items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const existingItem = await storage.getWishlistItem(id);
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Check ownership
      if (existingItem.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await storage.deleteWishlistItem(id);
      res.json({ message: "Item deleted" });
    } catch (error) {
      res.status(400).json({ message: "Delete failed", error });
    }
  });

  app.post("/api/wishlist-items/:id/reserve", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const existingItem = await storage.getWishlistItem(id);
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found" });
      }

      // Can't reserve your own items
      if (existingItem.userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot reserve your own item" });
      }

      if (existingItem.isReserved) {
        return res.status(400).json({ message: "Item already reserved" });
      }

      const item = await storage.reserveWishlistItem(id, req.user!.id);

      // Create activity
      if (req.user!.familyGroupId) {
        await storage.createActivity({
          userId: req.user!.id,
          familyGroupId: req.user!.familyGroupId,
          action: "reserved_item",
          itemName: item?.name,
          targetUserId: existingItem.userId
        });
      }

      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Reserve failed", error });
    }
  });

  app.post("/api/wishlist-items/:id/unreserve", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const existingItem = await storage.getWishlistItem(id);
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (!existingItem.isReserved || existingItem.reservedByUserId !== req.user!.id) {
        return res.status(400).json({ message: "Cannot unreserve this item" });
      }

      const item = await storage.unreserveWishlistItem(id);
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: "Unreserve failed", error });
    }
  });

  // Activities route
  app.get("/api/activities", requireAuth, async (req, res) => {
    if (!req.user!.familyGroupId) {
      return res.json([]);
    }

    const activities = await storage.getFamilyActivities(req.user!.familyGroupId);
    
    // Enrich activities with user info
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        const user = await storage.getUser(activity.userId);
        const targetUser = activity.targetUserId ? await storage.getUser(activity.targetUserId) : null;
        
        return {
          ...activity,
          user: user ? { id: user.id, name: user.name } : null,
          targetUser: targetUser ? { id: targetUser.id, name: targetUser.name } : null
        };
      })
    );

    res.json(enrichedActivities);
  });

  // Secret notes routes
  app.post("/api/secret-notes", requireAuth, async (req, res) => {
    try {
      const noteData = insertSecretNoteSchema.parse(req.body);
      
      // Verify the item exists and user isn't the owner
      const item = await storage.getWishlistItem(noteData.wishlistItemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (item.userId === req.user!.id) {
        return res.status(400).json({ message: "Cannot add notes to your own items" });
      }

      const note = await storage.createSecretNote(req.user!.id, noteData);
      res.json(note);
    } catch (error) {
      res.status(400).json({ message: "Invalid data", error });
    }
  });

  app.get("/api/secret-notes/:itemId", requireAuth, async (req, res) => {
    const itemId = parseInt(req.params.itemId);
    const notes = await storage.getSecretNotes(itemId, req.user!.id);
    res.json(notes);
  });

  const httpServer = createServer(app);
  return httpServer;
}
