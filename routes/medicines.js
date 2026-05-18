/**
 * ============================================================================
 * Medicines Routes API
 * ============================================================================
 * 
 * PURPOSE:
 * Handles all HTTP endpoints for medicines inventory management:
 * - GET /api/medicines - List all medicines
 * - GET /api/medicines/low-stock - Get medicines below minimum stock
 * - GET /api/medicines/:id - Get single medicine
 * - POST /api/medicines - Create new medicine
 * - PUT /api/medicines/:id - Update medicine
 * - DELETE /api/medicines/:id - Delete medicine
 * - PUT /api/medicines/:id/stock - Adjust stock quantity
 * 
 * DATA MODEL:
 * - id: Unique identifier (UUID)
 * - med_name: Medicine Arabic name
 * - scientific_name: International scientific name
 * - stock_quantity: Current quantity in stock
 * - min_stock_alert: Alert when stock falls below this
 * - expiry_date: Expiration date (YYYY-MM-DD)
 * - unit_price: Price per unit
 * - dosage_form: Form (قرص, كبسولة, حقنة, etc.)
 * - supplier: Supplier name
 * - batch_number: Batch/Lot number
 * - description: Full description
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, findById, findMany, create, update, deleteRecord } from '../utils/dataManager.js';

const router = express.Router();

/**
 * GET /api/medicines
 * 
 * PURPOSE:
 * Retrieve all medicines with optional filtering
 * 
 * QUERY PARAMETERS:
 * - sort: Sort by field (med_name, unit_price, stock_quantity)
 * - order: asc or desc
 * - limit: Number of records
 * - offset: Pagination offset
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   count: 10,
 *   data: [...]
 * }
 */
router.get('/', (req, res) => {
  try {
    let data = readData('medicines');

    // Sorting
    if (req.query.sort) {
      const order = req.query.order === 'desc' ? -1 : 1;
      data.sort((a, b) => {
        if (typeof a[req.query.sort] === 'number') {
          return (a[req.query.sort] - b[req.query.sort]) * order;
        }
        return a[req.query.sort]?.localeCompare(b[req.query.sort]) * order;
      });
    }

    // Pagination
    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;
    const paginatedData = data.slice(offset, offset + limit);

    res.json({
      success: true,
      count: data.length,
      limit,
      offset,
      data: paginatedData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/medicines/low-stock
 * 
 * PURPOSE:
 * Get medicines with stock below minimum threshold
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   count: 3,
 *   data: [
 *     { medicine with low stock },
 *     ...
 *   ]
 * }
 */
router.get('/low-stock', (req, res) => {
  try {
    const medicines = readData('medicines');
    const lowStockMeds = medicines.filter(med => med.stock_quantity <= med.min_stock_alert);

    res.json({
      success: true,
      count: lowStockMeds.length,
      threshold: 'min_stock_alert',
      data: lowStockMeds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/medicines/expiring-soon
 * 
 * PURPOSE:
 * Get medicines expiring within 90 days
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   count: 2,
 *   days_threshold: 90,
 *   data: [...]
 * }
 */
router.get('/expiring-soon', (req, res) => {
  try {
    const medicines = readData('medicines');
    const daysThreshold = 90;
    const today = new Date();
    const thresholdDate = new Date(today.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const expiringMeds = medicines.filter(med => {
      const expiryDate = new Date(med.expiry_date);
      return expiryDate <= thresholdDate && expiryDate >= today;
    });

    res.json({
      success: true,
      count: expiringMeds.length,
      days_threshold: daysThreshold,
      data: expiringMeds
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/medicines/search
 * 
 * PURPOSE:
 * Search medicines by name or scientific name
 * 
 * QUERY PARAMETERS:
 * - q: Search query (required)
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   query: "أسبرين",
 *   count: 2,
 *   data: [...]
 * }
 */
router.get('/search', (req, res) => {
  try {
    const query = (req.query.q || '').toLowerCase().trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    let data = readData('medicines');
    data = data.filter(m => 
      m.med_name.toLowerCase().includes(query) ||
      m.scientific_name.toLowerCase().includes(query) ||
      (m.description || '').toLowerCase().includes(query)
    );

    res.json({
      success: true,
      query,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/medicines/:id
 * 
 * PURPOSE:
 * Get a single medicine by ID
 * 
 * RESPONSE (Success):
 * {
 *   success: true,
 *   data: { medicine object }
 * }
 */

// ════════════════════════════════════════════════════════════════════════════════
// EXPORT/IMPORT ROUTES (must come before /:id route)
// ════════════════════════════════════════════════════════════════════════════════

// GET - Export all medicines
router.get('/export/all', (req, res) => {
  try {
    const medicines = readData('medicines');
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Import medicines
router.post('/import/all', (req, res) => {
  try {
    const { medicines } = req.body;
    if (!Array.isArray(medicines)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const currentMedicines = readData('medicines');
    
    let imported = 0;
    for (const medicine of medicines) {
      const existingIndex = currentMedicines.findIndex(m => m.id === medicine.id);
      
      if (existingIndex >= 0) {
        currentMedicines[existingIndex] = {
          ...currentMedicines[existingIndex],
          ...medicine,
          updated_at: new Date().toISOString()
        };
      } else {
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

// ════════════════════════════════════════════════════════════════════════════════
router.get('/:id', (req, res) => {
  try {
    const medicine = findById('medicines', req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found'
      });
    }

    res.json({
      success: true,
      data: medicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/medicines
 * 
 * PURPOSE:
 * Add a new medicine to inventory
 * 
 * REQUEST BODY:
 * {
 *   "med_name": "أملوديبين",                    // *Required
 *   "scientific_name": "Amlodipine",            // *Required
 *   "stock_quantity": 500,                      // *Required
 *   "min_stock_alert": 100,                     // *Required
 *   "expiry_date": "2025-12-31",                // *Required
 *   "unit_price": 1.50,                         // *Required
 *   "dosage_form": "قرص 5 مجم",                 // Optional
 *   "supplier": "الشركة المصرية",               // Optional
 *   "batch_number": "BATCH-001-2024",           // Optional
 *   "description": "موسع للأوعية الدموية"      // Optional
 * }
 * 
 * VALIDATION:
 * - med_name: Required, non-empty
 * - scientific_name: Required, non-empty
 * - stock_quantity: Required, >= 0
 * - unit_price: Required, > 0
 * - expiry_date: Required, valid date format, in future
 * - min_stock_alert: Must be <= stock_quantity
 * 
 * RESPONSE (201):
 * {
 *   success: true,
 *   message: "Medicine created successfully",
 *   data: { created medicine with id }
 * }
 */
router.post('/', (req, res) => {
  try {
    const { med_name, scientific_name, stock_quantity, min_stock_alert, expiry_date, unit_price, dosage_form, supplier, batch_number, description } = req.body;

    // ============ VALIDATION ============

    if (!med_name || med_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Medicine name is required'
      });
    }

    if (!scientific_name || scientific_name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Scientific name is required'
      });
    }

    const stock = parseInt(stock_quantity);
    if (isNaN(stock) || stock < 0) {
      return res.status(400).json({
        success: false,
        error: 'Stock quantity must be a non-negative number'
      });
    }

    const price = parseFloat(unit_price);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Unit price must be greater than 0'
      });
    }

    // Validate expiry date
    const expiryDate = new Date(expiry_date);
    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid expiry date format (use YYYY-MM-DD)'
      });
    }

    if (expiryDate < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Expiry date must be in the future'
      });
    }

    const minAlert = parseInt(min_stock_alert);
    if (minAlert > stock) {
      return res.status(400).json({
        success: false,
        error: 'Minimum stock alert cannot exceed current stock'
      });
    }

    // ============ CREATE RECORD ============

    const newMedicine = {
      id: uuidv4(),
      med_name: med_name.trim(),
      scientific_name: scientific_name.trim(),
      stock_quantity: stock,
      min_stock_alert: minAlert,
      expiry_date: expiry_date,
      unit_price: price,
      dosage_form: dosage_form || '',
      supplier: supplier || '',
      batch_number: batch_number || '',
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    create('medicines', newMedicine);

    res.status(201).json({
      success: true,
      message: 'Medicine created successfully',
      data: newMedicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/medicines/:id
 * 
 * PURPOSE:
 * Update medicine information
 * 
 * REQUEST BODY:
 * Any fields can be updated (except id and created_at)
 * 
 * RESPONSE (200):
 * {
 *   success: true,
 *   message: "Medicine updated successfully",
 *   data: { updated medicine }
 * }
 */
router.put('/:id', (req, res) => {
  try {
    const medicine = findById('medicines', req.params.id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found'
      });
    }

    // ============ VALIDATION ============

    const updateData = req.body;

    // Remove immutable fields
    delete updateData.id;
    delete updateData.created_at;

    if (updateData.unit_price) {
      const price = parseFloat(updateData.unit_price);
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Unit price must be greater than 0'
        });
      }
    }

    if (updateData.stock_quantity !== undefined) {
      const stock = parseInt(updateData.stock_quantity);
      if (isNaN(stock) || stock < 0) {
        return res.status(400).json({
          success: false,
          error: 'Stock quantity must be non-negative'
        });
      }
    }

    if (updateData.expiry_date) {
      const expiryDate = new Date(updateData.expiry_date);
      if (isNaN(expiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid expiry date format'
        });
      }
    }

    // ============ UPDATE RECORD ============

    const updatedMedicine = update('medicines', req.params.id, updateData);

    res.json({
      success: true,
      message: 'Medicine updated successfully',
      data: updatedMedicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/medicines/:id/stock
 * 
 * PURPOSE:
 * Adjust medicine stock (add or subtract)
 * Used when receiving new stock or adjusting for discrepancies
 * 
 * REQUEST BODY:
 * {
 *   "adjustment": 100,        // Positive to add, negative to subtract
 *   "reason": "New shipment",  // Reason for adjustment
 *   "batch_number": "BATCH-002"
 * }
 * 
 * RESPONSE (200):
 * {
 *   success: true,
 *   message: "Stock updated",
 *   old_quantity: 500,
 *   new_quantity: 600,
 *   adjustment: 100
 * }
 */
router.put('/:id/stock', (req, res) => {
  try {
    const medicine = findById('medicines', req.params.id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found'
      });
    }

    const adjustment = parseInt(req.body.adjustment);
    if (isNaN(adjustment)) {
      return res.status(400).json({
        success: false,
        error: 'Adjustment must be a number'
      });
    }

    const oldQuantity = medicine.stock_quantity;
    const newQuantity = oldQuantity + adjustment;

    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Stock cannot go below 0'
      });
    }

    // Update stock
    const updatedMedicine = update('medicines', req.params.id, {
      stock_quantity: newQuantity,
      batch_number: req.body.batch_number || medicine.batch_number
    });

    res.json({
      success: true,
      message: 'Stock updated successfully',
      old_quantity: oldQuantity,
      new_quantity: newQuantity,
      adjustment: adjustment,
      reason: req.body.reason || '',
      data: updatedMedicine
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/medicines/:id
 * 
 * PURPOSE:
 * Delete a medicine (should only be used for unused medicines)
 * 
 * ⚠️  WARNING:
 * - Check if medicine is used in distributions first
 * - Cannot recover deleted medicines
 * 
 * RESPONSE (200):
 * {
 *   success: true,
 *   message: "Medicine deleted successfully"
 * }
 */
router.delete('/:id', (req, res) => {
  try {
    const medicine = findById('medicines', req.params.id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found'
      });
    }

    // Check if used in distributions
    const distributions = findMany('distributions', { medicine_id: req.params.id });
    if (distributions.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete medicine. Used in ${distributions.length} distributions`,
        used_count: distributions.length
      });
    }

    deleteRecord('medicines', req.params.id);

    res.json({
      success: true,
      message: 'Medicine deleted successfully',
      deleted_id: req.params.id
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
