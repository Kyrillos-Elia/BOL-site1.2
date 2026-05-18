/* ════════════════════════════════════════════════════════════════════════════════
 MEDICINES PAGE - medicines.js
 
 PURPOSE:
 - Add new medicines
 - Update medicine stock
 - Display medicine inventory
 - Track expiry dates
 ════════════════════════════════════════════════════════════════════════════════ */

// Load medicines page
async function loadMedicinesPage() {
  await loadMedicines();
  renderMedicinesList();
}

// Load medicines from API
async function loadMedicines() {
  try {
    const medicines = await getMedicines();
    app.medicines = medicines.data || [];
    renderMedicinesList();
  } catch (error) {
    console.error("Error loading medicines:", error);
  }
}

// Render medicines list
function renderMedicinesList() {
  const container = document.getElementById("medicinesList");
  if (!container) return;

  if (!app.medicines || app.medicines.length === 0) {
    container.innerHTML = `
      <div class="cd">
        <div class="et">
          <div class="et-i"><i class="fas fa-pills"></i></div>
          <div class="et-t">لا توجد أدوية مسجلة</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="cd">
    ${app.medicines
      .map((medicine) => {
        const isLowStock = medicine.stock_quantity < medicine.min_stock_alert;
        const expiryDate = new Date(medicine.expiry_date);
        const today = new Date();
        const daysToExpiry = Math.floor(
          (expiryDate - today) / (1000 * 60 * 60 * 24)
        );
        const isExpiring = daysToExpiry < 90 && daysToExpiry > 0;
        const isExpired = daysToExpiry <= 0;

        return `
          <div class="ti">
            <div class="tic" style="
              background: ${isLowStock ? "var(--wrn-p)" : "var(--pri-p)"};
              color: ${isLowStock ? "var(--wrn)" : "var(--pri)"};
            ">
              <i class="fas fa-capsules"></i>
            </div>
            <div class="tinf">
              <div class="tin">${medicine.med_name}</div>
              <div class="tid">${medicine.scientific_name}</div>
              <div style="font-size: 10px; color: var(--txt3); margin-top: 3px;">
                السعر: <strong>${formatCurrency(medicine.unit_price)}</strong> | 
                الكمية: <strong>${medicine.stock_quantity}</strong>
              </div>
              ${
                isExpiring
                  ? `<div style="color: var(--wrn); font-size: 10px; font-weight: 700; margin-top: 3px;">
                    ⚠️ ينتهي في ${daysToExpiry} أيام
                  </div>`
                  : ""
              }
              ${
                isExpired
                  ? `<div style="color: var(--err); font-size: 10px; font-weight: 700; margin-top: 3px;">
                    ❌ منتهية الصلاحية
                  </div>`
                  : ""
              }
            </div>
            <div class="ta">
              <button class="ib ib-e" onclick="editMedicine('${medicine.id}')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="ib ib-d" onclick="deleteMedicineRecord('${medicine.id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("")}
  </div>`;
}

// Validate medicine form
function validateMedicineForm() {
  const name = document.getElementById("medName")?.value?.trim() || "";
  const scientific = document.getElementById("medScientific")?.value?.trim() || "";
  const stock = parseInt(document.getElementById("medStock")?.value || 0);
  const price = parseFloat(document.getElementById("medPrice")?.value || 0);
  const expiry = document.getElementById("medExpiry")?.value || "";

  if (!name || name.length < 3) {
    throw new Error("اسم الدواء يجب أن يكون 3 أحرف على الأقل");
  }

  if (!scientific || scientific.length < 2) {
    throw new Error("الاسم العلمي إجباري");
  }

  if (stock < 0) {
    throw new Error("الكمية يجب أن تكون موجبة");
  }

  if (price <= 0) {
    throw new Error("السعر يجب أن يكون أكبر من صفر");
  }

  if (!expiry) {
    throw new Error("تاريخ الانتهاء إجباري");
  }

  const expiryDate = new Date(expiry);
  if (expiryDate < new Date()) {
    throw new Error("تاريخ الانتهاء يجب أن يكون في المستقبل");
  }

  return true;
}

// Save medicine
async function saveMedicine() {
  try {
    showLoading(true);

    // Validate form
    validateMedicineForm();

    const name = document.getElementById("medName").value.trim();
    const scientific = document.getElementById("medScientific").value.trim();
    const stock = parseInt(document.getElementById("medStock").value) || 0;
    const price = parseFloat(document.getElementById("medPrice").value) || 0;
    const expiry = document.getElementById("medExpiry").value;
    const form = document.getElementById("medForm").value.trim() || "";

    const data = {
      med_name: name,
      scientific_name: scientific,
      stock_quantity: stock,
      unit_price: price,
      expiry_date: expiry,
      dosage_form: form,
      min_stock_alert: Math.ceil(stock * 0.2), // 20% of stock
    };

    const response = await createMedicine(data);

    toast(`✅ تم إضافة الدواء: ${response.data.med_name}`, "success");

    // Reset form
    document.getElementById("medName").value = "";
    document.getElementById("medScientific").value = "";
    document.getElementById("medStock").value = "";
    document.getElementById("medPrice").value = "";
    document.getElementById("medExpiry").value = "";
    document.getElementById("medForm").value = "";

    // Reload medicines
    await loadMedicines();
  } catch (error) {
    console.error("Error saving medicine:", error);
    toast(error.message || "خطأ في حفظ الدواء", "error");
    hideLoading(false);
  }
}

// Edit medicine (for future use)
function editMedicine(medicineId) {
  console.log("Edit medicine:", medicineId);
  // TODO: Show edit modal
}

// Delete medicine
async function deleteMedicineRecord(medicineId) {
  if (!confirm("هل تريد حذف هذا الدواء؟")) return;

  try {
    showLoading(true);
    await deleteMedicine(medicineId);
    toast("✅ تم حذف الدواء بنجاح", "success");
    await loadMedicines();
  } catch (error) {
    console.error("Error deleting medicine:", error);
    toast(error.message || "خطأ في حذف الدواء", "error");
    hideLoading(false);
  }
}

// Update family and medicine selects (for distributions page)
async function updateFamilySelects() {
  try {
    // جلب جميع العائلات من الخادم
    const familiesResponse = await apiCall("/families");
    const allFamilies = familiesResponse.data || [];
    
    // جلب جميع الأدوية من الخادم
    const medicinesResponse = await apiCall("/medicines");
    const allMedicines = medicinesResponse.data || [];

    // جلب جميع الصيدليات من الخادم
    const pharmaciesResponse = await apiCall("/pharmacies");
    const allPharmacies = pharmaciesResponse.data || [];
    app.pharmacies = allPharmacies;

    const familySelect = document.getElementById("distFamily");
    const medicineSelect = document.getElementById("distMedicine");
    const pharmacySelect = document.getElementById("distPharmacy");

    if (familySelect) {
      familySelect.innerHTML =
        '<option value="">-- اختر عائلة --</option>' +
        allFamilies
          .map((f) => `<option value="${f.id}">${f.family_code} - ${f.head_name}</option>`)
          .join("");
    }

    if (medicineSelect) {
      medicineSelect.innerHTML =
        '<option value="">-- اختر دواء --</option>' +
        allMedicines
          .map((m) => `<option value="${m.id}">${m.med_name}</option>`)
          .join("");
    }

    if (pharmacySelect) {
      pharmacySelect.innerHTML =
        '<option value="">-- اختر صيدلية --</option>' +
        allPharmacies
          .filter((p) => p.is_active !== false)
          .map((p) => `<option value="${p.id}">${p.pharmacy_name} - ${p.payment_method || 'كاش'}</option>`)
          .join("");
    }
  } catch (error) {
    console.error("Error updating selects:", error);
    toast("خطأ في تحميل البيانات", "error");
  }
}
