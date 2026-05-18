/* ════════════════════════════════════════════════════════════════════════════════
   NEW FUNCTIONS FOR FAMILY DETAILS - Tab Management & Edit Modal
   ════════════════════════════════════════════════════════════════════════════════ */

/**
 * Fix duplicate element IDs that may occur due to browser parsing issues
 * Ensures medicinesContainer and other IDs are only in their correct tabs
 */
function fixDuplicateElementIds() {
  // Get all elements with id="medicinesContainer"
  const medicinesContainers = document.querySelectorAll('#medicinesContainer');
  
  if (medicinesContainers.length > 1) {
    // Find which one is in tab-medicines and which is in tab-data
    const tabMedicines = document.getElementById('tab-medicines');
    const containerInTabMedicines = tabMedicines?.querySelector('#medicinesContainer');
    
    // Keep the one in tab-medicines, remove ID from others
    medicinesContainers.forEach((container, index) => {
      if (container !== containerInTabMedicines) {
        container.removeAttribute('id');
      }
    });
  }
  
  // Similarly fix totalQuantity and totalCost
  ['totalQuantity', 'totalCost'].forEach(idName => {
    const elements = document.querySelectorAll(`#${idName}`);
    if (elements.length > 1) {
      const tabMedicines = document.getElementById('tab-medicines');
      const correctElement = tabMedicines?.querySelector(`#${idName}`);
      
      elements.forEach((el, index) => {
        if (el !== correctElement) {
          el.removeAttribute('id');
        }
      });
    }
  });
}

// Run the fix when the page loads
if (document.readyState !== 'loading') {
  fixDuplicateElementIds();
} else {
  document.addEventListener('DOMContentLoaded', fixDuplicateElementIds);
}

// Switch between family details tabs
function switchFamilyTab(tabName) {
  // Hide all tabs
  const tabContents = document.querySelectorAll('.family-tab-content');
  tabContents.forEach(tab => {
    tab.style.display = 'none';
    tab.style.opacity = '0';
    tab.style.animation = 'none';
  });

  // Remove active class from all tab buttons
  const tabButtons = document.querySelectorAll('.family-tab');
  tabButtons.forEach(btn => btn.classList.remove('act'));

  // Show selected tab
  const selectedTab = document.getElementById(`tab-${tabName}`);
  if (selectedTab) {
    selectedTab.style.display = 'block';
    selectedTab.style.animation = 'none';
    // Force reflow to trigger animation
    selectedTab.offsetHeight;
    selectedTab.style.opacity = '1';
  }

  // Update tab button styling - find by data-tab attribute
  const clickedButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (clickedButton) {
    clickedButton.classList.add('act');
  }
  
  // Update all tab button styling
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.style.color = 'var(--pri)';
      btn.style.borderBottomColor = 'var(--pri)';
    } else {
      btn.style.color = 'var(--txt2)';
      btn.style.borderBottomColor = 'transparent';
    }
  });
  
  // Re-render medicines list when switching to medicines tab
  if (tabName === 'medicines' && app.familyDetails?.distributions) {
    renderFamilyMedicines(app.familyDetails.distributions);
    calculateAndDisplayTotals(app.familyDetails.distributions);
  }
}

// Calculate monthly data for the monthly tab
async function calculateMonthlyData(distributions) {
  try {
    let totalCost = 0;
    
    distributions.forEach(dist => {
      const medicine = app.familyDetails.medicines.find(m => m.id === dist.medicine_id);
      if (medicine) {
        const quantity = (dist.quantity_external || 0) + (dist.quantity_internal || 0);
        totalCost += quantity * (medicine.unit_price || 0);
      }
    });

    // Set monthly cost
    document.getElementById("monthlyCost").textContent = formatCurrency(totalCost);
    
    // Calculate average from previous months (last 3 months)
    let previousMonthsCost = 0;
    let monthsCount = 0;
    
    // Try to get distributions from previous months
    for (let i = 1; i <= 3; i++) {
      const previousMonth = new Date(app.currentMonth);
      previousMonth.setMonth(previousMonth.getMonth() - i);
      const monthStr = previousMonth.toISOString().slice(0, 7);
      
      try {
        const prevDists = await getDistributions(monthStr);
        const familyPrevDists = (prevDists.data || []).filter(d => d.family_id === app.selectedFamilyId);
        
        let monthCost = 0;
        familyPrevDists.forEach(dist => {
          const medicine = app.familyDetails.medicines.find(m => m.id === dist.medicine_id);
          if (medicine) {
            const quantity = (dist.quantity_external || 0) + (dist.quantity_internal || 0);
            monthCost += quantity * (medicine.unit_price || 0);
          }
        });
        
        if (monthCost > 0) {
          previousMonthsCost += monthCost;
          monthsCount++;
        }
      } catch (e) {
        // Skip if error
      }
    }
    
    const averageCost = monthsCount > 0 ? previousMonthsCost / monthsCount : totalCost;
    document.getElementById("monthlyAverage").textContent = formatCurrency(averageCost);
    
    // Calculate balance (budget - spent)
    const budget = 1000; // Default monthly budget
    const balance = Math.max(0, budget - totalCost);
    document.getElementById("monthlyBalance").textContent = formatCurrency(balance);
  } catch (error) {
    console.error("Error calculating monthly data:", error);
    // Set defaults on error
    document.getElementById("monthlyCost").textContent = formatCurrency(0);
    document.getElementById("monthlyAverage").textContent = formatCurrency(0);
    document.getElementById("monthlyBalance").textContent = formatCurrency(0);
  }
}

// Open edit family modal
function openEditFamilyModal() {
  if (!app.familyDetails) return;
  
  const family = app.familyDetails.family;
  
  // Populate form fields
  document.getElementById("editFamilyName").value = family.head_name || '';
  document.getElementById("editFamilyNID").value = family.national_id || '';
  document.getElementById("editFamilyPhone").value = family.phone || '';
  document.getElementById("editFamilyAddress").value = family.address || '';
  document.getElementById("editFamilyZone").value = family.zone || 'A1';
  document.getElementById("editFamilyCategory").value = family.category || 'A';
  document.getElementById("editFamilyMembers").value = family.members_count || 1;
  document.getElementById("editFamilyNotes").value = family.notes || '';
  
  // Show modal
  document.getElementById("pg-edit-family").style.display = 'flex';
}

// Close edit family modal
function closeEditFamilyModal() {
  document.getElementById("pg-edit-family").style.display = 'none';
}

// Save edited family data
async function saveEditedFamily() {
  try {
    if (!app.familyDetails) return;
    
    showLoading(true);
    
    const familyId = app.familyDetails.family.id;
    
    // Get form values
    const updatedData = {
      head_name: document.getElementById("editFamilyName").value.trim(),
      national_id: document.getElementById("editFamilyNID").value.trim(),
      phone: document.getElementById("editFamilyPhone").value.trim(),
      address: document.getElementById("editFamilyAddress").value.trim(),
      zone: document.getElementById("editFamilyZone").value,
      category: document.getElementById("editFamilyCategory").value,
      members_count: parseInt(document.getElementById("editFamilyMembers").value) || 1,
      notes: document.getElementById("editFamilyNotes").value.trim()
    };
    
    // Validate required field
    if (!updatedData.head_name) {
      toast("اسم رب الأسرة مطلوب", "error");
      hideLoading(false);
      return;
    }
    
    // Call API to update family
    const result = await updateFamily(familyId, updatedData);
    
    if (result.success) {
      // Update local app state
      app.familyDetails.family = { ...app.familyDetails.family, ...updatedData };
      
      // Update families list in app
      const familyIndex = app.families.findIndex(f => f.id === familyId);
      if (familyIndex !== -1) {
        app.families[familyIndex] = { ...app.families[familyIndex], ...updatedData };
      }
      
      // Re-render the details page
      renderFamilyDetails();
      
      // Close modal
      closeEditFamilyModal();
      
      toast("✅ تم تحديث البيانات بنجاح", "success");
    } else {
      toast("خطأ في تحديث البيانات: " + (result.message || 'حاول مجددًا'), "error");
    }
    
    hideLoading(true);
  } catch (error) {
    console.error("Error saving family:", error);
    toast("خطأ في حفظ البيانات: " + error.message, "error");
    hideLoading(false);
  }
}

// Hide toast notification
function hideToast() {
  const toastEl = document.getElementById('toast');
  if (toastEl) {
    toastEl.classList.remove('show');
  }
}

// Load emergency medicines dropdowns
function loadEmergencyMedicinesDropdown() {
  try {
    const select = document.getElementById("emergencyMedicineId");
    if (!select || !app.medicines) return;
    
    select.innerHTML = '<option value="">-- اختر دواء --</option>';
    
    app.medicines.forEach(medicine => {
      const option = document.createElement("option");
      option.value = medicine.id;
      option.textContent = `${medicine.med_name} (${medicine.scientific_name})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading medicines dropdown:", error);
  }
}

// Load pharmacies dropdown
function loadEmergencyPharmaciesDropdown() {
  try {
    const select = document.getElementById("emergencyPharmacyId");
    if (!select || !app.familyDetails?.pharmacies) return;
    
    select.innerHTML = '<option value="">-- اختر صيدلية --</option>';
    
    app.familyDetails.pharmacies.forEach(pharmacy => {
      const option = document.createElement("option");
      option.value = pharmacy.id;
      option.textContent = `${pharmacy.pharmacy_name} (${pharmacy.payment_method || 'كاش'})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading pharmacies dropdown:", error);
  }
}

// Submit emergency distribution
async function submitEmergencyDistribution() {
  try {
    if (!app.familyDetails?.family) return;
    
    const medicineId = document.getElementById("emergencyMedicineId").value;
    const pharmacyId = document.getElementById("emergencyPharmacyId").value;
    const qtyExternal = parseInt(document.getElementById("emergencyQtyExternal").value) || 0;
    const qtyInternal = parseInt(document.getElementById("emergencyQtyInternal").value) || 0;
    const notes = document.getElementById("emergencyNotes").value.trim();
    
    // Validation
    if (!medicineId || !pharmacyId) {
      toast("يجب اختيار الدواء والصيدلية", "error");
      return;
    }
    
    if (qtyExternal === 0 && qtyInternal === 0) {
      toast("يجب إدخال كمية واحدة على الأقل", "error");
      return;
    }
    
    showLoading(true);
    
    // Get current user from token or localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Get current month in YYYY-MM format
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    
    // Create distribution object
    const distribution = {
      family_id: app.familyDetails.family.id,
      medicine_id: medicineId,
      pharmacy_id: pharmacyId,
      quantity_external: qtyExternal,
      quantity_internal: qtyInternal,
      user_id: user.id || 'system',
      month: currentMonth,
      notes: '🚨 صرف إضافي في الطوارئ: ' + (notes || 'بدون ملاحظات'),
      distribution_type: 'emergency'
    };
    
    console.log('📤 Sending distribution:', distribution);
    
    // Call API to create distribution
    const result = await apiCall('/distributions', 'POST', distribution);
    
    if (result.success || result.data) {
      toast("✅ تم تسجيل الصرف الإضافي بنجاح", "success");
      
      // Clear form
      document.getElementById("emergencyMedicineId").value = '';
      document.getElementById("emergencyQtyExternal").value = '';
      document.getElementById("emergencyQtyInternal").value = '';
      document.getElementById("emergencyPharmacyId").value = '';
      document.getElementById("emergencyNotes").value = '';
      
      // Reload family details to show updated data
      setTimeout(() => {
        loadFamilyDetailsPage();
      }, 500);
    } else {
      toast("خطأ في تسجيل الصرف: " + (result.message || result.error || 'حاول مجددًا'), "error");
    }
    
    hideLoading();
  } catch (error) {
    console.error("Error submitting emergency distribution:", error);
    toast("خطأ في تسجيل الصرف الإضافي: " + error.message, "error");
    hideLoading();
  }
}

// Load emergency distributions history
function loadEmergencyDistributionsHistory() {
  try {
    if (!app.familyDetails?.distributions) return;
    
    const container = document.getElementById("emergencyDistributionsHistory");
    if (!container) return;
    
    // Filter emergency distributions
    const emergencyDists = app.familyDetails.distributions.filter(d => d.distribution_type === 'emergency');
    
    if (emergencyDists.length === 0) {
      container.innerHTML = `
        <div style="padding: 12px; text-align: center; color: var(--txt2);">
          <i class="fas fa-inbox"></i> لم يتم تسجيل أي صرفيات إضافية حتى الآن
        </div>
      `;
      return;
    }
    
    container.innerHTML = emergencyDists.map(dist => {
      const medicine = app.medicines?.find(m => m.id === dist.medicine_id);
      const pharmacy = app.familyDetails.pharmacies?.find(p => p.id === dist.pharmacy_id);
      const total = (dist.quantity_external || 0) + (dist.quantity_internal || 0);
      const cost = total * (medicine?.unit_price || 0);
      
      return `
        <div style="padding: 12px; border-bottom: 1px solid var(--brd); background: rgba(231, 111, 81, 0.05)">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
              <div style="font-size: 12px; font-weight: 700; color: var(--txt); margin-bottom: 4px;">
                ${medicine?.med_name || 'دواء محذوف'}
              </div>
              <div style="font-size: 10px; color: var(--txt2); margin-bottom: 6px;">
                📍 ${pharmacy?.pharmacy_name || 'غير محدد'}
              </div>
              <div style="font-size: 9px; color: var(--txt3);">
                📦 خارجية: <strong>${dist.quantity_external || 0}</strong> | داخلية: <strong>${dist.quantity_internal || 0}</strong>
              </div>
              ${dist.notes ? `<div style="font-size: 9px; color: var(--txt3); margin-top: 4px; padding: 4px; background: white; border-radius: 3px;">💬 ${dist.notes}</div>` : ''}
            </div>
            <div style="text-align: left; margin-right: 12px; white-space: nowrap;">
              <div style="font-size: 11px; color: var(--acc); font-weight: 600;">
                ${formatCurrency(cost)} ج.م
              </div>
              <div style="font-size: 9px; color: var(--txt3); margin-top: 4px;">
                ${new Date(dist.issue_date).toLocaleDateString('ar-EG')}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error("Error loading emergency distributions:", error);
  }
}

// Style toast appearance
document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed !important;
      bottom: 80px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      padding: 12px 20px !important;
      background: var(--pri) !important;
      color: white !important;
      border-radius: 8px !important;
      z-index: 2000 !important;
      opacity: 0 !important;
      transition: opacity 0.3s !important;
      pointer-events: none !important;
      max-width: 90% !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    }
    
    .toast.show {
      opacity: 1 !important;
    }
    
    .family-tab-content {
      animation: fadeIn 0.2s ease-in;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .family-tab {
      transition: all 0.3s ease;
    }
    
    .family-tab.act {
      color: var(--pri) !important;
      border-bottom-color: var(--pri) !important;
    }
    
    /* Modal styles */
    #pg-edit-family {
      animation: slideUp 0.3s ease-out;
    }
    
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
});
