/* ════════════════════════════════════════════════════════════════════════════════
 DISTRIBUTIONS PAGE - distributions.js
 
 PURPOSE:
 - Record medicine distribution to families
 - Track stock deduction
 - Prevent duplicate distributions
 ════════════════════════════════════════════════════════════════════════════════ */

// Load distributions page
async function loadDistributionsPage() {
  await loadDistributions();
  await updateFamilySelects();
  renderDistributionsList();
}

// Load distributions from API
async function loadDistributions() {
  try {
    const distributions = await getDistributions(app.currentMonth);
    app.distributions = distributions.data || [];
    renderDistributionsList();
  } catch (error) {
    console.error("Error loading distributions:", error);
  }
}

// Render distributions list
function renderDistributionsList() {
  const container = document.getElementById("distributionsList");
  if (!container) return;

  if (!app.distributions || app.distributions.length === 0) {
    container.innerHTML = `
      <div class="cd">
        <div class="et">
          <div class="et-i"><i class="fas fa-hand-holding-medical"></i></div>
          <div class="et-t">لا توجد توزيعات</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="cd">
    ${app.distributions
      .map((dist) => {
        const family = app.families.find((f) => f.id === dist.family_id);
        const medicine = app.medicines.find((m) => m.id === dist.medicine_id);
        const pharmacy = app.pharmacies?.find((p) => p.id === dist.pharmacy_id);
        const total = (dist.quantity_external || 0) + (dist.quantity_internal || 0);

        return `
          <div class="ti">
            <div class="tic" style="
              background: var(--pri-p);
              color: var(--pri);
            ">
              <i class="fas fa-exchange-alt"></i>
            </div>
            <div class="tinf">
              <div class="tin">${family?.head_name || "عائلة محذوفة"}</div>
              <div class="tid">${medicine?.med_name || "دواء محذوف"}</div>
              <div style="font-size: 10px; color: var(--txt3); margin-top: 3px;">
                خارجية: <strong>${dist.quantity_external || 0}</strong> | 
                داخلية: <strong>${dist.quantity_internal || 0}</strong> | 
                الإجمالي: <strong>${total}</strong>
              </div>
              <div style="font-size: 10px; color: var(--txt3); margin-top: 3px;">
                الصيدلية: <strong>${pharmacy?.pharmacy_name || 'غير محدد'}</strong>
              </div>
              <div class="tip">${new Date(dist.issue_date).toLocaleDateString("ar-EG")}</div>
            </div>
            <div class="ta">
              <button class="ib ib-d" onclick="deleteDistributionRecord('${dist.id}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("")}
  </div>`;
}

// Validate distribution form
function validateDistributionForm() {
  const familyId = document.getElementById("distFamily")?.value || "";
  const medicineId = document.getElementById("distMedicine")?.value || "";
  const pharmacyId = document.getElementById("distPharmacy")?.value || "";
  const external = parseInt(
    document.getElementById("distExternal")?.value || 0
  );
  const internal = parseInt(
    document.getElementById("distInternal")?.value || 0
  );

  if (!familyId) {
    throw new Error("يجب اختيار عائلة");
  }

  if (!medicineId) {
    throw new Error("يجب اختيار دواء");
  }

  if (!pharmacyId) {
    throw new Error("يجب اختيار صيدلية");
  }

  if (external < 0 || internal < 0) {
    throw new Error("الكمية يجب أن تكون موجبة");
  }

  if (external + internal <= 0) {
    throw new Error("يجب إدخال كمية على الأقل");
  }

  return true;
}

// Save distribution
async function saveDistribution() {
  try {
    showLoading(true);

    // Validate form
    validateDistributionForm();

    const familyId = document.getElementById("distFamily").value;
    const medicineId = document.getElementById("distMedicine").value;
    const pharmacyId = document.getElementById("distPharmacy").value;
    const external = parseInt(
      document.getElementById("distExternal").value
    ) || 0;
    const internal = parseInt(
      document.getElementById("distInternal").value
    ) || 0;
    const notes = document.getElementById("distNotes")?.value?.trim() || "";

    const data = {
      family_id: familyId,
      medicine_id: medicineId,
      pharmacy_id: pharmacyId,
      quantity_external: external,
      quantity_internal: internal,
      month: app.currentMonth,
      notes,
    };

    const response = await createDistribution(data);

    const family = app.families.find((f) => f.id === familyId);
    const medicine = app.medicines.find((m) => m.id === medicineId);

    toast(
      `✅ تم تسجيل الصرف: ${family?.family_code} - ${medicine?.med_name}`,
      "success"
    );

    // Reset form
    document.getElementById("distFamily").value = "";
    document.getElementById("distMedicine").value = "";
    document.getElementById("distPharmacy").value = "";
    document.getElementById("distExternal").value = "";
    document.getElementById("distInternal").value = "";
    document.getElementById("distNotes").value = "";

    // Reload distributions
    await loadDistributions();
  } catch (error) {
    console.error("Error saving distribution:", error);
    toast(error.message || "خطأ في تسجيل الصرف", "error");
    hideLoading(false);
  }
}

// Delete distribution
async function deleteDistributionRecord(distributionId) {
  if (!confirm("هل تريد حذف هذا الصرف؟")) return;

  try {
    showLoading(true);
    await deleteDistribution(distributionId);
    toast("✅ تم حذف الصرف بنجاح", "success");
    await loadDistributions();
  } catch (error) {
    console.error("Error deleting distribution:", error);
    toast(error.message || "خطأ في حذف الصرف", "error");
    hideLoading(false);
  }
}
