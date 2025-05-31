interface User {
  id: number;
  name: string;
  email: string;
  familyGroupId: number | null;
}

interface AuthState {
  user: User | null;
  sessionId: string | null;
}

let authState: AuthState = {
  user: null,
  sessionId: localStorage.getItem('sessionId')
};

const authListeners: ((state: AuthState) => void)[] = [];

export const auth = {
  getState: () => authState,
  
  subscribe: (listener: (state: AuthState) => void) => {
    authListeners.push(listener);
    return () => {
      const index = authListeners.indexOf(listener);
      if (index > -1) authListeners.splice(index, 1);
    };
  },

  login: async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const { user, sessionId } = await response.json();
    authState = { user, sessionId };
    localStorage.setItem('sessionId', sessionId);
    authListeners.forEach(listener => listener(authState));
    return user;
  },

  register: async (name: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const { user, sessionId } = await response.json();
    authState = { user, sessionId };
    localStorage.setItem('sessionId', sessionId);
    authListeners.forEach(listener => listener(authState));
    return user;
  },

  logout: async () => {
    if (authState.sessionId) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'X-Session-Id': authState.sessionId }
      });
    }
    
    authState = { user: null, sessionId: null };
    localStorage.removeItem('sessionId');
    authListeners.forEach(listener => listener(authState));
  },

  checkAuth: async () => {
    if (!authState.sessionId) return null;

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'X-Session-Id': authState.sessionId }
      });

      if (response.ok) {
        const { user } = await response.json();
        authState = { ...authState, user };
        authListeners.forEach(listener => listener(authState));
        return user;
      } else {
        authState = { user: null, sessionId: null };
        localStorage.removeItem('sessionId');
        authListeners.forEach(listener => listener(authState));
        return null;
      }
    } catch (error) {
      authState = { user: null, sessionId: null };
      localStorage.removeItem('sessionId');
      authListeners.forEach(listener => listener(authState));
      return null;
    }
  }
};

// Helper to get session headers
export const getAuthHeaders = () => {
  const sessionId = authState.sessionId;
  return sessionId ? { 'X-Session-Id': sessionId } : {};
};
