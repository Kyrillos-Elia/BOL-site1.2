/**
 * ============================================================================
 * Users Routes API
 * ============================================================================
 * 
 * PURPOSE:
 * Manages user accounts with Role-Based Access Control (RBAC):
 * - Admin: Full access (create users, manage medicines, view reports)
 * - Manager: Can view and modify most data
 * - Staff: Limited access (search families, record distributions)
 * 
 * ENDPOINTS:
 * - GET /api/users - List all users
 * - GET /api/users/:id - Get single user
 * - POST /api/users - Create new user (Admin only)
 * - PUT /api/users/:id - Update user
 * - DELETE /api/users/:id - Delete user (Admin only)
 * - POST /api/users/login - Authenticate user (basic)
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, findById, findMany, create, update, deleteRecord } from '../utils/dataManager.js';

const router = express.Router();

/**
 * GET /api/users
 * 
 * PURPOSE:
 * List all active users in the system
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   count: 5,
 *   data: [...]
 * }
 */
router.get('/', (req, res) => {
  try {
    const data = readData('users').filter(u => u.is_active !== false);

    // Remove passwords from response
    const safeData = data.map(u => {
      const { password_hash, ...safe } = u;
      return safe;
    });

    res.json({
      success: true,
      count: safeData.length,
      data: safeData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/users/:id
 * 
 * PURPOSE:
 * Get a specific user's profile
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   data: { user object without password }
 * }
 */
router.get('/:id', (req, res) => {
  try {
    const user = findById('users', req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const { password_hash, ...safe } = user;
    res.json({
      success: true,
      data: safe
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/users/login
 * 
 * PURPOSE:
 * Authenticate user (simplified - in production use JWT)
 * 
 * REQUEST BODY:
 * {
 *   "username": "admin",
 *   "password": "admin123"
 * }
 * 
 * RESPONSE (Success - 200):
 * {
 *   success: true,
 *   message: "Login successful",
 *   user: {
 *     id: "admin-001",
 *     full_name: "مدير النظام",
 *     username: "admin",
 *     role: "Admin",
 *     email: "admin@...",
 *     phone: "01001234567",
 *     is_active: true
 *   },
 *   token: "simplified-token" (in production: JWT)
 * }
 * 
 * RESPONSE (Failure - 401):
 * {
 *   success: false,
 *   error: "Invalid username or password"
 * }
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const users = readData('users');
    const user = users.find(u => u.username === username && u.is_active);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // In production: use bcrypt to verify hashed password
    // For now: simple comparison (NOT SECURE - for development only)
    if (user.password_hash !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Update last login
    update('users', user.id, {
      last_login: new Date().toISOString()
    });

    // Remove password from response
    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Login successful',
      user: safeUser,
      token: 'simplified-token-' + user.id // In production: JWT
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/users
 * 
 * PURPOSE:
 * Create a new user account (Admin only)
 * 
 * REQUEST BODY:
 * {
 *   "full_name": "أحمد محمد",        // *Required
 *   "username": "ahmad123",          // *Required, unique
 *   "password": "SecurePass123",     // *Required
 *   "role": "Staff",                 // *Required: Admin, Manager, Staff
 *   "email": "ahmad@...",            // Optional
 *   "phone": "01012345678"           // Optional
 * }
 * 
 * VALIDATION:
 * - full_name: At least 3 characters
 * - username: Unique, alphanumeric, 3+ characters
 * - password: At least 6 characters
 * - role: One of Admin, Manager, Staff
 * 
 * RESPONSE (201):
 * {
 *   success: true,
 *   message: "User created successfully",
 *   data: { created user }
 * }
 * 
 * ERROR (400):
 * {
 *   success: false,
 *   error: "Validation error message"
 * }
 */
router.post('/', (req, res) => {
  try {
    const { full_name, username, password, role, email, phone } = req.body;

    // ============ VALIDATION ============

    if (!full_name || full_name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Full name must be at least 3 characters'
      });
    }

    if (!username || username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3+ characters, alphanumeric only'
      });
    }

    // Check if username already exists
    const existingUser = findMany('users', { username });
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    if (!role || !['Admin', 'Manager', 'Staff'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role must be Admin, Manager, or Staff'
      });
    }

    // ============ CREATE USER ============

    const newUser = {
      id: uuidv4(),
      full_name: full_name.trim(),
      username: username.toLowerCase(),
      password_hash: password, // In production: bcrypt.hashSync(password)
      role,
      email: email || '',
      phone: phone || '',
      created_at: new Date().toISOString(),
      last_login: null,
      is_active: true
    };

    create('users', newUser);

    // Remove password from response
    const { password_hash, ...safeUser } = newUser;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: safeUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/users/:id
 * 
 * PURPOSE:
 * Update user information
 * 
 * REQUEST BODY:
 * {
 *   "full_name": "new name",
 *   "email": "newemail@...",
 *   "phone": "01098765432",
 *   "password": "newpassword"  // Optional, for changing password
 * }
 * 
 * IMMUTABLE FIELDS:
 * - id, username, created_at
 * 
 * RESPONSE (200):
 * {
 *   success: true,
 *   message: "User updated successfully",
 *   data: { updated user }
 * }
 */
router.put('/:id', (req, res) => {
  try {
    const user = findById('users', req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const updateData = req.body;

    // Remove immutable fields
    delete updateData.id;
    delete updateData.username;
    delete updateData.created_at;

    // If changing password
    if (updateData.password) {
      if (updateData.password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters'
        });
      }
      updateData.password_hash = updateData.password;
      delete updateData.password;
    }

    // Update user
    const updatedUser = update('users', req.params.id, updateData);

    // Remove password from response
    const { password_hash, ...safeUser } = updatedUser;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: safeUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/users/:id
 * 
 * PURPOSE:
 * Disable a user account (soft delete)
 * 
 * ⚠️  Note: Records are preserved for audit
 * 
 * RESPONSE (200):
 * {
 *   success: true,
 *   message: "User disabled successfully"
 * }
 */
router.delete('/:id', (req, res) => {
  try {
    const user = findById('users', req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Soft delete - mark as inactive
    update('users', req.params.id, {
      is_active: false
    });

    res.json({
      success: true,
      message: 'User disabled successfully',
      user_id: req.params.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
