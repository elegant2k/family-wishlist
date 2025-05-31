import { useState } from "react";
import { Edit, Trash2, Gift, StickyNote, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { WishlistItem, User } from "@shared/schema";

interface WishlistCardProps {
  user: User;
  items: (WishlistItem & { canEdit?: boolean })[];
  isCurrentUser: boolean;
  onEditItem?: (item: WishlistItem) => void;
}

export function WishlistCard({ user, items, isCurrentUser, onEditItem }: WishlistCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reserveMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest('POST', `/api/wishlist-items/${itemId}/reserve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlists/family'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      toast({ title: "Produktet er reservert!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Kunne ikke reservere", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest('DELETE', `/api/wishlist-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlists/my'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wishlists/family'] });
      toast({ title: "Ønsket ble slettet" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Kunne ikke slette", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-400';
      case 'medium': return 'bg-yellow-400';
      case 'low': return 'bg-green-400';
      default: return 'bg-gray-400';
    }
  };

  const getCardGradient = (isCurrentUser: boolean, index: number) => {
    if (isCurrentUser) {
      return "bg-gradient-to-r from-primary to-indigo-600";
    }
    
    const gradients = [
      "bg-gradient-to-r from-secondary to-green-600",
      "bg-gradient-to-r from-pink-500 to-purple-600",
      "bg-gradient-to-r from-orange-500 to-red-600",
      "bg-gradient-to-r from-blue-500 to-cyan-600"
    ];
    
    return gradients[index % gradients.length];
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '';
    return `${price.toLocaleString('no-NO')} kr`;
  };

  return (
    <Card className="overflow-hidden">
      <div className={`${getCardGradient(isCurrentUser, user.id)} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-lg font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-white text-opacity-80 text-sm">
                {isCurrentUser ? "Min ønskeliste" : ""}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-white bg-opacity-20 text-white">
            {items.length} ønsker
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-3">
          {items.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="flex items-center space-x-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </h4>
                {item.price && (
                  <p className="text-sm text-gray-500">{formatPrice(item.price)}</p>
                )}
                <div className="flex items-center space-x-2 mt-1">
                  <span 
                    className={`inline-block w-2 h-2 rounded-full ${getPriorityColor(item.priority)}`}
                    title={`${item.priority} prioritet`}
                  />
                  {item.category && (
                    <span className="text-xs text-gray-400">{item.category}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {isCurrentUser ? (
                  // Edit/delete buttons for own items
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditItem?.(item)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ) : (
                  // Reserve/note buttons for other's items
                  <div className="flex space-x-2">
                    {item.isReserved ? (
                      <Badge variant="secondary" className="bg-accent text-white">
                        <Gift size={12} className="mr-1" />
                        Reservert
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => reserveMutation.mutate(item.id)}
                        disabled={reserveMutation.isPending}
                        className="bg-secondary hover:bg-green-600 text-white text-xs px-3 py-1"
                      >
                        <Gift size={12} className="mr-1" />
                        Jeg kjøper
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-gray-600"
                      title="Legg til hemmelig notat"
                    >
                      <StickyNote size={14} />
                    </Button>
                  </div>
                )}

                {item.storeLink && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <a href={item.storeLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {items.length > 3 && (
          <Button 
            variant="ghost" 
            className={`w-full mt-4 ${isCurrentUser ? 'text-primary hover:text-indigo-600' : 'text-secondary hover:text-green-600'}`}
          >
            Se alle ønsker <ExternalLink className="ml-1" size={14} />
          </Button>
        )}

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Ingen ønsker ennå</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
