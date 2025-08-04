import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { authService } from '../services/auth';

// Extend Express types
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        displayName?: string;
      };
    }
  }
}

// Extend session data
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await authService.getUserById(userId);
    if (!user) {
      req.session.destroy((err: any) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName || undefined,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session?.userId;
    
    if (userId) {
      const user = await authService.getUserById(userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: user.displayName || undefined,
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without auth if there's an error
  }
};