/* ════════════════════════════════════════════════════════════════════════════════
 FAMILIES PAGE - families.js
 
 PURPOSE:
 - Add new families
 - Update existing families
 - Delete families
 - Form validation
 ════════════════════════════════════════════════════════════════════════════════ */

// Load families page
async function loadFamiliesPage() {
  populateZoneSelect();
  resetFamilyForm();
}

// Populate zone dropdown
function populateZoneSelect() {
  const select = document.getElementById("familyZone");
  if (!select) return;

  const zones = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"];
  select.innerHTML = zones.map((zone) => `<option value="${zone}">${zone}</option>`).join("");

  // Set default
  select.value = app.selectedZone;
}

// Reset family form
function resetFamilyForm() {
  const inputs = [
    "familyName",
    "familyNID",
    "familyPhone",
    "familyMembers",
    "familyAddress",
    "familyNotes",
  ];

  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const category = document.getElementById("familyCategory");
  if (category) category.value = "A";

  const zone = document.getElementById("familyZone");
  if (zone) zone.value = app.selectedZone;
}

// Validate family form
function validateFamilyForm() {
  const name = document.getElementById("familyName")?.value?.trim() || "";
  const nid = document.getElementById("familyNID")?.value?.trim() || "";
  const phone = document.getElementById("familyPhone")?.value?.trim() || "";
  const members = parseInt(
    document.getElementById("familyMembers")?.value || 0
  );
  const address = document.getElementById("familyAddress")?.value?.trim() || "";
  const zone = document.getElementById("familyZone")?.value || "";

  // Validations
  if (!name || name.length < 3) {
    throw new Error("اسم رب الأسرة يجب أن يكون 3 أحرف على الأقل");
  }

  if (nid && nid.length !== 14) {
    throw new Error("الرقم القومي يجب أن يكون 14 رقم");
  }

  if (members <= 0) {
    throw new Error("عدد أفراد الأسرة يجب أن يكون أكبر من صفر");
  }

  if (!address || address.length < 3) {
    throw new Error("العنوان يجب أن يكون 3 أحرف على الأقل");
  }

  if (!zone) {
    throw new Error("يجب اختيار منطقة");
  }

  return true;
}

// Save family
async function saveFamily() {
  try {
    showLoading(true);

    // Validate form
    validateFamilyForm();

    const name = document.getElementById("familyName").value.trim();
    const nid = document.getElementById("familyNID").value.trim() || null;
    const phone = document.getElementById("familyPhone").value.trim() || "";
    const members = parseInt(document.getElementById("familyMembers").value) || 0;
    const address = document.getElementById("familyAddress").value.trim();
    const category = document.getElementById("familyCategory").value;
    const zone = document.getElementById("familyZone").value;
    const notes = document.getElementById("familyNotes").value.trim() || "";

    const data = {
      head_name: name,
      national_id: nid,
      phone,
      members_count: members,
      address,
      category,
      zone,
      notes,
    };

    const response = await createFamily(data);
    const newFamily = response.data;

    // Show success
    toast(
      `✅ تم إضافة العائلة: ${newFamily.family_code}`,
      "success"
    );

    // Reset form
    resetFamilyForm();

    // Reload data
    setTimeout(async () => {
      await loadFamiliesForHome();
      await loadStats();
      nav("home");
    }, 800);
  } catch (error) {
    console.error("Error saving family:", error);
    toast(error.message || "خطأ في حفظ العائلة", "error");
    hideLoading(false);
  }
}

// Update family (for future use)
async function updateFamilyRecord(id, data) {
  try {
    showLoading(true);
    const response = await updateFamily(id, data);
    toast("✅ تم تحديث العائلة بنجاح", "success");
    hideLoading(true);
    return response.data;
  } catch (error) {
    console.error("Error updating family:", error);
    toast(error.message || "خطأ في تحديث العائلة", "error");
    hideLoading(false);
    throw error;
  }
}

// Delete family (for future use)
async function deleteFamilyRecord(id) {
  if (!confirm("هل تريد حذف هذه العائلة؟")) return;

  try {
    showLoading(true);
    await deleteFamily(id);
    toast("✅ تم حذف العائلة بنجاح", "success");
    hideLoading(true);
    await loadFamiliesForHome();
    await loadStats();
  } catch (error) {
    console.error("Error deleting family:", error);
    toast(error.message || "خطأ في حذف العائلة", "error");
    hideLoading(false);
  }
}
