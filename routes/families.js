/**
 * ============================================================================
 * Families Routes API
 * ============================================================================
 * 
 * PURPOSE:
 * Handles all HTTP endpoints for managing family records including:
 * - GET /api/families - List all families
 * - GET /api/families/by-zone/:zone - Get families by zone
 * - GET /api/families/:id - Get single family
 * - POST /api/families - Create new family
 * - PUT /api/families/:id - Update family
 * - DELETE /api/families/:id - Delete family
 * - GET /api/families/search - Search families
 * 
 * DATA MODEL:
 * - id: Unique identifier (UUID format)
 * - family_code: Human-readable code (P-001, P-002, etc.)
 * - head_name: Name of family head (رب الأسرة)
 * - national_id: 14-digit Egyptian ID
 * - address: Full address
 * - phone: Contact number
 * - category: A, B, or C (poverty level)
 * - members_count: Number of family members
 * - zone: Geographic zone (A1, A2, etc.)
 * - notes: Additional information
 * - created_at: Timestamp
 * - updated_at: Timestamp
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData, findById, findMany, create, update, deleteRecord } from '../utils/dataManager.js';

const router = express.Router();

/**
 * GET /api/families
 * 
 * PURPOSE:
 * Retrieve all families from the system
 * 
 * QUERY PARAMETERS:
 * - zone: (optional) Filter by zone (e.g., ?zone=A1)
 * - limit: (optional) Number of records to return
 * - offset: (optional) Pagination offset
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   count: 4,
 *   data: [
 *     { family data objects },
 *     ...
 *   ]
 * }
 * 
 * ERROR RESPONSE (400):
 * {
 *   success: false,
 *   error: "Error message"
 * }
 */
router.get('/', (req, res) => {
  try {
    let data = readData('families');

    // Filter by zone if provided
    if (req.query.zone) {
      data = data.filter(f => f.zone === req.query.zone);
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
 * GET /api/families/by-zone/:zone
 * 
 * PURPOSE:
 * Get all families in a specific zone
 * 
 * PARAMETERS:
 * - zone: Zone code (A1, A2, etc.)
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   zone: "A1",
 *   count: 5,
 *   data: [...]
 * }
 */
router.get('/by-zone/:zone', (req, res) => {
  try {
    const data = findMany('families', { zone: req.params.zone });

    res.json({
      success: true,
      zone: req.params.zone,
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
 * GET /api/families/search
 * 
 * PURPOSE:
 * Search families by name, code, phone, or national ID
 * 
 * QUERY PARAMETERS:
 * - q: Search query (required)
 * - zone: (optional) Filter by zone
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   query: "أحمد",
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

    let data = readData('families');

    // Filter by zone if provided
    if (req.query.zone) {
      data = data.filter(f => f.zone === req.query.zone);
    }

    // Search in multiple fields
    data = data.filter(f => 
      f.head_name.toLowerCase().includes(query) ||
      (f.family_code || '').toLowerCase().includes(query) ||
      (f.phone || '').includes(query) ||
      (f.national_id || '').includes(query)
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
 * GET /api/families/:id
 * 
 * PURPOSE:
 * Retrieve a single family by ID
 * 
 * PARAMETERS:
 * - id: Family ID (UUID format)
 * 
 * RESPONSE (Success):
 * {
 *   success: true,
 *   data: { family object }
 * }
 * 
 * RESPONSE (Not Found - 404):
 * {
 *   success: false,
 *   error: "Family not found"
 * }
 */

// ════════════════════════════════════════════════════════════════════════════════
// EXPORT/IMPORT ROUTES (must come before /:id route)
// ════════════════════════════════════════════════════════════════════════════════

// GET - Export all families
router.get('/export/all', (req, res) => {
  try {
    const families = readData('families');
    res.json(families);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST - Import families
router.post('/import/all', (req, res) => {
  try {
    const { families } = req.body;
    if (!Array.isArray(families)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    const currentFamilies = readData('families');
    
    let imported = 0;
    for (const family of families) {
      const existingIndex = currentFamilies.findIndex(f => f.id === family.id);
      
      if (existingIndex >= 0) {
        currentFamilies[existingIndex] = {
          ...currentFamilies[existingIndex],
          ...family,
          updated_at: new Date().toISOString()
        };
      } else {
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

// GET single family by ID

/**
 * Retrieve a single family by ID
 * 
 * PARAMETERS:
 * - id: Family ID (UUID format)
 * 
 * RESPONSE (Success):
 * {
 *   success: true,
 *   data: { family object }
 * }
 * 
 * RESPONSE (Not Found - 404):
 * {
 *   success: false,
 *   error: "Family not found"
 * }
 */
router.get('/:id', (req, res) => {
  try {
    const family = findById('families', req.params.id);

    if (!family) {
      return res.status(404).json({
        success: false,
        error: 'Family not found'
      });
    }

    res.json({
      success: true,
      data: family
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/families
 * 
 * PURPOSE:
 * Create a new family record
 * 
 * REQUEST BODY (required fields marked with *):
 * {
 *   "family_code": "P-005",        // Auto-generated if not provided
 *   "head_name": "محمد أحمد",       // *Required
 *   "national_id": "29012345678901", // *Required (14 digits)
 *   "address": "القاهرة",           // *Required
 *   "phone": "01012345678",         // Optional
 *   "category": "A",                // *Required (A, B, or C)
 *   "members_count": 5,             // *Required
 *   "zone": "A1"                    // *Required
 *   "notes": "ملاحظات إضافية"       // Optional
 * }
 * 
 * VALIDATION:
 * - head_name: Required, 3+ characters
 * - national_id: Required, exactly 14 digits
 * - category: Must be A, B, or C
 * - zone: Must match existing zone pattern
 * - members_count: Must be positive integer
 * 
 * RESPONSE (201 - Created):
 * {
 *   success: true,
 *   message: "Family created successfully",
 *   data: { created family object with generated id }
 * }
 * 
 * ERROR RESPONSE (400 - Bad Request):
 * {
 *   success: false,
 *   error: "Validation error message"
 * }
 */
router.post('/', (req, res) => {
  try {
    const { head_name, national_id, address, phone, category, members_count, zone, notes, family_code } = req.body;

    // Debug log
    console.log('📝 Creating family with data:', { head_name, national_id, address, phone, category, members_count, zone, notes });

    // ============ VALIDATION ============

    // Check required fields
    if (!head_name || head_name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Head name is required and must be at least 3 characters'
      });
    }

    if (national_id && !/^\d{14}$/.test(national_id.toString())) {
      return res.status(400).json({
        success: false,
        error: 'National ID must be exactly 14 digits'
      });
    }

    if (!address || address.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    if (!category || !['A', 'B', 'C'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Category must be A, B, or C'
      });
    }

    if (!members_count || parseInt(members_count) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Members count must be a positive number'
      });
    }

    if (!zone) {
      return res.status(400).json({
        success: false,
        error: 'Zone is required'
      });
    }

    // Check for duplicate national ID
    const existingFamily = findMany('families', { national_id });
    if (existingFamily.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A family with this national ID already exists'
      });
    }

    // Generate code if not provided
    let code = family_code;
    if (!code) {
      const families = readData('families');
      const existingCodes = families
        .map(f => f.family_code)
        .filter(c => c && c.startsWith('P-'))
        .map(c => parseInt(c.replace('P-', '')))
        .sort((a, b) => b - a);
      
      const nextNumber = (existingCodes[0] || 0) + 1;
      code = `P-${String(nextNumber).padStart(3, '0')}`;
    }

    // ============ CREATE RECORD ============

    const newFamily = {
      id: uuidv4(),
      family_code: code,
      head_name: head_name.trim(),
      national_id,
      address: address.trim(),
      phone: phone || '',
      category,
      members_count: parseInt(members_count),
      zone,
      notes: notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    create('families', newFamily);

    res.status(201).json({
      success: true,
      message: 'Family created successfully',
      data: newFamily
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/families/:id
 * 
 * PURPOSE:
 * Update an existing family record
 * 
 * PARAMETERS:
 * - id: Family ID to update
 * 
 * REQUEST BODY:
 * Any of the fields can be updated:
 * {
 *   "head_name": "محمد أحمد",
 *   "phone": "01012345678",
 *   "address": "القاهرة - مدينة نصر",
 *   "members_count": 5,
 *   "notes": "تحديث الملاحظات",
 *   ...
 * }
 * 
 * IMMUTABLE FIELDS (Cannot be changed):
 * - id
 * - family_code (business requirement)
 * - created_at
 * 
 * RESPONSE (200 - OK):
 * {
 *   success: true,
 *   message: "Family updated successfully",
 *   data: { updated family object }
 * }
 * 
 * RESPONSE (404 - Not Found):
 * {
 *   success: false,
 *   error: "Family not found"
 * }
 */
router.put('/:id', (req, res) => {
  try {
    // Check if family exists
    const existingFamily = findById('families', req.params.id);
    if (!existingFamily) {
      return res.status(404).json({
        success: false,
        error: 'Family not found'
      });
    }

    // ============ VALIDATION ============

    // Prevent modification of immutable fields
    const immutableFields = ['id', 'family_code', 'created_at'];
    const updateData = req.body;

    immutableFields.forEach(field => {
      if (field in updateData) {
        delete updateData[field];
      }
    });

    // Validate specific fields if provided
    if (updateData.head_name && updateData.head_name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Head name must be at least 3 characters'
      });
    }

    if (updateData.national_id && !/^\d{14}$/.test(updateData.national_id.toString())) {
      return res.status(400).json({
        success: false,
        error: 'National ID must be exactly 14 digits'
      });
    }

    if (updateData.category && !['A', 'B', 'C'].includes(updateData.category)) {
      return res.status(400).json({
        success: false,
        error: 'Category must be A, B, or C'
      });
    }

    if (updateData.members_count && parseInt(updateData.members_count) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Members count must be positive'
      });
    }

    // ============ UPDATE RECORD ============

    const updatedFamily = update('families', req.params.id, updateData);

    res.json({
      success: true,
      message: 'Family updated successfully',
      data: updatedFamily
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/families/:id
 * 
 * PURPOSE:
 * Delete a family record permanently
 * 
 * ⚠️  WARNING:
 * - This also deletes related distributions
 * - This action cannot be undone
 * - Consider soft deletes for production systems
 * 
 * PARAMETERS:
 * - id: Family ID to delete
 * 
 * RESPONSE (200 - OK):
 * {
 *   success: true,
 *   message: "Family deleted successfully",
 *   deleted_id: "uuid-here"
 * }
 * 
 * RESPONSE (404 - Not Found):
 * {
 *   success: false,
 *   error: "Family not found"
 * }
 */
router.delete('/:id', (req, res) => {
  try {
    // Check if family exists
    const family = findById('families', req.params.id);
    if (!family) {
      return res.status(404).json({
        success: false,
        error: 'Family not found'
      });
    }

    // Delete related distributions
    const distributions = readData('distributions');
    const filteredDistributions = distributions.filter(d => d.family_id !== req.params.id);
    if (distributions.length !== filteredDistributions.length) {
      writeData('distributions', filteredDistributions);
      console.log(`🗑️  Deleted ${distributions.length - filteredDistributions.length} related distributions`);
    }

    // Delete family
    deleteRecord('families', req.params.id);

    res.json({
      success: true,
      message: 'Family deleted successfully',
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
