/* ════════════════════════════════════════════════════════════════════════════════
 FAMILY DETAILS PAGE - family-details.js
 
 PURPOSE:
 - Display complete family information
 - Show monthly medicine distribution
 - Calculate costs
 - Generate and export PDF reports
 ════════════════════════════════════════════════════════════════════════════════ */

// Load family details page
async function loadFamilyDetailsPage() {
  try {
    if (!app.selectedFamilyId) {
      toast("لم يتم تحديد عائلة", "error");
      nav('home');
      return;
    }

    showLoading(true);

    // Get selected family - either from cache or from API
    let family = app.families?.find(f => f.id === app.selectedFamilyId);
    
    if (!family) {
      // Load family directly from API
      const familiesRes = await apiCall('/families', 'GET', null);
      const allFamilies = familiesRes.data || [];
      family = allFamilies.find(f => f.id === app.selectedFamilyId);
      
      if (!family) {
        toast("لم يتم العثور على العائلة", "error");
        hideLoading();
        nav('home');
        return;
      }
    }

    // Get current month in YYYY-MM format
    const now = new Date();
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

    // Load distributions for current month
    const distributionsRes = await getDistributions(currentMonth);
    const allDistributions = distributionsRes.data || [];
    
    // Filter for this family
    const familyDistributions = allDistributions.filter(d => d.family_id === app.selectedFamilyId);

    // Load all medicines
    const medicinesRes = await getMedicines();
    const medicines = medicinesRes.data || [];
    
    // Store in app for global access
    app.medicines = medicines;

    // Load pharmacies
    const pharmaciesRes = await getPharmacies();
    const pharmacies = pharmaciesRes.data || [];

    // Store for later use
    app.familyDetails = {
      family,
      distributions: familyDistributions,
      medicines: medicines,
      pharmacies: pharmacies,
    };

    renderFamilyDetails();
    hideLoading();
  } catch (error) {
    console.error("Error loading family details:", error);
    toast("خطأ في تحميل البيانات: " + error.message, "error");
    hideLoading();
  }
}

// Render family details
function renderFamilyDetails() {
  if (!app.familyDetails) return;

  const { family, distributions } = app.familyDetails;

  // Update header
  const initials = getInitials(family.head_name);
  const bgColor = getColorByName(family.head_name);

  document.getElementById("familyAvatar").style.background = bgColor;
  document.getElementById("familyAvatar").textContent = initials;
  document.getElementById("familyHeaderName").textContent = family.head_name;
  document.getElementById("familyHeaderCode").textContent = `${family.family_code} • ${family.phone || 'بدون هاتف'}`;

  // Update info section - Data tab
  document.getElementById("infoCode").textContent = family.family_code;
  document.getElementById("infoZone").textContent = family.zone;
  document.getElementById("infoMembers").textContent = `${family.members_count} أفراد`;
  document.getElementById("infoCategory").textContent = family.category;
  document.getElementById("infoPhone").textContent = family.phone || 'غير محدد';
  document.getElementById("infoNationalId").textContent = family.national_id || 'غير محدد';
  document.getElementById("infoAddress").textContent = family.address || 'غير محدد';
  document.getElementById("infoNotes").textContent = family.notes || 'لا توجد ملاحظات';

  // Render medicines distributed
  renderFamilyMedicines(distributions);

  // Calculate and display totals
  calculateAndDisplayTotals(distributions);

  // Calculate monthly data
  calculateMonthlyData(distributions);
  
  // Load emergency medicines and pharmacies dropdowns
  loadEmergencyMedicinesDropdown();
  loadEmergencyPharmaciesDropdown();
  
  // Load emergency distributions history
  loadEmergencyDistributionsHistory();
}

// Render medicines distributed to family
function renderFamilyMedicines(distributions) {
  const container = document.getElementById("medicinesContainer");
  if (!container) return;

  if (!distributions || distributions.length === 0) {
    container.innerHTML = `
      <div style="padding: 12px; text-align: center; color: var(--txt2);">
        لا توجد أدوية مصروفة هذا الشهر
      </div>
    `;
    return;
  }

  container.innerHTML = distributions
    .map((dist) => {
      const medicine = app.familyDetails.medicines.find(m => m.id === dist.medicine_id);
      const pharmacy = app.familyDetails.pharmacies?.find(p => p.id === dist.pharmacy_id);
      
      if (!medicine) return '';

      const total = (dist.quantity_external || 0) + (dist.quantity_internal || 0);
      const cost = total * (medicine.unit_price || 0);

      return `
        <div style="
          padding: 12px;
          border-bottom: 1px solid var(--brd);
          background: #fafafa;
          margin-bottom: 8px;
          border-radius: 4px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
              <div style="font-size: 12px; font-weight: 700; color: var(--txt); margin-bottom: 4px;">
                ${medicine.med_name}
              </div>
              <div style="font-size: 10px; color: var(--txt2); margin-bottom: 6px;">
                ${medicine.scientific_name}
              </div>
              <div style="font-size: 9px; color: var(--txt3); margin-bottom: 6px; padding: 6px; background: #fff; border-radius: 3px;">
                <strong>📍 الصيدلية:</strong> ${pharmacy?.pharmacy_name || 'غير محدد'} (${pharmacy?.payment_method || 'كاش'})
              </div>
              <div style="font-size: 10px; color: var(--txt3);">
                <strong>📦 الكمية:</strong> خارجية: <strong>${dist.quantity_external || 0}</strong> | داخلية: <strong>${dist.quantity_internal || 0}</strong>
              </div>
            </div>
            <div style="text-align: left; margin-right: 12px; white-space: nowrap;">
              <div style="font-size: 11px; color: var(--txt2); margin-bottom: 4px;">الإجمالي</div>
              <div style="font-size: 12px; font-weight: 700; color: var(--pri); margin-bottom: 6px;">
                ${total} وحدة
              </div>
              <div style="font-size: 11px; color: var(--acc); font-weight: 600;">
                ${formatCurrency(cost)} ج.م
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

// Calculate and display totals
function calculateAndDisplayTotals(distributions) {
  let totalQuantity = 0;
  let totalCost = 0;

  distributions.forEach(dist => {
    const medicine = app.familyDetails.medicines.find(m => m.id === dist.medicine_id);
    if (medicine) {
      const quantity = (dist.quantity_external || 0) + (dist.quantity_internal || 0);
      totalQuantity += quantity;
      totalCost += quantity * (medicine.unit_price || 0);
    }
  });

  document.getElementById("totalQuantity").textContent = totalQuantity;
  document.getElementById("totalCost").textContent = formatCurrency(totalCost);
}

// Get distribution data for export
function getFamilyDistributionData() {
  if (!app.familyDetails) return null;

  const { family, distributions } = app.familyDetails;
  
  const data = {
    family: family,
    distributions: distributions.map(dist => {
      const medicine = app.familyDetails.medicines.find(m => m.id === dist.medicine_id);
      const pharmacy = app.familyDetails.pharmacies?.find(p => p.id === dist.pharmacy_id);
      const quantity = (dist.quantity_external || 0) + (dist.quantity_internal || 0);
      const cost = quantity * (medicine?.unit_price || 0);

      return {
        medicine: medicine?.med_name || 'دواء محذوف',
        scientific_name: medicine?.scientific_name || '',
        quantity_external: dist.quantity_external || 0,
        quantity_internal: dist.quantity_internal || 0,
        total_quantity: quantity,
        unit_price: medicine?.unit_price || 0,
        total_cost: cost,
        pharmacy_name: pharmacy?.pharmacy_name || 'غير محدد',
        pharmacy_location: pharmacy?.location || '',
        payment_method: pharmacy?.payment_method || 'كاش',
      };
    }),
  };

  // Calculate totals
  data.totals = {
    total_quantity: data.distributions.reduce((sum, d) => sum + d.total_quantity, 0),
    total_cost: data.distributions.reduce((sum, d) => sum + d.total_cost, 0),
  };

  // Group by pharmacy for summary
  const pharmacySummary = {};
  data.distributions.forEach(dist => {
    if (!pharmacySummary[dist.pharmacy_name]) {
      pharmacySummary[dist.pharmacy_name] = {
        pharmacy_name: dist.pharmacy_name,
        payment_method: dist.payment_method,
        total_cost: 0,
        medicines_count: 0
      };
    }
    pharmacySummary[dist.pharmacy_name].total_cost += dist.total_cost;
    pharmacySummary[dist.pharmacy_name].medicines_count += 1;
  });
  
  data.pharmacySummary = Object.values(pharmacySummary);

  return data;
}

// Print family report
async function printFamilyReport() {
  try {
    const data = getFamilyDistributionData();
    if (!data) {
      toast("لم يتم العثور على البيانات", "error");
      return;
    }

    // Open print preview
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير العائلة</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Cairo', Arial, sans-serif;
            background: white;
            padding: 20px;
            color: #333;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #2D6A4F;
            padding-bottom: 15px;
          }
          
          .header h1 {
            color: #2D6A4F;
            font-size: 24px;
            margin-bottom: 10px;
          }
          
          .header p {
            color: #666;
            font-size: 12px;
          }
          
          .family-info {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          
          .info-item {
            padding: 8px;
          }
          
          .info-label {
            font-size: 11px;
            color: #999;
            margin-bottom: 4px;
          }
          
          .info-value {
            font-size: 13px;
            font-weight: 600;
            color: #333;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          th {
            background: #2D6A4F;
            color: white;
            padding: 12px;
            text-align: right;
            font-size: 12px;
            font-weight: 700;
          }
          
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
            font-size: 12px;
          }
          
          tr:hover {
            background: #f9f9f9;
          }
          
          .total-row {
            background: #f0f0f0;
            font-weight: 700;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 11px;
            color: #999;
          }
          
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير توزيع الأدوية</h1>
          <p>الشهر: ${new Date().toLocaleDateString('ar-EG')}</p>
        </div>
        
        <div class="family-info">
          <div class="info-item">
            <div class="info-label">اسم رب الأسرة</div>
            <div class="info-value">${data.family.head_name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">الكود</div>
            <div class="info-value">${data.family.family_code}</div>
          </div>
          <div class="info-item">
            <div class="info-label">المنطقة</div>
            <div class="info-value">${data.family.zone}</div>
          </div>
          <div class="info-item">
            <div class="info-label">عدد الأفراد</div>
            <div class="info-value">${data.family.members_count}</div>
          </div>
          <div class="info-item">
            <div class="info-label">الهاتف</div>
            <div class="info-value">${data.family.phone || 'غير محدد'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">الفئة</div>
            <div class="info-value">${data.family.category}</div>
          </div>
          <div class="info-item" style="grid-column: 1 / -1;">
            <div class="info-label">العنوان</div>
            <div class="info-value">${data.family.address}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>الدواء</th>
              <th>خارجية</th>
              <th>داخلية</th>
              <th>الكمية الإجمالية</th>
              <th>سعر الوحدة</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${data.distributions.map(dist => `
              <tr>
                <td>${dist.medicine}</td>
                <td>${dist.quantity_external}</td>
                <td>${dist.quantity_internal}</td>
                <td>${dist.total_quantity}</td>
                <td>${dist.unit_price.toFixed(2)} ج.م</td>
                <td>${dist.total_cost.toFixed(2)} ج.م</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3"></td>
              <td>${data.totals.total_quantity}</td>
              <td></td>
              <td>${data.totals.total_cost.toFixed(2)} ج.م</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <p>تم إنشاء هذا التقرير بواسطة نظام إدارة الصيدلية - أخوة الرب</p>
          <p>${new Date().toLocaleString('ar-EG')}</p>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center; padding: 20px; background: #f0f0f0; border-radius: 8px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2D6A4F; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
            طباعة
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #ccc; color: #333; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; margin-right: 10px;">
            إغلاق
          </button>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  } catch (error) {
    console.error("Error printing report:", error);
    toast("خطأ في طباعة التقرير", "error");
  }
}

// Export family report as PDF
async function exportFamilyPDF() {
  try {
    const data = getFamilyDistributionData();
    if (!data) {
      toast("لم يتم العثور على البيانات", "error");
      return;
    }

    showLoading(true);

    // Create comprehensive HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            background: #fff;
            padding: 30px;
            color: #333;
            direction: rtl;
            line-height: 1.6;
          }
          
          .logo-section {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #2D6A4F;
          }
          
          .system-name {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }
          
          .report-title {
            font-size: 28px;
            font-weight: bold;
            color: #2D6A4F;
            margin-bottom: 10px;
          }
          
          .report-date {
            font-size: 12px;
            color: #999;
          }
          
          .section {
            margin-bottom: 25px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #fff;
            background: #2D6A4F;
            padding: 10px 15px;
            border-radius: 4px;
            margin-bottom: 15px;
            display: inline-block;
            width: 100%;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            background: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            border-right: 4px solid #2D6A4F;
          }
          
          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          
          .info-item:last-child {
            border-bottom: none;
          }
          
          .info-label {
            font-weight: bold;
            color: #2D6A4F;
            font-size: 12px;
            min-width: 80px;
          }
          
          .info-value {
            color: #333;
            font-size: 12px;
            flex: 1;
            text-align: left;
          }
          
          .full-width {
            grid-column: 1 / -1;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          
          th {
            background: #2D6A4F;
            color: white;
            padding: 12px;
            text-align: right;
            font-size: 11px;
            font-weight: bold;
            border: 1px solid #1e5a3f;
          }
          
          td {
            padding: 10px 12px;
            border: 1px solid #ddd;
            font-size: 11px;
            text-align: right;
          }
          
          tr:nth-child(even) td {
            background: #f9f9f9;
          }
          
          tr:hover td {
            background: #f0f5f2;
          }
          
          .total-row td {
            background: #e8f5e9 !important;
            font-weight: bold;
            border-top: 2px solid #2D6A4F;
          }
          
          .summary-box {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .summary-item {
            background: #ffffff;
            border: 1px solid #d8e7dd;
            padding: 12px;
            border-radius: 4px;
            border-right: 3px solid #2D6A4F;
            text-align: center;
            flex: 1 1 180px;
            min-height: 72px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .summary-label {
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
          }
          
          .summary-value {
            font-size: 16px;
            font-weight: bold;
            color: #2D6A4F;
          }

          .pharmacy-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 15px;
          }

          .pharmacy-card {
            background: #f9f9f9;
            border: 1px solid #ddd;
            border-right: 3px solid #2D6A4F;
            border-radius: 4px;
            padding: 10px 12px;
          }

          .pharmacy-card h4 {
            font-size: 12px;
            color: #2D6A4F;
            margin-bottom: 6px;
          }

          .pharmacy-card p {
            font-size: 11px;
            color: #333;
            margin: 2px 0;
          }
          
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #ddd;
            text-align: center;
            font-size: 10px;
            color: #999;
          }
          
          .divider {
            height: 1px;
            background: #ddd;
            margin: 20px 0;
          }
          
          .empty-message {
            background: #fff3cd;
            padding: 12px;
            border-right: 3px solid #ffc107;
            color: #856404;
            font-size: 11px;
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <!-- HEADER -->
        <div class="logo-section">
          <div class="system-name">نظام إدارة الصيدلية - أخوة الرب</div>
          <div class="report-title">تقرير توزيع الأدوية الشهري</div>
          <div class="report-date">الشهر: ${new Date().toLocaleDateString('ar-EG')} | ${new Date().toLocaleTimeString('ar-EG')}</div>
        </div>
        
        <!-- FAMILY INFORMATION SECTION -->
        <div class="section">
          <div class="section-title">📋 بيانات العائلة</div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">رب الأسرة:</span>
              <span class="info-value">${data.family.head_name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الكود:</span>
              <span class="info-value">${data.family.family_code}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الرقم القومي:</span>
              <span class="info-value">${data.family.national_id || 'غير محدد'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">المنطقة:</span>
              <span class="info-value">${data.family.zone}</span>
            </div>
            <div class="info-item">
              <span class="info-label">عدد الأفراد:</span>
              <span class="info-value">${data.family.members_count}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الفئة:</span>
              <span class="info-value">الفئة ${data.family.category}</span>
            </div>
            <div class="info-item">
              <span class="info-label">الهاتف:</span>
              <span class="info-value">${data.family.phone || 'غير محدد'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">تاريخ التسجيل:</span>
              <span class="info-value">${new Date(data.family.created_at).toLocaleDateString('ar-EG')}</span>
            </div>
            <div class="info-item full-width">
              <span class="info-label">العنوان:</span>
              <span class="info-value">${data.family.address}</span>
            </div>
            ${data.family.notes ? `
            <div class="info-item full-width">
              <span class="info-label">ملاحظات:</span>
              <span class="info-value">${data.family.notes}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="divider"></div>
        
        <!-- MEDICINES SECTION -->
        <div class="section">
          <div class="section-title">💊 الأدوية المصروفة هذا الشهر</div>
          
          ${data.distributions.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>الدواء</th>
                <th>الاسم العلمي</th>
                <th>خارجية</th>
                <th>داخلية</th>
                <th>الكمية الإجمالية</th>
                <th>سعر الوحدة</th>
                <th>التكلفة الإجمالية</th>
                <th>الصيدلية</th>
                <th>طريقة الدفع</th>
              </tr>
            </thead>
            <tbody>
              ${data.distributions.map(dist => `
                <tr>
                  <td>${dist.medicine}</td>
                  <td>${dist.scientific_name || '-'}</td>
                  <td>${dist.quantity_external}</td>
                  <td>${dist.quantity_internal}</td>
                  <td><strong>${dist.total_quantity}</strong></td>
                  <td>${dist.unit_price.toFixed(2)} ج.م</td>
                  <td><strong>${dist.total_cost.toFixed(2)} ج.م</strong></td>
                  <td>${dist.pharmacy_name}</td>
                  <td>${dist.payment_method}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">الإجمالي</td>
                <td><strong>${data.totals.total_quantity}</strong></td>
                <td></td>
                <td><strong>${data.totals.total_cost.toFixed(2)} ج.م</strong></td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
          ` : `
          <div class="empty-message">⚠️ لا توجد أدوية مصروفة لهذه العائلة خلال هذا الشهر</div>
          `}
        </div>
        
        <!-- SUMMARY SECTION -->
        <div class="section summary-section">
          <div class="section-title">📊 ملخص الصرف الشهري</div>
          <div class="summary-box">
            <div class="summary-item">
              <div class="summary-label">عدد الأدوية</div>
              <div class="summary-value">${data.distributions.length}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">إجمالي الكمية (وحدة)</div>
              <div class="summary-value">${data.totals.total_quantity}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">إجمالي التكلفة</div>
              <div class="summary-value">${data.totals.total_cost.toFixed(2)} ج.م</div>
            </div>
          </div>
        </div>

        <!-- PHARMACY SUMMARY -->
        <div class="section">
          <div class="section-title">🏥 ملخص حسب الصيدلية</div>
          ${data.pharmacySummary.length > 0 ? `
            <div class="pharmacy-grid">
              ${data.pharmacySummary.map(pharmacy => `
                <div class="pharmacy-card">
                  <h4>${pharmacy.pharmacy_name}</h4>
                  <p>طريقة الدفع: <strong>${pharmacy.payment_method}</strong></p>
                  <p>عدد الأصناف: <strong>${pharmacy.medicines_count}</strong></p>
                  <p>إجمالي التكلفة: <strong>${pharmacy.total_cost.toFixed(2)} ج.م</strong></p>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-message">لا توجد صيدليات مرتبطة بهذا الشهر</div>
          `}
        </div>
        
        <!-- FOOTER -->
        <div class="footer">
          <div style="margin-bottom: 10px;">
            <strong>نظام إدارة الصيدلية - أخوة الرب</strong><br>
            <small>تقرير توزيع أدوية رسمي - محفوظ بتاريخ: ${new Date().toLocaleString('ar-EG')}</small>
          </div>
          <div style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
            <small>هذا التقرير يحتوي على معلومات سرية وخاصة. يرجى الاحتفاظ به بسرية.</small>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create element to hold HTML
    const element = document.createElement('div');
    element.innerHTML = htmlContent;

    // PDF options
    const options = {
      margin: 8,
      filename: `تقرير_${data.family.family_code}_${app.currentMonth}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    // Generate PDF from the body element
    const element2 = element.querySelector('body') || element;
    await html2pdf().set(options).from(element2).save();

    toast("✅ تم حفظ التقرير بنجاح", "success");
    hideLoading(true);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    toast("خطأ في إنشاء PDF: " + error.message, "error");
    hideLoading(false);
  }
}
