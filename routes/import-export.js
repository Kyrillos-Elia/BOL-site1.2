import express from 'express';
import fs from 'fs';
import path from 'path';
import { readData, writeData } from '../utils/dataManager.js';

const router = express.Router();

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // For now, we'll assume the user info is in the request
    // In production, you'd verify the token here
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ════════════════════════════════════════════════════════════════════════════════
// FAMILIES IMPORT/EXPORT
// ════════════════════════════════════════════════════════════════════════════════

// GET - Export all families
router.get('/families/export', (req, res) => {
  try {
    const families = readData('families');
    res.json(families);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Import families
router.post('/families/import', (req, res) => {
  try {
    const { families } = req.body;
    if (!Array.isArray(families)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const currentFamilies = readData('families');
    
    let imported = 0;
    for (const family of families) {
      // Check if family already exists
      const existingIndex = currentFamilies.findIndex(f => f.id === family.id);
      
      if (existingIndex >= 0) {
        // Update existing
        currentFamilies[existingIndex] = {
          ...currentFamilies[existingIndex],
          ...family,
          updated_at: new Date().toISOString()
        };
      } else {
        // Add new
        currentFamilies.push({
          ...family,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      imported++;
    }

    writeData('families', currentFamilies);

    res.json({ 
      success: true, 
      imported,
      message: `Successfully imported ${imported} families`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// MEDICINES IMPORT/EXPORT
// ════════════════════════════════════════════════════════════════════════════════

// GET - Export all medicines
router.get('/medicines/export', (req, res) => {
  try {
    const medicines = readData('medicines');
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Import medicines
router.post('/medicines/import', (req, res) => {
  try {
    const { medicines } = req.body;
    if (!Array.isArray(medicines)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const currentMedicines = readData('medicines');
    
    let imported = 0;
    for (const medicine of medicines) {
      // Check if medicine already exists
      const existingIndex = currentMedicines.findIndex(m => m.id === medicine.id);
      
      if (existingIndex >= 0) {
        // Update existing
        currentMedicines[existingIndex] = {
          ...currentMedicines[existingIndex],
          ...medicine,
          updated_at: new Date().toISOString()
        };
      } else {
        // Add new
        currentMedicines.push({
          ...medicine,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      imported++;
    }

    writeData('medicines', currentMedicines);

    res.json({ 
      success: true, 
      imported,
      message: `Successfully imported ${imported} medicines`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
