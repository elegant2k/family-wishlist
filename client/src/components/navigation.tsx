import { Heart, Bell, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

interface NavigationProps {
  user: any;
  notificationCount: number;
  onInviteFamily: () => void;
}

export function Navigation({ user, notificationCount, onInviteFamily }: NavigationProps) {
  const handleLogout = async () => {
    try {
      await auth.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary flex items-center">
                <Heart className="mr-2 text-red-400 fill-current" size={24} />
                FamilieØnsker
              </h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={onInviteFamily}
              className="flex items-center space-x-2"
            >
              <UserPlus size={16} />
              <span>Inviter familie</span>
            </Button>
            
            <button className="text-gray-600 hover:text-gray-900 relative">
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logg ut
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
