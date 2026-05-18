/* ════════════════════════════════════════════════════════════════════════════════
   IMPORT/EXPORT FUNCTIONS - Data Management
   ════════════════════════════════════════════════════════════════════════════════ */

// Initialize import/export page - only show for admin
function initializeImportExportPage() {
  const adminSection = document.getElementById('adminDataImportExportSection');
  if (adminSection) {
    // Check if user is admin
    if (window.app?.user?.role === 'admin') {
      adminSection.style.display = 'block';
    } else {
      adminSection.style.display = 'none';
    }
  }
}

// Call on page load and when user logs in
if (document.readyState !== 'loading') {
  initializeImportExportPage();
} else {
  document.addEventListener('DOMContentLoaded', initializeImportExportPage);
}

// ════════════════════════════════════════════════════════════════════════════════
// PATIENTS FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

// Download patient template
function downloadPatientTemplate() {
  const data = [
    {
      'الكود': 'P-001',
      'الاسم': 'أحمد محمد علي',
      'الهاتف': '01012345678',
      'الرقم القومي': '29901011234567',
      'عدد الأفراد': 5,
      'المنطقة': 'A1',
      'الفئة': 'A',
      'العنوان': 'القاهرة - مدينة نصر',
      'ملاحظات': 'ضغط وسكري'
    }
  ];
  
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    { wch: 20 },
    { wch: 20 }
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المرضى');
  XLSX.writeFile(wb, 'قالب استيراد المرضى.xlsx');
}

// Handle patient file selection
let selectedPatientFile = null;

function handlePatientFileSelect(event) {
  selectedPatientFile = event.target.files[0];
  if (selectedPatientFile) {
    toast(`✅ تم تحديد الملف: ${selectedPatientFile.name}`);
  }
}

// Handle patient file drop
function handleDropPatients(event) {
  event.preventDefault();
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    selectedPatientFile = files[0];
    toast(`✅ تم تحديد الملف: ${selectedPatientFile.name}`);
  }
}

// Import patients from Excel
async function importPatients() {
  if (!selectedPatientFile) {
    toast('⚠️ يرجى تحديد ملف أولاً');
    return;
  }

  try {
    showLoading();
    
    const data = await selectedPatientFile.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array', defval: '' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    
    // Get all data including empty cells
    const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '', blankrows: false });

    // Filter out empty rows and prepare data for API
    const patientsToImport = jsonData
      .filter(row => row['الاسم'] || row['الكود']) // Keep only rows with name or code
      .map(row => ({
        id: String(row['الكود'] || `P-${Date.now()}-${Math.random()}`).trim(),
        family_name: String(row['الاسم'] || '').trim(),
        phone: String(row['الهاتف'] || '').trim(),
        national_id: String(row['الرقم القومي'] || '').trim(),
        members_count: parseInt(row['عدد الأفراد']) || 0,
        zone: String(row['المنطقة'] || 'A1').trim(),
        category: String(row['الفئة'] || 'A').trim(),
        address: String(row['العنوان'] || '').trim(),
        notes: String(row['ملاحظات'] || '').trim()
      }));

    // Call API to import
    const response = await fetch('/api/families/import/all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ families: patientsToImport })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    hideLoading();
    toast(`✅ تم استيراد ${result.imported} عائلة بنجاح`);
    selectedPatientFile = null;
    document.getElementById('patientFileInput').value = '';

  } catch (error) {
    hideLoading();
    console.error('Import error:', error);
    toast(`❌ خطأ في الاستيراد: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MEDICINES FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

// Download medicines template
function downloadMedicinesTemplate() {
  const data = [
    {
      'رقم الدواء': 'MED-001',
      'اسم الدواء': 'أملوديبين',
      'الاسم العلمي': 'Amlodipine',
      'السعر': 1.5,
      'الكمية': 100,
      'تاريخ الصلاحية': '2027-12-31',
      'النوع': 'external'
    }
  ];
  
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 }
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الأدوية');
  XLSX.writeFile(wb, 'قالب استيراد الأدوية.xlsx');
}

// Handle medicines file selection
let selectedMedicinesFile = null;

function handleMedicinesFileSelect(event) {
  selectedMedicinesFile = event.target.files[0];
  if (selectedMedicinesFile) {
    toast(`✅ تم تحديد الملف: ${selectedMedicinesFile.name}`);
  }
}

// Handle medicines file drop
function handleDropMedicines(event) {
  event.preventDefault();
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    selectedMedicinesFile = files[0];
    toast(`✅ تم تحديد الملف: ${selectedMedicinesFile.name}`);
  }
}

// Import medicines from Excel
async function importMedicines() {
  if (!selectedMedicinesFile) {
    toast('⚠️ يرجى تحديد ملف أولاً');
    return;
  }

  try {
    showLoading();
    
    const data = await selectedMedicinesFile.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array', defval: '' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    
    // Get all data including empty cells
    const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '', blankrows: false });

    // Filter out empty rows and prepare data for API
    const medicinesToImport = jsonData
      .filter(row => row['اسم الدواء'] || row['رقم الدواء']) // Keep only rows with medicine name or code
      .map(row => ({
        id: String(row['رقم الدواء'] || `MED-${Date.now()}-${Math.random()}`).trim(),
        med_name: String(row['اسم الدواء'] || '').trim(),
        scientific_name: String(row['الاسم العلمي'] || '').trim(),
        unit_price: parseFloat(row['السعر']) || 0,
        stock_quantity: parseInt(row['الكمية']) || 0,
        expiry_date: String(row['تاريخ الصلاحية'] || '').trim(),
        storage_type: String(row['النوع'] || 'external').trim()
      }));

    // Call API to import
    const response = await fetch('/api/medicines/import/all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ medicines: medicinesToImport })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    hideLoading();
    toast(`✅ تم استيراد ${result.imported} دواء بنجاح`);
    selectedMedicinesFile = null;
    document.getElementById('medicinesFileInput').value = '';

  } catch (error) {
    hideLoading();
    console.error('Import error:', error);
    toast(`❌ خطأ في الاستيراد: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORT FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

// Export patients data
async function exportPatientsData() {
  try {
    showLoading();
    
    const response = await fetch('/api/families/export/all', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to export patients');
    }

    const families = await response.json();
    
    // Prepare data for export
    const exportData = families.map(family => ({
      'الكود': family.id,
      'الاسم': family.family_name,
      'الهاتف': family.phone,
      'الرقم القومي': family.national_id,
      'عدد الأفراد': family.members_count,
      'المنطقة': family.zone,
      'الفئة': family.category,
      'العنوان': family.address,
      'ملاحظات': family.notes
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 12 },
      { wch: 10 },
      { wch: 8 },
      { wch: 20 },
      { wch: 20 }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المرضى');
    
    const filename = `تصدير_المرضى_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    hideLoading();
    toast(`✅ تم تصدير ${families.length} عائلة بنجاح`);

  } catch (error) {
    hideLoading();
    console.error('Export error:', error);
    toast(`❌ خطأ في التصدير: ${error.message}`);
  }
}

// Export medicines data
async function exportMedicinesData() {
  try {
    showLoading();
    
    const response = await fetch('/api/medicines/export/all', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to export medicines');
    }

    const medicines = await response.json();
    
    // Prepare data for export
    const exportData = medicines.map(medicine => ({
      'رقم الدواء': medicine.id,
      'اسم الدواء': medicine.med_name,
      'الاسم العلمي': medicine.scientific_name,
      'السعر': medicine.unit_price,
      'الكمية': medicine.stock_quantity,
      'تاريخ الصلاحية': medicine.expiry_date,
      'النوع': medicine.storage_type
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 }
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الأدوية');
    
    const filename = `تصدير_الأدوية_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    hideLoading();
    toast(`✅ تم تصدير ${medicines.length} دواء بنجاح`);

  } catch (error) {
    hideLoading();
    console.error('Export error:', error);
    toast(`❌ خطأ في التصدير: ${error.message}`);
  }
}
