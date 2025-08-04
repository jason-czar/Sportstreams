import { Router } from 'express';
import { authService } from '../services/auth';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '@shared/schema';
import { requireAuth, optionalAuth } from '../middleware/auth';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const user = await authService.register(validatedData);
    
    // Auto-login after registration
    req.session.userId = user.id;
    
    // Don't send sensitive data
    const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUser } = user;
    
    res.status(201).json({
      message: 'Registration successful',
      user: safeUser
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      error: error.message || 'Registration failed' 
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const user = await authService.login(validatedData);
    
    // Create session
    req.session.userId = user.id;
    
    // Don't send sensitive data
    const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUser } = user;
    
    res.json({
      message: 'Login successful',
      user: safeUser
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ 
      error: error.message || 'Login failed' 
    });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  req.session.destroy((err: any) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// Get current user
router.get('/me', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't send sensitive data
    const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUser } = user;
    
    res.json({ user: safeUser });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Update user profile
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const updates = req.body;
    const updatedUser = await authService.updateUserProfile(req.user!.id, updates);
    
    // Don't send sensitive data
    const { passwordHash, emailVerificationToken, passwordResetToken, ...safeUser } = updatedUser;
    
    res.json({
      message: 'Profile updated successfully',
      user: safeUser
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(400).json({ error: error.message || 'Profile update failed' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }
    
    const success = await authService.verifyEmail(token);
    
    if (success) {
      res.json({ message: 'Email verified successfully' });
    } else {
      res.status(400).json({ error: 'Invalid or expired verification token' });
    }
  } catch (error: any) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Email verification failed' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);
    
    // Always return success to prevent email enumeration
    const resetToken = await authService.initiatePasswordReset(validatedData.email);
    
    // In production, send email here
    console.log('Password reset token for', validatedData.email, ':', resetToken);
    
    res.json({ 
      message: 'If an account with that email exists, a reset link has been sent' 
    });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    
    const success = await authService.resetPassword(
      validatedData.token, 
      validatedData.password
    );
    
    if (success) {
      res.json({ message: 'Password reset successful' });
    } else {
      res.status(400).json({ error: 'Invalid or expired reset token' });
    }
  } catch (error: any) {
    console.error('Password reset error:', error);
    res.status(400).json({ error: 'Password reset failed' });
  }
});

export default router;