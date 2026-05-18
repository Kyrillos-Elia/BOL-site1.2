/**
 * ============================================================================
 * PHARMACIES API ROUTES
 * ============================================================================
 * Endpoints for managing pharmacy information and details
 * 
 * Routes:
 * - GET  /api/pharmacies        - Get all pharmacies
 * - GET  /api/pharmacies/:id    - Get pharmacy by ID
 * - POST /api/pharmacies        - Create new pharmacy
 * - PUT  /api/pharmacies/:id    - Update pharmacy
 * - DELETE /api/pharmacies/:id  - Delete pharmacy
 */

import express from 'express';
import { getPharmacies, getPharmacyById, createPharmacy, updatePharmacy, deletePharmacy } from '../utils/dataManager.js';

const router = express.Router();

/**
 * GET /api/pharmacies
 * Retrieve all pharmacies
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: Array<Pharmacy>,
 *   message: string
 * }
 */
router.get('/', async (req, res) => {
  try {
    const pharmacies = await getPharmacies();
    res.json({
      success: true,
      data: pharmacies,
      message: 'Pharmacies retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/pharmacies/:id
 * Retrieve pharmacy by ID
 * 
 * Parameters:
 * - id: Pharmacy ID
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: Pharmacy,
 *   message: string
 * }
 */
router.get('/:id', async (req, res) => {
  try {
    const pharmacy = await getPharmacyById(req.params.id);
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found'
      });
    }
    res.json({
      success: true,
      data: pharmacy,
      message: 'Pharmacy retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/pharmacies
 * Create new pharmacy
 * 
 * Body:
 * {
 *   pharmacy_name: string,
 *   location: string,
 *   phone: string,
 *   payment_method: string,
 *   is_active: boolean
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: Pharmacy,
 *   message: string
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { pharmacy_name, location, phone, payment_method, is_active } = req.body;
    
    if (!pharmacy_name || !location) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    const pharmacy = await createPharmacy({
      pharmacy_name,
      location,
      phone,
      payment_method,
      is_active: is_active !== false
    });
    
    res.status(201).json({
      success: true,
      data: pharmacy,
      message: 'Pharmacy created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/pharmacies/:id
 * Update pharmacy
 * 
 * Parameters:
 * - id: Pharmacy ID
 * 
 * Body:
 * {
 *   pharmacy_name?: string,
 *   location?: string,
 *   phone?: string,
 *   payment_method?: string,
 *   is_active?: boolean
 * }
 * 
 * Returns:
 * {
 *   success: boolean,
 *   data: Pharmacy,
 *   message: string
 * }
 */
router.put('/:id', async (req, res) => {
  try {
    const pharmacy = await updatePharmacy(req.params.id, req.body);
    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found'
      });
    }
    res.json({
      success: true,
      data: pharmacy,
      message: 'Pharmacy updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/pharmacies/:id
 * Delete pharmacy
 * 
 * Parameters:
 * - id: Pharmacy ID
 * 
 * Returns:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await deletePharmacy(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Pharmacy not found'
      });
    }
    res.json({
      success: true,
      message: 'Pharmacy deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
