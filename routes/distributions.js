/**
 * ============================================================================
 * Distributions Routes API
 * ============================================================================
 * 
 * PURPOSE:
 * Handles medicine distribution/issuance records:
 * - Record when a family receives a medicine
 * - Track external (خارجية) vs internal (داخلية) pharmacy distribution
 * - Prevent duplicate distribution within 30 days
 * - Automatically update medicine stock
 * 
 * DATA MODEL:
 * - id: Unique identifier
 * - family_id: Reference to family
 * - medicine_id: Reference to medicine
 * - quantity_external: Qty from external pharmacy
 * - quantity_internal: Qty from internal pharmacy
 * - issue_date: When medicine was issued
 * - user_id: Staff who recorded this
 * - month: Month record (YYYY-MM)
 * - status: completed, pending, returned
 * - notes: Additional notes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, findById, findMany, create, update, deleteRecord } from '../utils/dataManager.js';

const router = express.Router();

/**
 * GET /api/distributions
 * 
 * PURPOSE:
 * Get all distribution records with optional filtering
 * 
 * QUERY PARAMETERS:
 * - family_id: Filter by family
 * - medicine_id: Filter by medicine
 * - month: Filter by month (YYYY-MM)
 * - status: Filter by status
 * - user_id: Filter by user who recorded
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   count: 50,
 *   data: [...]
 * }
 */
router.get('/', (req, res) => {
  try {
    let data = readData('distributions');

    // Apply filters
    const filters = {};
    if (req.query.family_id) filters.family_id = req.query.family_id;
    if (req.query.medicine_id) filters.medicine_id = req.query.medicine_id;
    if (req.query.month) filters.month = req.query.month;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.user_id) filters.user_id = req.query.user_id;

    if (Object.keys(filters).length > 0) {
      data = data.filter(item => 
        Object.entries(filters).every(([key, val]) => item[key] === val)
      );
    }

    // Sort by issue_date descending (newest first)
    data.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));

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
 * GET /api/distributions/monthly/:month
 * 
 * PURPOSE:
 * Get all distributions for a specific month
 * 
 * PARAMETERS:
 * - month: Month in YYYY-MM format
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   month: "2024-01",
 *   count: 15,
 *   total_cost: 5000.50,
 *   data: [...]
 * }
 */
router.get('/monthly/:month', (req, res) => {
  try {
    const distributions = findMany('distributions', { month: req.params.month });
    const medicines = readData('medicines');

    // Calculate total cost
    let totalCost = 0;
    distributions.forEach(dist => {
      const medicine = medicines.find(m => m.id === dist.medicine_id);
      if (medicine) {
        const totalQty = dist.quantity_external + dist.quantity_internal;
        totalCost += totalQty * medicine.unit_price;
      }
    });

    res.json({
      success: true,
      month: req.params.month,
      count: distributions.length,
      total_cost: parseFloat(totalCost.toFixed(2)),
      data: distributions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/distributions/family/:family_id
 * 
 * PURPOSE:
 * Get all distributions for a family
 * 
 * PARAMETERS:
 * - family_id: Family ID
 * 
 * QUERY PARAMETERS:
 * - month: (optional) Filter by specific month
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   family_id: "family-001",
 *   total_records: 12,
 *   data: [...]
 * }
 */
router.get('/family/:family_id', (req, res) => {
  try {
    const family = findById('families', req.params.family_id);
    if (!family) {
      return res.status(404).json({
        success: false,
        error: 'Family not found'
      });
    }

    let distributions = findMany('distributions', { family_id: req.params.family_id });

    // Filter by month if provided
    if (req.query.month) {
      distributions = distributions.filter(d => d.month === req.query.month);
    }

    // Sort by date descending
    distributions.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));

    res.json({
      success: true,
      family_id: req.params.family_id,
      family_name: family.head_name,
      total_records: distributions.length,
      data: distributions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/distributions
 * 
 * PURPOSE:
 * Record a medicine distribution (issuance to family)
 * 
 * REQUEST BODY:
 * {
 *   "family_id": "family-001",            // *Required
 *   "medicine_id": "med-001",             // *Required
 *   "quantity_external": 20,              // *Required (>= 0)
 *   "quantity_internal": 10,              // *Required (>= 0)
 *   "user_id": "user-001",                // *Required
 *   "month": "2024-01",                   // *Required (YYYY-MM)
 *   "notes": "صرف منتظم"                  // Optional
 * }
 * 
 * FEATURES:
 * - Prevents duplicate distribution (same family + medicine + month)
 * - Automatically updates medicine stock
 * - Alerts if same medicine within 30 days (duplicate prevention)
 * - Validates quantity
 * 
 * VALIDATION:
 * - Family must exist
 * - Medicine must exist
 * - Quantities must be non-negative
 * - At least one quantity > 0
 * - Stock must be sufficient
 * - Month format: YYYY-MM
 * 
 * RESPONSE (201):
 * {
 *   success: true,
 *   message: "Distribution recorded successfully",
 *   data: { created distribution record },
 *   stock_updated: true,
 *   new_stock: 480
 * }
 */
router.post('/', (req, res) => {
  try {
    const { family_id, medicine_id, pharmacy_id, quantity_external, quantity_internal, user_id, month, notes, distribution_type } = req.body;

    // ============ VALIDATION ============

    const family = findById('families', family_id);
    if (!family) {
      return res.status(404).json({
        success: false,
        error: 'Family not found'
      });
    }

    const medicine = findById('medicines', medicine_id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        error: 'Medicine not found'
      });
    }

    const qtyExt = parseInt(quantity_external) || 0;
    const qtyInt = parseInt(quantity_internal) || 0;

    if (qtyExt < 0 || qtyInt < 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantities cannot be negative'
      });
    }

    const totalQty = qtyExt + qtyInt;
    if (totalQty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one quantity must be greater than 0'
      });
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid month format. Use YYYY-MM'
      });
    }

    // Check for duplicate in same month (EXCEPT for emergency distributions)
    if (distribution_type !== 'emergency') {
      const existingDist = findMany('distributions', {
        family_id,
        medicine_id,
        month
      });

      if (existingDist.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'This family already received this medicine this month',
          existing_distribution: existingDist[0]
        });
      }
    }

    // Duplicate prevention: Check last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const allDists = findMany('distributions', { family_id, medicine_id });
    const recentDist = allDists.find(d => {
      const issueDate = new Date(d.issue_date);
      return issueDate > thirtyDaysAgo;
    });

    if (recentDist) {
      console.warn(`⚠️  WARNING: Family received same medicine ${Math.floor((now - new Date(recentDist.issue_date)) / (24 * 60 * 60 * 1000))} days ago`);
    }

    // Check stock availability
    if (medicine.stock_quantity < totalQty) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock. Available: ${medicine.stock_quantity}, Requested: ${totalQty}`,
        available_stock: medicine.stock_quantity,
        requested_quantity: totalQty
      });
    }

    // ============ CREATE DISTRIBUTION & UPDATE STOCK ============

    const newDistribution = {
      id: uuidv4(),
      family_id,
      medicine_id,
      pharmacy_id: pharmacy_id || null,
      quantity_external: qtyExt,
      quantity_internal: qtyInt,
      issue_date: new Date().toISOString(),
      user_id,
      month,
      status: 'completed',
      notes: notes || '',
      distribution_type: distribution_type || 'regular',
      created_at: new Date().toISOString()
    };

    // Create distribution record
    create('distributions', newDistribution);

    // Update medicine stock
    const newStock = medicine.stock_quantity - totalQty;
    update('medicines', medicine_id, {
      stock_quantity: newStock
    });

    // Update family's last distribution date
    update('families', family_id, {
      last_distribution: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Distribution recorded successfully',
      data: newDistribution,
      stock_updated: true,
      new_stock: newStock,
      warning: recentDist ? 'Duplicate within 30 days' : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/distributions/:id
 * 
 * PURPOSE:
 * Update a distribution record (for corrections)
 * 
 * ⚠️  WARNING:
 * - Be careful when updating quantities as it affects stock
 * - Changing quantities will auto-adjust medicine stock
 * 
 * REQUEST BODY:
 * {
 *   "quantity_external": 25,
 *   "quantity_internal": 5,
 *   "notes": "تصحيح الكمية",
 *   "status": "completed"
 * }
 * 
 * RESPONSE (200):
 * {
 *   success: true,
 *   message: "Distribution updated",
 *   data: { updated distribution },
 *   stock_adjustment: -5
 * }
 */
router.put('/:id', (req, res) => {
  try {
    const distribution = findById('distributions', req.params.id);
    if (!distribution) {
      return res.status(404).json({
        success: false,
        error: 'Distribution not found'
      });
    }

    const updateData = req.body;
    const medicine = findById('medicines', distribution.medicine_id);

    // If quantities are being changed, adjust stock
    let stockAdjustment = 0;
    if (updateData.quantity_external !== undefined || updateData.quantity_internal !== undefined) {
      const oldTotal = distribution.quantity_external + distribution.quantity_internal;
      const newTotal = (updateData.quantity_external ?? distribution.quantity_external) + 
                       (updateData.quantity_internal ?? distribution.quantity_internal);
      
      stockAdjustment = oldTotal - newTotal; // Positive if decreasing, negative if increasing

      if (medicine.stock_quantity + stockAdjustment < 0) {
        return res.status(400).json({
          success: false,
          error: 'Stock adjustment would result in negative stock'
        });
      }

      // Update medicine stock
      update('medicines', distribution.medicine_id, {
        stock_quantity: medicine.stock_quantity + stockAdjustment
      });
    }

    // Remove immutable fields
    delete updateData.id;
    delete updateData.family_id;
    delete updateData.medicine_id;
    delete updateData.issue_date;
    delete updateData.created_at;

    // Update distribution
    const updatedDist = update('distributions', req.params.id, updateData);

    res.json({
      success: true,
      message: 'Distribution updated successfully',
      data: updatedDist,
      stock_adjustment: stockAdjustment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/distributions/:id
 * 
 * PURPOSE:
 * Delete a distribution record and refund stock
 * 
 * ⚠️  WARNING:
 * - This returns the medicine quantity to stock
 * - Use only for erroneous entries
 * 
 * RESPONSE (200):
 * {
 *   success: true,
 *   message: "Distribution deleted",
 *   stock_refunded: 30
 * }
 */
router.delete('/:id', (req, res) => {
  try {
    const distribution = findById('distributions', req.params.id);
    if (!distribution) {
      return res.status(404).json({
        success: false,
        error: 'Distribution not found'
      });
    }

    // Refund stock
    const medicine = findById('medicines', distribution.medicine_id);
    const refundQty = distribution.quantity_external + distribution.quantity_internal;

    update('medicines', distribution.medicine_id, {
      stock_quantity: medicine.stock_quantity + refundQty
    });

    // Delete distribution
    deleteRecord('distributions', req.params.id);

    res.json({
      success: true,
      message: 'Distribution deleted and stock refunded',
      deleted_id: req.params.id,
      stock_refunded: refundQty
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/distributions/stats/:period
 * 
 * PURPOSE:
 * Get distribution statistics for a period
 * 
 * PARAMETERS:
 * - period: 'month' or 'year'
 * 
 * QUERY PARAMETERS:
 * - date: Starting date (YYYY-MM or YYYY)
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   period: "2024-01",
 *   total_distributions: 25,
 *   total_families: 15,
 *   total_medicines: 10,
 *   total_cost: 5000.50
 * }
 */
router.get('/stats/:period', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 7);
    let distributions = readData('distributions');

    if (req.params.period === 'month') {
      distributions = distributions.filter(d => d.month === date);
    } else if (req.params.period === 'year') {
      const year = date.split('-')[0];
      distributions = distributions.filter(d => d.month.startsWith(year));
    }

    const medicines = readData('medicines');
    const families = new Set(distributions.map(d => d.family_id));

    let totalCost = 0;
    distributions.forEach(dist => {
      const medicine = medicines.find(m => m.id === dist.medicine_id);
      if (medicine) {
        totalCost += (dist.quantity_external + dist.quantity_internal) * medicine.unit_price;
      }
    });

    const uniqueMedicines = new Set(distributions.map(d => d.medicine_id));

    res.json({
      success: true,
      period: req.params.period,
      date,
      total_distributions: distributions.length,
      total_families: families.size,
      total_medicines: uniqueMedicines.size,
      total_cost: parseFloat(totalCost.toFixed(2))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
