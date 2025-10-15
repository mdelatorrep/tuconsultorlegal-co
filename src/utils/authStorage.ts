// Utilidades centralizadas para manejo de storage de autenticación
export interface AuthStorageData {
  token: string;
  user: any;
  expiresAt?: string;
}

export class AuthStorage {
  private static readonly KEYS = {
    ADMIN_TOKEN: 'admin_token',
    ADMIN_USER: 'admin_user',
    ADMIN_EXPIRES: 'admin_expires_at',
    LAWYER_TOKEN: 'lawyer_token',
    LAWYER_USER: 'lawyer_user',
    CHAT_SESSION: 'chat-session-id'
  } as const;

  // Métodos para administradores - Using secure storage with validation
  static getAdminAuth(): AuthStorageData | null {
    try {
      const token = sessionStorage.getItem(this.KEYS.ADMIN_TOKEN);
      const userData = sessionStorage.getItem(this.KEYS.ADMIN_USER);
      const expiresAt = sessionStorage.getItem(this.KEYS.ADMIN_EXPIRES);

      if (!token || !userData) return null;

      // Validate token format (JWT should have 3 parts separated by dots)
      if (!token.includes('.') || token.split('.').length !== 3) {
        console.warn('Invalid token format found, clearing admin auth');
        this.clearAdminAuth();
        return null;
      }

      // Parse and validate user data
      let user;
      try {
        user = JSON.parse(userData);
        if (!user.id || !user.email) {
          console.warn('Invalid user data found, clearing admin auth');
          this.clearAdminAuth();
          return null;
        }
      } catch (parseError) {
        console.warn('Failed to parse user data, clearing admin auth');
        this.clearAdminAuth();
        return null;
      }

      return {
        token,
        user,
        expiresAt: expiresAt || undefined
      };
    } catch (error) {
      console.error('Error getting admin auth from storage:', error);
      this.clearAdminAuth();
      return null;
    }
  }

  static setAdminAuth(data: AuthStorageData): void {
    try {
      // Validate input data before storing
      if (!data.token || !data.user || !data.user.id || !data.user.email) {
        throw new Error('Invalid auth data provided');
      }

      // Validate token format
      if (!data.token.includes('.') || data.token.split('.').length !== 3) {
        throw new Error('Invalid token format');
      }

      sessionStorage.setItem(this.KEYS.ADMIN_TOKEN, data.token);
      sessionStorage.setItem(this.KEYS.ADMIN_USER, JSON.stringify(data.user));
      if (data.expiresAt) {
        sessionStorage.setItem(this.KEYS.ADMIN_EXPIRES, data.expiresAt);
      }

      console.log('Admin auth stored securely');
    } catch (error) {
      console.error('Error setting admin auth in storage:', error);
      // Clear any partial data that might have been stored
      this.clearAdminAuth();
      throw error;
    }
  }

  static clearAdminAuth(): void {
    sessionStorage.removeItem(this.KEYS.ADMIN_TOKEN);
    sessionStorage.removeItem(this.KEYS.ADMIN_USER);
    sessionStorage.removeItem(this.KEYS.ADMIN_EXPIRES);
  }

  // Métodos para abogados
  static getLawyerAuth(): AuthStorageData | null {
    try {
      const token = sessionStorage.getItem(this.KEYS.LAWYER_TOKEN);
      const userData = sessionStorage.getItem(this.KEYS.LAWYER_USER);

      if (!token || !userData) return null;

      return {
        token,
        user: JSON.parse(userData)
      };
    } catch (error) {
      console.error('Error getting lawyer auth from storage:', error);
      return null;
    }
  }

  static setLawyerAuth(data: AuthStorageData): void {
    try {
      sessionStorage.setItem(this.KEYS.LAWYER_TOKEN, data.token);
      sessionStorage.setItem(this.KEYS.LAWYER_USER, JSON.stringify(data.user));
    } catch (error) {
      console.error('Error setting lawyer auth in storage:', error);
    }
  }

  static clearLawyerAuth(): void {
    sessionStorage.removeItem(this.KEYS.LAWYER_TOKEN);
    sessionStorage.removeItem(this.KEYS.LAWYER_USER);
  }

  // Métodos de utilidad
  static isTokenExpired(expiresAt?: string): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  }

  static clearAllAuth(): void {
    this.clearAdminAuth();
    this.clearLawyerAuth();
    sessionStorage.removeItem(this.KEYS.CHAT_SESSION);
  }

  // Limpiar toda la memoria de agentes de chat
  static clearAllAgentMemory(): void {
    // Limpiar sessionStorage de chat
    sessionStorage.removeItem('chat-session-id');
    sessionStorage.removeItem('anonymous-session-id');
    
    // Limpiar localStorage de agentes de chat
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('chat_') || 
        key.startsWith('document_session_') ||
        key.startsWith('terms_accepted_')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    console.log('✅ Agent memory cleared:', {
      itemsRemoved: keysToRemove.length,
      keys: keysToRemove
    });
  }

  static getActiveTokens(): { admin: boolean; lawyer: boolean; chat: boolean } {
    return {
      admin: !!sessionStorage.getItem(this.KEYS.ADMIN_TOKEN),
      lawyer: !!sessionStorage.getItem(this.KEYS.LAWYER_TOKEN),
      chat: !!sessionStorage.getItem(this.KEYS.CHAT_SESSION)
    };
  }

  // Limpieza automática de tokens expirados
  static cleanupExpiredTokens(): void {
    const adminAuth = this.getAdminAuth();
    if (adminAuth && adminAuth.expiresAt && this.isTokenExpired(adminAuth.expiresAt)) {
      console.log('Cleaning up expired admin token');
      this.clearAdminAuth();
    }
  }
}