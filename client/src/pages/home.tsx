import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Share, Filter, Users, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/navigation";
import { WishlistCard } from "@/components/wishlist-card";
import { AddItemModal } from "@/components/add-item-modal";
import { ActivityFeed } from "@/components/activity-feed";
import { getAuthHeaders } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FamilyGroup {
  id: number;
  name: string;
  inviteCode: string;
  members: Array<{
    id: number;
    name: string;
    email: string;
  }>;
}

interface User {
  id: number;
  name: string;
  email: string;
  familyGroupId: number | null;
}

interface WishlistItem {
  id: number;
  userId: number;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  priority: string;
  storeLink?: string;
  imageUrl?: string;
  isReserved: boolean;
  reservedByUserId?: number | null;
  createdAt: string;
  canEdit?: boolean;
}

interface FamilyWishlist {
  user: User;
  items: WishlistItem[];
}

interface HomeProps {
  user: User;
}

export default function Home({ user }: HomeProps) {
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [joinGroupModalOpen, setJoinGroupModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch family group
  const { data: familyGroup } = useQuery({
    queryKey: ['/api/family-groups/current'],
    queryFn: async () => {
      const response = await fetch('/api/family-groups/current', {
        headers: getAuthHeaders()
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to fetch family group');
      return response.json() as Promise<FamilyGroup>;
    },
    enabled: !!user.familyGroupId
  });

  // Fetch family wishlists
  const { data: familyWishlists = [] } = useQuery({
    queryKey: ['/api/wishlists/family'],
    queryFn: async () => {
      const response = await fetch('/api/wishlists/family', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch family wishlists');
      return response.json() as Promise<FamilyWishlist[]>;
    },
    enabled: !!user.familyGroupId
  });

  // Create family group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest('POST', '/api/family-groups', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-groups/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: "Familiegruppe opprettet!" });
      setCreateGroupModalOpen(false);
      setGroupName("");
    },
    onError: (error: any) => {
      toast({
        title: "Kunne ikke opprette gruppe",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Join family group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest('POST', '/api/family-groups/join', { inviteCode: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/family-groups/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({ title: "Ble med i familiegruppen!" });
      setJoinGroupModalOpen(false);
      setInviteCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Kunne ikke bli med i gruppen",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleCreateGroup = () => {
    if (groupName.trim()) {
      createGroupMutation.mutate(groupName.trim());
    }
  };

  const handleJoinGroup = () => {
    if (inviteCode.trim()) {
      joinGroupMutation.mutate(inviteCode.trim());
    }
  };

  const copyInviteCode = () => {
    if (familyGroup?.inviteCode) {
      navigator.clipboard.writeText(familyGroup.inviteCode);
      toast({ title: "Invitasjonskode kopiert!" });
    }
  };

  const filteredWishlists = familyWishlists.map(wishlist => ({
    ...wishlist,
    items: wishlist.items.filter(item => 
      !categoryFilter || item.category === categoryFilter
    ).sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        case 'price':
          return (b.price || 0) - (a.price || 0);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    })
  }));

  // If user is not in a family group, show setup screen
  if (!user.familyGroupId || !familyGroup) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation 
          user={user} 
          notificationCount={0} 
          onInviteFamily={() => {}}
        />
        
        <main className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center mb-8">
            <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Velkommen til FamilieØnsker!
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              For å begynne må du enten opprette en ny familiegruppe eller bli med i en eksisterende gruppe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Opprett ny familiegruppe</h3>
              <p className="text-gray-600 text-sm mb-4">
                Start en ny familiegruppe og inviter andre familiemedlemmer.
              </p>
              <Button 
                onClick={() => setCreateGroupModalOpen(true)}
                className="w-full"
              >
                Opprett gruppe
              </Button>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Bli med i eksisterende gruppe</h3>
              <p className="text-gray-600 text-sm mb-4">
                Har du fått en invitasjonskode fra et familiemedlem?
              </p>
              <Button 
                variant="outline" 
                onClick={() => setJoinGroupModalOpen(true)}
                className="w-full"
              >
                Bli med i gruppe
              </Button>
            </Card>
          </div>
        </main>

        {/* Create Group Modal */}
        <Dialog open={createGroupModalOpen} onOpenChange={setCreateGroupModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opprett familiegruppe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="groupName">Gruppenavn</Label>
                <Input
                  id="groupName"
                  placeholder="F.eks. Hansen Familien"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setCreateGroupModalOpen(false)}
                  className="flex-1"
                >
                  Avbryt
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || createGroupMutation.isPending}
                  className="flex-1"
                >
                  {createGroupMutation.isPending ? "Oppretter..." : "Opprett gruppe"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Join Group Modal */}
        <Dialog open={joinGroupModalOpen} onOpenChange={setJoinGroupModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bli med i familiegruppe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="inviteCode">Invitasjonskode</Label>
                <Input
                  id="inviteCode"
                  placeholder="Skriv inn 6-sifret kode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setJoinGroupModalOpen(false)}
                  className="flex-1"
                >
                  Avbryt
                </Button>
                <Button
                  onClick={handleJoinGroup}
                  disabled={!inviteCode.trim() || joinGroupMutation.isPending}
                  className="flex-1"
                >
                  {joinGroupMutation.isPending ? "Blir med..." : "Bli med"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        user={user} 
        notificationCount={0} 
        onInviteFamily={() => setInviteModalOpen(true)}
      />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Family Group Header */}
        <Card className="mb-8 bg-gradient-to-r from-warm to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {familyGroup.name}
                </h2>
                <p className="text-gray-600">
                  {familyGroup.members.length} medlemmer • Invitasjonskode: {familyGroup.inviteCode}
                </p>
                <div className="flex items-center mt-3 space-x-2">
                  {familyGroup.members.slice(0, 5).map((member) => (
                    <div
                      key={member.id}
                      className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium border-2 border-white"
                      title={member.name}
                    >
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {familyGroup.members.length > 5 && (
                    <span className="text-gray-500 text-sm">
                      +{familyGroup.members.length - 5} mer
                    </span>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setInviteModalOpen(true)}
                className="bg-primary text-white hover:bg-indigo-600"
              >
                <Users className="mr-2" size={16} />
                Inviter familie
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => setAddItemModalOpen(true)}
              className="bg-secondary text-white hover:bg-green-600"
            >
              <Plus className="mr-2" size={16} />
              Legg til ønske
            </Button>
            <Button variant="outline">
              <Share className="mr-2" size={16} />
              Del ønskeliste
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Alle kategorier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Alle kategorier</SelectItem>
                <SelectItem value="clothes">Klær</SelectItem>
                <SelectItem value="electronics">Elektronikk</SelectItem>
                <SelectItem value="books">Bøker</SelectItem>
                <SelectItem value="toys">Leker</SelectItem>
                <SelectItem value="sport">Sport</SelectItem>
                <SelectItem value="music">Musikk</SelectItem>
                <SelectItem value="home">Hjem</SelectItem>
                <SelectItem value="other">Annet</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Filter size={16} />
              <span>Sorter:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Nyeste</SelectItem>
                  <SelectItem value="priority">Prioritet</SelectItem>
                  <SelectItem value="price">Pris</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Family Wishlists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {filteredWishlists.map((wishlist, index) => (
            <WishlistCard
              key={wishlist.user.id}
              user={wishlist.user}
              items={wishlist.items}
              isCurrentUser={wishlist.user.id === user.id}
            />
          ))}
        </div>

        {/* Recent Activity Feed */}
        <ActivityFeed />
      </main>

      {/* Add Item Modal */}
      <AddItemModal 
        open={addItemModalOpen} 
        onOpenChange={setAddItemModalOpen} 
      />

      {/* Invite Family Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter familiemedlemmer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Del denne invitasjonskoden med familiemedlemmer slik at de kan bli med i gruppen:
            </p>
            <div className="flex items-center space-x-2">
              <Input
                value={familyGroup.inviteCode}
                readOnly
                className="font-mono text-lg text-center"
              />
              <Button onClick={copyInviteCode}>
                <Code className="mr-2" size={16} />
                Kopier
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Koden kan brukes av alle som ønsker å bli med i familiegruppen din.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
