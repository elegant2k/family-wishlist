import { useQuery } from "@tanstack/react-query";
import { Clock, ExternalLink, Gift } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/auth";

interface Activity {
  id: number;
  action: string;
  itemName?: string;
  createdAt: string;
  user: { id: number; name: string } | null;
  targetUser: { id: number; name: string } | null;
}

export function ActivityFeed() {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['/api/activities'],
    queryFn: async () => {
      const response = await fetch('/api/activities', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json() as Promise<Activity[]>;
    }
  });

  const formatAction = (activity: Activity) => {
    switch (activity.action) {
      case 'added_item':
        return `la til ${activity.itemName} i sin ønskeliste`;
      case 'reserved_item':
        return `reserverte ${activity.itemName} fra ${activity.targetUser?.name}s ønskeliste`;
      case 'created_group':
        return 'opprettet familiegruppen';
      case 'joined_group':
        return 'ble med i familiegruppen';
      default:
        return activity.action;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Akkurat nå';
    if (diffInHours < 24) return `${diffInHours} timer siden`;
    if (diffInHours < 48) return '1 dag siden';
    return `${Math.floor(diffInHours / 24)} dager siden`;
  };

  const getActionIcon = (action: string) => {
    if (action === 'reserved_item') {
      return <Gift className="text-secondary" size={16} />;
    }
    return (
      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
        <ExternalLink size={14} />
      </Button>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 text-gray-400" size={20} />
            Siste aktivitet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4">
                <div className="h-8 w-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 text-gray-400" size={20} />
          Siste aktivitet
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Ingen aktivitet ennå</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => (
              <div key={activity.id} className="py-4 flex items-center space-x-4">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                  {activity.user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user?.name || 'Ukjent bruker'}</span>
                    {' '}
                    <span>{formatAction(activity)}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimestamp(activity.createdAt)}
                  </p>
                </div>
                {getActionIcon(activity.action)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
