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

  // Métodos para administradores
  static getAdminAuth(): AuthStorageData | null {
    try {
      const token = sessionStorage.getItem(this.KEYS.ADMIN_TOKEN);
      const userData = sessionStorage.getItem(this.KEYS.ADMIN_USER);
      const expiresAt = sessionStorage.getItem(this.KEYS.ADMIN_EXPIRES);

      if (!token || !userData) return null;

      return {
        token,
        user: JSON.parse(userData),
        expiresAt: expiresAt || undefined
      };
    } catch (error) {
      console.error('Error getting admin auth from storage:', error);
      return null;
    }
  }

  static setAdminAuth(data: AuthStorageData): void {
    try {
      sessionStorage.setItem(this.KEYS.ADMIN_TOKEN, data.token);
      sessionStorage.setItem(this.KEYS.ADMIN_USER, JSON.stringify(data.user));
      if (data.expiresAt) {
        sessionStorage.setItem(this.KEYS.ADMIN_EXPIRES, data.expiresAt);
      }
    } catch (error) {
      console.error('Error setting admin auth in storage:', error);
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