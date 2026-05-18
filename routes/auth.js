/**
 * ============================================================================
 * Authentication Routes API
 * ============================================================================
 * 
 * PURPOSE:
 * - Handle user login
 * - Handle user signup
 * - Manage authentication tokens (JWT)
 * - Track user roles (admin/staff)
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import { readData, writeData, findMany } from '../utils/dataManager.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pharmacy-secret-key-2024';

/**
 * POST /api/auth/login
 * 
 * LOGIN endpoint
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password required'
      });
    }

    // Find user
    const users = readData('users');
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Check password (simple comparison for now)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Check if active
    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        error: 'Account is disabled'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        ...userWithoutPassword,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/signup
 * 
 * SIGNUP endpoint
 */
router.post('/signup', (req, res) => {
  try {
    const { name, username, password } = req.body;

    // Validation
    if (!name || name.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Name must be at least 3 characters'
      });
    }

    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 3 characters'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Check if username exists
    const users = readData('users');
    if (users.find(u => u.username === username)) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
    }

    // Create new user
    const newUser = {
      id: uuidv4(),
      username,
      password,
      name,
      role: 'Staff', // Default role
      is_active: true,
      created_at: new Date().toISOString()
    };

    // Add to users array
    users.push(newUser);
    writeData('users', users);

    // Generate token
    const token = uuidv4();

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        ...userWithoutPassword,
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
