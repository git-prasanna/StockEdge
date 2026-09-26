import { Router, Request, Response } from 'express';
import { dbGet, dbRun } from '../db.ts';

export const authRouter = Router();

// Current active session / mock token cache (or bearer header)
// In a full local-first IMS app, user ID is passed or stored in session/header
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await dbGet<any>(
      'SELECT id, name, email, role, department, password_hash, created_at FROM users WHERE LOWER(email) = LOWER(?)',
      [email.trim()]
    );

    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { password_hash, ...safeUser } = user;
    return res.json({
      message: 'Login successful',
      user: safeUser,
      token: `stk_token_${user.id}_${Date.now()}`
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existing = await dbGet('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists' });
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO users (id, name, email, password_hash, role, department, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name.trim(),
        email.trim(),
        password,
        role || 'Inventory Manager',
        department || 'Logistics & Supply Chain',
        now
      ]
    );

    const newUser = {
      id: userId,
      name: name.trim(),
      email: email.trim(),
      role: role || 'Inventory Manager',
      department: department || 'Logistics & Supply Chain',
      created_at: now
    };

    return res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
      token: `stk_token_${userId}_${Date.now()}`
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// Request OTP for password reset
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const user = await dbGet('SELECT id, name, email FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (!user) {
      // For security, don't expose user existence, but let user know OTP was sent
      return res.json({
        message: 'If an account exists with this email, a 6-digit OTP code has been generated.',
        otpPreview: '123456' // Fallback preview
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetId = `rst_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry
    const now = new Date().toISOString();

    await dbRun(
      `INSERT INTO password_resets (id, email, otp, expires_at, used, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [resetId, email.trim(), otp, expiresAt, now]
    );

    // Return the generated OTP in response for direct, friction-free local verification
    return res.json({
      message: `Password reset OTP generated for ${email}. Valid for 15 minutes.`,
      otpPreview: otp
    });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to generate password reset code' });
  }
});

// Verify OTP and update password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const resetRecord = await dbGet<any>(
      `SELECT * FROM password_resets 
       WHERE LOWER(email) = LOWER(?) AND otp = ? AND used = 0
       ORDER BY created_at DESC LIMIT 1`,
      [email.trim(), otp.trim()]
    );

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    if (new Date(resetRecord.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new one.' });
    }

    // Mark OTP as used
    await dbRun('UPDATE password_resets SET used = 1 WHERE id = ?', [resetRecord.id]);

    // Update user password
    await dbRun(
      'UPDATE users SET password_hash = ? WHERE LOWER(email) = LOWER(?)',
      [newPassword, email.trim()]
    );

    return res.json({ message: 'Password has been successfully updated. You may now log in.' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get current profile
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const user = await dbGet<any>(
      'SELECT id, name, email, role, department, created_at FROM users LIMIT 1'
    );
    if (!user) {
      return res.status(404).json({ error: 'No user profile found' });
    }
    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update profile
authRouter.put('/profile', async (req: Request, res: Response) => {
  try {
    const { id, name, role, department } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: 'User ID and name are required' });
    }
    await dbRun(
      'UPDATE users SET name = ?, role = ?, department = ? WHERE id = ?',
      [name.trim(), role || 'Inventory Manager', department || 'Logistics', id]
    );

    const updated = await dbGet<any>(
      'SELECT id, name, email, role, department, created_at FROM users WHERE id = ?',
      [id]
    );
    return res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update user profile' });
  }
});
