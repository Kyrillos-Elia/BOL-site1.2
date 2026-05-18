/**
 * ============================================================================
 * Statistics & Reports Routes API
 * ============================================================================
 * 
 * PURPOSE:
 * Provides aggregated data for dashboards and reports:
 * - Overview statistics
 * - Monthly/yearly summaries
 * - Zone-wise breakdown
 * - Medicine utilization
 * - Family statistics
 * - Export data for analysis
 */

import express from 'express';
import { readData, findMany } from '../utils/dataManager.js';

const router = express.Router();

/**
 * GET /api/stats/dashboard
 * 
 * PURPOSE:
 * Get overall dashboard statistics
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   data: {
 *     total_families: 150,
 *     total_medicines: 45,
 *     total_distributions: 500,
 *     low_stock_medicines: 5,
 *     total_cost: 25000.50,
 *     cost_this_month: 5000.00,
 *     average_family_cost: 167.35,
 *     ...
 *   }
 * }
 */
router.get('/dashboard', (req, res) => {
  try {
    const families = readData('families');
    const medicines = readData('medicines');
    const distributions = readData('distributions');

    // Low stock
    const lowStockMeds = medicines.filter(m => m.stock_quantity <= m.min_stock_alert);

    // Expiring medicines (90 days)
    const today = new Date();
    const thresholdDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expiringMeds = medicines.filter(m => {
      const exp = new Date(m.expiry_date);
      return exp <= thresholdDate && exp >= today;
    });

    // Cost calculations
    let totalCost = 0;
    let costThisMonth = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);

    distributions.forEach(dist => {
      const medicine = medicines.find(m => m.id === dist.medicine_id);
      if (medicine) {
        const cost = (dist.quantity_external + dist.quantity_internal) * medicine.unit_price;
        totalCost += cost;
        if (dist.month === currentMonth) {
          costThisMonth += cost;
        }
      }
    });

    // Zone breakdown
    const zoneStats = {};
    families.forEach(f => {
      if (!zoneStats[f.zone]) {
        zoneStats[f.zone] = { count: 0, total_members: 0 };
      }
      zoneStats[f.zone].count++;
      zoneStats[f.zone].total_members += f.members_count || 0;
    });

    // Category breakdown
    const categoryStats = {};
    families.forEach(f => {
      if (!categoryStats[f.category]) {
        categoryStats[f.category] = 0;
      }
      categoryStats[f.category]++;
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        total_families: families.length,
        total_medicines: medicines.length,
        total_distributions: distributions.length,
        low_stock_medicines: lowStockMeds.length,
        expiring_soon_medicines: expiringMeds.length,
        total_members: families.reduce((sum, f) => sum + (f.members_count || 0), 0),
        total_cost: parseFloat(totalCost.toFixed(2)),
        cost_this_month: parseFloat(costThisMonth.toFixed(2)),
        average_family_cost: families.length > 0 ? parseFloat((totalCost / families.length).toFixed(2)) : 0,
        zone_distribution: zoneStats,
        category_distribution: categoryStats,
        medicine_stock_value: parseFloat(medicines.reduce((sum, m) => sum + (m.stock_quantity * m.unit_price), 0).toFixed(2))
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
 * GET /api/stats/monthly/:month
 * 
 * PURPOSE:
 * Get statistics for a specific month
 * 
 * PARAMETERS:
 * - month: YYYY-MM format
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   month: "2024-01",
 *   data: {
 *     total_distributions: 25,
 *     unique_families: 15,
 *     unique_medicines: 10,
 *     total_cost: 5000.50,
 *     ...
 *   }
 * }
 */
router.get('/monthly/:month', (req, res) => {
  try {
    const month = req.params.month;
    const distributions = findMany('distributions', { month });
    const medicines = readData('medicines');
    const families = readData('families');

    const uniqueFamilies = new Set(distributions.map(d => d.family_id));
    const uniqueMedicines = new Set(distributions.map(d => d.medicine_id));

    let totalCost = 0;
    let totalQty = 0;
    let internalQty = 0;
    let externalQty = 0;

    distributions.forEach(dist => {
      const medicine = medicines.find(m => m.id === dist.medicine_id);
      const qty = dist.quantity_external + dist.quantity_internal;
      totalQty += qty;
      externalQty += dist.quantity_external;
      internalQty += dist.quantity_internal;
      if (medicine) {
        totalCost += qty * medicine.unit_price;
      }
    });

    res.json({
      success: true,
      month,
      data: {
        total_distributions: distributions.length,
        unique_families: uniqueFamilies.size,
        unique_medicines: uniqueMedicines.size,
        total_quantity: totalQty,
        external_pharmacy: externalQty,
        internal_pharmacy: internalQty,
        total_cost: parseFloat(totalCost.toFixed(2)),
        average_distribution_cost: distributions.length > 0 ? parseFloat((totalCost / distributions.length).toFixed(2)) : 0
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
 * GET /api/stats/zone/:zone
 * 
 * PURPOSE:
 * Get statistics for a specific zone
 * 
 * PARAMETERS:
 * - zone: Zone code (A1, A2, etc.)
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   zone: "A1",
 *   data: {
 *     families_count: 10,
 *     total_members: 45,
 *     distributions_this_month: 15,
 *     cost_this_month: 2500.00,
 *     ...
 *   }
 * }
 */
router.get('/zone/:zone', (req, res) => {
  try {
    const zone = req.params.zone;
    const families = findMany('families', { zone });
    const distributions = readData('distributions');
    const medicines = readData('medicines');
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Distributions in this zone this month
    const zoneDistributions = distributions.filter(d => {
      const family = families.find(f => f.id === d.family_id);
      return family && d.month === currentMonth;
    });

    let totalCost = 0;
    zoneDistributions.forEach(dist => {
      const medicine = medicines.find(m => m.id === dist.medicine_id);
      if (medicine) {
        const qty = dist.quantity_external + dist.quantity_internal;
        totalCost += qty * medicine.unit_price;
      }
    });

    const totalMembers = families.reduce((sum, f) => sum + (f.members_count || 0), 0);

    res.json({
      success: true,
      zone,
      data: {
        families_count: families.length,
        total_members: totalMembers,
        category_A: families.filter(f => f.category === 'A').length,
        category_B: families.filter(f => f.category === 'B').length,
        category_C: families.filter(f => f.category === 'C').length,
        distributions_this_month: zoneDistributions.length,
        cost_this_month: parseFloat(totalCost.toFixed(2))
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
 * GET /api/stats/medicines
 * 
 * PURPOSE:
 * Get medicine utilization statistics
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   data: {
 *     total_in_stock: 5000,
 *     total_stock_value: 15000.00,
 *     low_stock_count: 5,
 *     expiring_soon_count: 3,
 *     most_used: [...],
 *     least_used: [...]
 *   }
 * }
 */
router.get('/medicines', (req, res) => {
  try {
    const medicines = readData('medicines');
    const distributions = readData('distributions');

    // Calculate usage statistics
    const usageStats = {};
    distributions.forEach(dist => {
      if (!usageStats[dist.medicine_id]) {
        usageStats[dist.medicine_id] = 0;
      }
      usageStats[dist.medicine_id] += dist.quantity_external + dist.quantity_internal;
    });

    // Add usage to medicines
    const medWithUsage = medicines.map(m => ({
      id: m.id,
      med_name: m.med_name,
      stock_quantity: m.stock_quantity,
      unit_price: m.unit_price,
      times_distributed: usageStats[m.id] || 0,
      stock_value: m.stock_quantity * m.unit_price
    }));

    // Sort by usage
    const mostUsed = [...medWithUsage].sort((a, b) => b.times_distributed - a.times_distributed).slice(0, 10);
    const leastUsed = [...medWithUsage].sort((a, b) => a.times_distributed - b.times_distributed).slice(0, 5);
    const lowStock = medicines.filter(m => m.stock_quantity <= m.min_stock_alert);

    // Expiring
    const today = new Date();
    const thresholdDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expiring = medicines.filter(m => {
      const exp = new Date(m.expiry_date);
      return exp <= thresholdDate && exp >= today;
    });

    res.json({
      success: true,
      data: {
        total_medicines: medicines.length,
        total_in_stock: medicines.reduce((sum, m) => sum + m.stock_quantity, 0),
        total_stock_value: parseFloat(medicines.reduce((sum, m) => sum + (m.stock_quantity * m.unit_price), 0).toFixed(2)),
        low_stock_count: lowStock.length,
        expiring_soon_count: expiring.length,
        most_used_medicines: mostUsed,
        least_used_medicines: leastUsed,
        low_stock_medicines: lowStock.map(m => ({
          id: m.id,
          med_name: m.med_name,
          stock_quantity: m.stock_quantity,
          min_alert: m.min_stock_alert
        }))
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
 * GET /api/stats/families
 * 
 * PURPOSE:
 * Get family statistics
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   data: {
 *     total_families: 150,
 *     total_members: 750,
 *     average_family_size: 5,
 *     by_zone: { A1: 10, A2: 15, ... },
 *     by_category: { A: 50, B: 70, C: 30 }
 *   }
 * }
 */
router.get('/families', (req, res) => {
  try {
    const families = readData('families');

    const zoneStats = {};
    const categoryStats = {};

    families.forEach(f => {
      // Zone stats
      if (!zoneStats[f.zone]) {
        zoneStats[f.zone] = 0;
      }
      zoneStats[f.zone]++;

      // Category stats
      if (!categoryStats[f.category]) {
        categoryStats[f.category] = 0;
      }
      categoryStats[f.category]++;
    });

    const totalMembers = families.reduce((sum, f) => sum + (f.members_count || 0), 0);

    res.json({
      success: true,
      data: {
        total_families: families.length,
        total_members: totalMembers,
        average_family_size: families.length > 0 ? (totalMembers / families.length).toFixed(2) : 0,
        by_zone: zoneStats,
        by_category: categoryStats
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
 * GET /api/stats/export
 * 
 * PURPOSE:
 * Generate comprehensive statistics for export
 * 
 * QUERY PARAMETERS:
 * - format: 'json' (default), 'csv' (optional for future)
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   exported_at: "2024-01-20T10:30:00Z",
 *   data: {
 *     summary: {...},
 *     families: [...],
 *     medicines: [...],
 *     distributions: [...]
 *   }
 * }
 */
router.get('/export', (req, res) => {
  try {
    const families = readData('families');
    const medicines = readData('medicines');
    const distributions = readData('distributions');
    const users = readData('users').map(u => {
      const { password_hash, ...safe } = u;
      return safe;
    });

    // Calculate dashboard stats
    const lowStockMeds = medicines.filter(m => m.stock_quantity <= m.min_stock_alert);
    const today = new Date();
    const thresholdDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
    const expiringMeds = medicines.filter(m => {
      const exp = new Date(m.expiry_date);
      return exp <= thresholdDate && exp >= today;
    });

    let totalCost = 0;
    distributions.forEach(dist => {
      const medicine = medicines.find(m => m.id === dist.medicine_id);
      if (medicine) {
        totalCost += (dist.quantity_external + dist.quantity_internal) * medicine.unit_price;
      }
    });

    const exportData = {
      success: true,
      exported_at: new Date().toISOString(),
      summary: {
        total_families: families.length,
        total_medicines: medicines.length,
        total_distributions: distributions.length,
        total_users: users.length,
        low_stock_medicines: lowStockMeds.length,
        expiring_medicines: expiringMeds.length,
        total_cost: parseFloat(totalCost.toFixed(2))
      },
      data: {
        families,
        medicines: medicines.map(m => {
          const { ...safe } = m;
          return safe;
        }),
        distributions,
        users
      }
    };

    res.json(exportData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
