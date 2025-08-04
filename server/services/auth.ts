import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { storage } from '../storage';
import type { User, InsertUser, LoginData, RegisterData } from '@shared/schema';

export class AuthService {
  private saltRounds = 12;

  async register(data: RegisterData): Promise<User> {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, this.saltRounds);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    // Create user data
    const userData: InsertUser = {
      id: crypto.randomUUID(),
      email: data.email,
      passwordHash,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      displayName: data.displayName || null,
      role: 'organizer', // Default role for new registrations
      emailVerificationToken,
      emailVerified: false, // Require email verification in production
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Create user in database
    const user = await storage.createUser(userData);
    
    return user;
  }

  async login(data: LoginData): Promise<User> {
    // Find user by email
    const user = await storage.getUserByEmail(data.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await storage.updateUser(user.id, {
      lastLoginAt: new Date(),
    });

    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await storage.getUser(id);
    return user || null;
  }

  async updateUserProfile(id: string, updates: Partial<User>): Promise<User> {
    // Remove sensitive fields that shouldn't be updated via this method
    const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUpdates } = updates;
    
    const updatedUser = await storage.updateUser(id, safeUpdates);
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return updatedUser;
  }

  async verifyEmail(token: string): Promise<boolean> {
    // Find user by email verification token
    const users = await storage.getUserByEmail('dummy'); // This is a placeholder - we need a method to find by token
    // For now, we'll implement a basic version
    return false; // TODO: Implement proper email verification
  }

  async initiatePasswordReset(email: string): Promise<string | null> {
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return null;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with reset token
    await storage.updateUser(user.id, {
      passwordResetToken: resetToken,
      passwordResetTokenExpiry: resetTokenExpiry,
    });

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // This would require a method to find user by reset token
    // For now, implement basic version
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);
    
    // TODO: Find user by token and update password
    return false; // Placeholder
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

    // Update password
    await storage.updateUser(userId, {
      passwordHash,
      updatedAt: new Date(),
    });
  }
}

export const authService = new AuthService();