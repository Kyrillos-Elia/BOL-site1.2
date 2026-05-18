/* ════════════════════════════════════════════════════════════════════════════════
 REPORTS PAGE - reports.js
 
 PURPOSE:
 - Display analytics and statistics
 - Monthly reports
 - Zone-based statistics
 - Export functionality
 ════════════════════════════════════════════════════════════════════════════════ */

// Load reports page
async function loadReportsPage() {
  await loadReportsData();
  renderReports();
}

// Load reports data
async function loadReportsData() {
  try {
    const monthlyStats = await getStatsMonthly(app.currentMonth);
    const zoneStats = await getStatsZone(app.selectedZone);
    
    return {
      monthly: monthlyStats.data || {},
      zone: zoneStats.data || {},
    };
  } catch (error) {
    console.error("Error loading reports:", error);
    return { monthly: {}, zone: {} };
  }
}

// Render reports
async function renderReports() {
  const container = document.getElementById("reportsContent");
  if (!container) return;

  const stats = await loadReportsData();

  container.innerHTML = `
    <!-- Monthly Report -->
    <div class="cd" style="margin-bottom: 14px;">
      <div style="
        font-size: 14px;
        font-weight: 700;
        color: var(--txt);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <i class="fas fa-chart-bar" style="color: var(--pri);"></i>
        التقرير الشهري - ${app.currentMonth}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div style="
          background: var(--pri-p);
          padding: 12px;
          border-radius: var(--rs);
          text-align: center;
        ">
          <div style="font-size: 20px; font-weight: 900; color: var(--pri);">
            ${stats.monthly.distribution_count || 0}
          </div>
          <div style="font-size: 10px; color: var(--txt2); margin-top: 4px;">
            توزيعات
          </div>
        </div>
        <div style="
          background: var(--acc-p);
          padding: 12px;
          border-radius: var(--rs);
          text-align: center;
        ">
          <div style="font-size: 20px; font-weight: 900; color: var(--acc);">
            ${formatCurrency(stats.monthly.total_cost || 0)}
          </div>
          <div style="font-size: 10px; color: var(--txt2); margin-top: 4px;">
            إجمالي التكلفة
          </div>
        </div>
      </div>

      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--brd);">
        <div style="font-size: 11px; color: var(--txt2); line-height: 1.6;">
          <div><strong>العائلات المستفيدة:</strong> ${stats.monthly.families_count || 0}</div>
          <div><strong>الأدوية المصروفة:</strong> ${stats.monthly.medicines_count || 0}</div>
          <div><strong>الكمية الإجمالية:</strong> ${stats.monthly.total_quantity || 0}</div>
        </div>
      </div>
    </div>

    <!-- Zone Statistics -->
    <div class="cd" style="margin-bottom: 14px;">
      <div style="
        font-size: 14px;
        font-weight: 700;
        color: var(--txt);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <i class="fas fa-map-marker-alt" style="color: var(--pri);"></i>
        إحصائيات المنطقة ${app.selectedZone}
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div style="
          background: var(--wrn-p);
          padding: 12px;
          border-radius: var(--rs);
          text-align: center;
        ">
          <div style="font-size: 20px; font-weight: 900; color: var(--wrn);">
            ${stats.zone.families_count || 0}
          </div>
          <div style="font-size: 10px; color: var(--txt2); margin-top: 4px;">
            عائلات
          </div>
        </div>
        <div style="
          background: var(--gold-p);
          padding: 12px;
          border-radius: var(--rs);
          text-align: center;
        ">
          <div style="font-size: 20px; font-weight: 900; color: var(--gold);">
            ${stats.zone.members_count || 0}
          </div>
          <div style="font-size: 10px; color: var(--txt2); margin-top: 4px;">
            أفراد
          </div>
        </div>
      </div>

      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--brd);">
        <div style="font-size: 11px; color: var(--txt2); line-height: 1.6;">
          <div><strong>الفئة أ:</strong> ${stats.zone.category_a || 0}</div>
          <div><strong>الفئة ب:</strong> ${stats.zone.category_b || 0}</div>
          <div><strong>الفئة ج:</strong> ${stats.zone.category_c || 0}</div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="cd">
      <div style="
        font-size: 14px;
        font-weight: 700;
        color: var(--txt);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <i class="fas fa-download" style="color: var(--pri);"></i>
        التصدير
      </div>

      <button class="bt bt-g" onclick="exportToExcel()">
        <i class="fas fa-file-excel"></i> تصدير إلى Excel
      </button>
    </div>
  `;
}

// Export to Excel
function exportToExcel() {
  try {
    // Prepare data
    const wsData = [
      ["تقرير نظام إدارة الصيدلية"],
      ["التاريخ", new Date().toLocaleDateString("ar-EG")],
      [],
      ["العائلات"],
      ["رقم العائلة", "اسم رب الأسرة", "المنطقة", "الفئة", "عدد الأفراد"],
      ...app.families.map((f) => [
        f.family_code,
        f.head_name,
        f.zone,
        f.category,
        f.members_count,
      ]),
      [],
      ["الأدوية"],
      ["الاسم", "الاسم العلمي", "الكمية", "السعر", "تاريخ الانتهاء"],
      ...app.medicines.map((m) => [
        m.med_name,
        m.scientific_name,
        m.stock_quantity,
        m.unit_price,
        m.expiry_date,
      ]),
      [],
      ["التوزيعات"],
      ["الأسرة", "الدواء", "خارجية", "داخلية", "التاريخ"],
      ...app.distributions.map((d) => {
        const family = app.families.find((f) => f.id === d.family_id);
        const medicine = app.medicines.find((m) => m.id === d.medicine_id);
        return [
          family?.head_name || "محذوفة",
          medicine?.med_name || "محذوفة",
          d.quantity_external,
          d.quantity_internal,
          new Date(d.issue_date).toLocaleDateString("ar-EG"),
        ];
      }),
    ];

    // Create workbook
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "التقرير");

    // Set column widths
    ws["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];

    // Download
    const filename = `pharmacy-report-${app.currentMonth}.xlsx`;
    XLSX.writeFile(wb, filename);

    toast("✅ تم تصدير التقرير بنجاح", "success");
  } catch (error) {
    console.error("Error exporting:", error);
    toast("خطأ في التصدير", "error");
  }
}
