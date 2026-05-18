/**
 * ============================================================================
 * Data Manager Utility
 * ============================================================================
 * 
 * PURPOSE:
 * This module manages all JSON file operations. It provides functions to:
 * - Read data from JSON files
 * - Write data to JSON files with proper error handling
 * - Initialize data files with default values if they don't exist
 * - Maintain data persistence across server restarts
 * 
 * WHY JSON FILES?
 * - Local development and testing without database setup
 * - Easy to understand data structure
 * - Simple backup and import/export
 * - Later can be migrated to MongoDB/MySQL without changing business logic
 * 
 * STRUCTURE:
 * - Each data type has its own JSON file
 * - Synchronous operations for simplicity in development
 * - Error handling to prevent data loss
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the data directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(path.dirname(__dirname), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Created data directory:', DATA_DIR);
}

/**
 * Define all data files with their default content
 * This structure makes it easy to add new data types
 * 
 * WHY SEPARATE FILES?
 * - Better organization and scalability
 * - Each file can be updated independently
 * - Easy to backup specific data types
 * - Clear separation of concerns
 */
const DATA_FILES = {
  users: {
    path: path.join(DATA_DIR, 'users.json'),
    default: [
      {
        id: 'admin-001',
        full_name: 'مدير النظام',
        username: 'admin',
        password_hash: 'admin123', // In production: use bcrypt
        role: 'Admin',
        email: 'admin@brothersofthelord.com',
        phone: '01001234567',
        created_at: new Date().toISOString(),
        last_login: null,
        is_active: true
      }
    ]
  },
  families: {
    path: path.join(DATA_DIR, 'families.json'),
    default: []
  },
  medicines: {
    path: path.join(DATA_DIR, 'medicines.json'),
    default: []
  },
  distributions: {
    path: path.join(DATA_DIR, 'distributions.json'),
    default: []
  },
  pharmacies: {
    path: path.join(DATA_DIR, 'pharmacies.json'),
    default: []
  }
};

/**
 * Initialize all data files
 * 
 * WHAT IT DOES:
 * 1. Checks if each JSON file exists
 * 2. If not, creates it with default values
 * 3. If file is empty or corrupted, restores it
 * 4. Ensures all files are valid JSON
 * 
 * CALLED ONCE:
 * - When server starts in server.js
 * - Ensures consistent state before accepting requests
 */
export function initializeDataFiles() {
  Object.entries(DATA_FILES).forEach(([fileType, config]) => {
    try {
      if (!fs.existsSync(config.path)) {
        // File doesn't exist, create it with defaults
        fs.writeFileSync(config.path, JSON.stringify(config.default, null, 2));
        console.log(`✅ Created ${fileType} data file`);
      } else {
        // File exists, validate it
        const content = fs.readFileSync(config.path, 'utf8');
        try {
          JSON.parse(content);
          console.log(`✅ ${fileType} data file is valid`);
        } catch (parseErr) {
          // File is corrupted, restore defaults
          console.warn(`⚠️  ${fileType} file corrupted, restoring defaults`);
          fs.writeFileSync(config.path, JSON.stringify(config.default, null, 2));
        }
      }
    } catch (error) {
      console.error(`❌ Error initializing ${fileType}:`, error.message);
    }
  });
}

/**
 * Read data from a JSON file
 * 
 * PARAMETERS:
 * - fileType: Key from DATA_FILES (users, families, medicines, distributions)
 * 
 * RETURNS:
 * - Array of objects if file exists and is valid
 * - Empty array if file doesn't exist or is empty
 * - Throws error if JSON is corrupted
 * 
 * WHY SYNC?
 * - Simpler code for development
 * - JSON files are small and fast to read
 * - In production, would use async with caching
 */
export function readData(fileType) {
  try {
    if (!DATA_FILES[fileType]) {
      throw new Error(`Unknown file type: ${fileType}`);
    }

    const filePath = DATA_FILES[fileType].path;
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}, returning defaults`);
      return DATA_FILES[fileType].default;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.trim()) {
      console.warn(`⚠️  File is empty: ${filePath}`);
      return DATA_FILES[fileType].default;
    }

    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`❌ Error reading ${fileType}:`, error.message);
    return DATA_FILES[fileType].default;
  }
}

/**
 * Write data to a JSON file
 * 
 * PARAMETERS:
 * - fileType: Key from DATA_FILES (users, families, medicines, distributions)
 * - data: Array of objects to write
 * 
 * FEATURES:
 * - Creates backup before overwriting (safety)
 * - Pretty-prints JSON for readability
 * - Validates data before writing
 * - Handles errors gracefully
 * 
 * WHY BACKUP?
 * - Prevents data loss if write fails
 * - Easy recovery if corruption occurs
 * - Can be used for audit trails
 * 
 * THROWS:
 * - Error if data is not an array
 * - Error if write fails
 */
export function writeData(fileType, data) {
  try {
    if (!DATA_FILES[fileType]) {
      throw new Error(`Unknown file type: ${fileType}`);
    }

    // Validate input
    if (!Array.isArray(data)) {
      throw new Error(`Data must be an array, got ${typeof data}`);
    }

    const filePath = DATA_FILES[fileType].path;
    
    // Create backup before overwriting
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.backup`;
      fs.copyFileSync(filePath, backupPath);
    }

    // Write new data
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Saved ${data.length} ${fileType} records`);
    
    return true;
  } catch (error) {
    console.error(`❌ Error writing ${fileType}:`, error.message);
    throw error;
  }
}

/**
 * Find a single record by ID
 * 
 * PARAMETERS:
 * - fileType: Type of data to search
 * - id: ID of record to find
 * 
 * RETURNS:
 * - Object if found
 * - null if not found
 * 
 * USAGE:
 * const family = findById('families', 'family-001');
 */
export function findById(fileType, id) {
  const data = readData(fileType);
  return data.find(item => item.id === id) || null;
}

/**
 * Find multiple records matching a condition
 * 
 * PARAMETERS:
 * - fileType: Type of data to search
 * - condition: Object with field:value pairs
 * 
 * RETURNS:
 * - Array of matching records
 * 
 * EXAMPLES:
 * - findMany('families', { zone: 'A1' })
 * - findMany('medicines', { stock_quantity: 0 })
 * - findMany('distributions', { status: 'completed', month: '2024-01' })
 */
export function findMany(fileType, condition = {}) {
  const data = readData(fileType);
  
  if (Object.keys(condition).length === 0) {
    return data;
  }

  return data.filter(item => {
    return Object.entries(condition).every(([key, value]) => {
      return item[key] === value;
    });
  });
}

/**
 * Create a new record
 * 
 * PARAMETERS:
 * - fileType: Type of data
 * - record: Object with record data (must have 'id' field)
 * 
 * THROWS:
 * - Error if record doesn't have 'id'
 * - Error if record with same ID already exists
 * 
 * WHY CHECK FOR DUPLICATES?
 * - Prevents accidental overwrites
 * - Ensures data integrity
 * - Makes debugging easier
 */
export function create(fileType, record) {
  if (!record.id) {
    throw new Error('Record must have an id field');
  }

  const data = readData(fileType);
  
  if (data.some(item => item.id === record.id)) {
    throw new Error(`Record with id ${record.id} already exists`);
  }

  data.push(record);
  writeData(fileType, data);
  
  return record;
}

/**
 * Update an existing record
 * 
 * PARAMETERS:
 * - fileType: Type of data
 * - id: ID of record to update
 * - updates: Object with fields to update
 * 
 * RETURNS:
 * - Updated record object
 * 
 * THROWS:
 * - Error if record not found
 * 
 * FEATURES:
 * - Only updates fields in 'updates' object
 * - Preserves other fields
 * - Automatically adds 'updated_at' timestamp
 */
export function update(fileType, id, updates) {
  const data = readData(fileType);
  const index = data.findIndex(item => item.id === id);
  
  if (index === -1) {
    throw new Error(`Record with id ${id} not found`);
  }

  // Update only provided fields
  data[index] = {
    ...data[index],
    ...updates,
    updated_at: new Date().toISOString()
  };

  writeData(fileType, data);
  return data[index];
}

/**
 * Delete a record
 * 
 * PARAMETERS:
 * - fileType: Type of data
 * - id: ID of record to delete
 * 
 * RETURNS:
 * - The deleted record object (for confirmation)
 * 
 * THROWS:
 * - Error if record not found
 * 
 * WHY RETURN DELETED RECORD?
 * - Useful for audit logs
 * - Confirms what was deleted
 * - Can be used for undo functionality
 */
export function deleteRecord(fileType, id) {
  const data = readData(fileType);
  const index = data.findIndex(item => item.id === id);
  
  if (index === -1) {
    throw new Error(`Record with id ${id} not found`);
  }

  const [deleted] = data.splice(index, 1);
  writeData(fileType, data);
  
  return deleted;
}

/**
 * Get count of all records or matching condition
 * 
 * PARAMETERS:
 * - fileType: Type of data
 * - condition: Optional filter condition
 * 
 * RETURNS:
 * - Number of records
 * 
 * USAGE:
 * - totalFamilies = count('families')
 * - familiesInZoneA1 = count('families', { zone: 'A1' })
 */
export function count(fileType, condition = {}) {
  return findMany(fileType, condition).length;
}

/**
 * Clear all data (for testing purposes)
 * 
 * ⚠️  WARNING: This deletes all data!
 * Only use in development/testing
 */
export function clearAll(fileType) {
  writeData(fileType, []);
  console.warn(`⚠️  Cleared all ${fileType} data`);
}

/**
 * PHARMACY FUNCTIONS
 * ============================================================================
 * Specialized functions for pharmacy operations
 */

/**
 * Get all pharmacies
 */
export async function getPharmacies() {
  return readData('pharmacies');
}

/**
 * Get pharmacy by ID
 */
export async function getPharmacyById(id) {
  return findById('pharmacies', id);
}

/**
 * Create new pharmacy
 */
export async function createPharmacy(pharmacyData) {
  const id = 'pharmacy-' + Date.now();
  const pharmacy = {
    id,
    ...pharmacyData,
    created_at: new Date().toISOString(),
    is_active: pharmacyData.is_active !== false
  };
  
  return create('pharmacies', pharmacy);
}

/**
 * Update pharmacy
 */
export async function updatePharmacy(id, updates) {
  return update('pharmacies', id, updates);
}

/**
 * Delete pharmacy
 */
export async function deletePharmacy(id) {
  return deleteRecord('pharmacies', id);
}

export default {
  initializeDataFiles,
  readData,
  writeData,
  findById,
  findMany,
  create,
  update,
  deleteRecord,
  count,
  clearAll,
  getPharmacies,
  getPharmacyById,
  createPharmacy,
  updatePharmacy,
  deletePharmacy
};
