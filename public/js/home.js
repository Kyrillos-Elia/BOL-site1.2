/* ════════════════════════════════════════════════════════════════════════════════
 HOME PAGE - home.js
 
 PURPOSE:
 - Dashboard with statistics
 - Family listing by zone
 - Search functionality
 ════════════════════════════════════════════════════════════════════════════════ */

// Load families for home page
async function loadFamiliesForHome() {
  try {
    const searchQuery = document.getElementById("searchInput")?.value?.trim().toLowerCase() || "";
    // جلب جميع العائلات من المنطقة المختارة
    const allFamilies = await getFamilies(app.selectedZone, null);
    
    // تطبيق البحث محلياً - البحث عن الاسم أو الكود أو الهاتف
    app.families = (allFamilies.data || []).filter(f => {
      if (!searchQuery) return true;
      
      return (
        f.head_name.toLowerCase().includes(searchQuery) ||
        f.family_code.toLowerCase().includes(searchQuery) ||
        (f.phone && f.phone.includes(searchQuery)) ||
        (f.national_id && f.national_id.includes(searchQuery))
      );
    });
    
    renderFamilies();
  } catch (error) {
    console.error("Error loading families:", error);
    app.families = [];
    renderFamilies();
  }
}

// Render families list
function renderFamilies() {
  const container = document.getElementById("familiesList");
  if (!container) return;

  if (!app.families || app.families.length === 0) {
    container.innerHTML = `
      <div class="et">
        <div class="et-i"><i class="fas fa-users"></i></div>
        <div class="et-t">لا توجد عائلات في هذه المنطقة</div>
      </div>
    `;
    return;
  }

  container.innerHTML = app.families
    .map((family) => {
      const initials = getInitials(family.head_name);
      const bgColor = getColorByName(family.head_name);

      return `
        <div class="cd" style="display: flex; gap: 12px; align-items: center;">
          <div style="
            width: 45px;
            height: 45px;
            border-radius: 12px;
            background: ${bgColor};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 16px;
            flex-shrink: 0;
          ">
            ${initials}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="
              font-size: 13px;
              font-weight: 700;
              color: var(--txt);
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 6px;
            ">
              ${family.head_name}
              <span style="
                background: var(--pri-p);
                color: var(--pri);
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 10px;
                font-weight: 700;
              ">${family.family_code}</span>
            </div>
            <div style="
              font-size: 11px;
              color: var(--txt2);
              display: flex;
              gap: 8px;
              align-items: center;
            ">
              <span><i class="fas fa-map-marker-alt"></i> منطقة ${family.zone}</span>
              <span><i class="fas fa-users"></i> ${family.members_count} أفراد</span>
            </div>
            <div style="
              font-size: 10px;
              color: var(--txt3);
              margin-top: 3px;
            ">
              الفئة: <strong>${family.category}</strong>
            </div>
          </div>
          <button 
            class="ib" 
            onclick="openFamilyDetails('${family.id}')"
            style="background: var(--pri); color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer;"
            title="عرض التفاصيل"
          >
            <i class="fas fa-arrow-left"></i>
          </button>
        </div>
      `;
    })
    .join("");
}

// Open family details modal
async function openFamilyDetails(familyId) {
  try {
    const family = app.families.find(f => f.id === familyId);
    if (!family) {
      toast("لم يتم العثور على العائلة", "error");
      return;
    }

    app.selectedFamilyId = familyId;
    nav('family-details');
    await loadFamilyDetailsPage();
  } catch (error) {
    console.error("Error opening family details:", error);
    toast("خطأ في تحميل البيانات", "error");
  }
}

// Render zone chips
function renderZoneChips() {
  const container = document.getElementById("zoneChips");
  if (!container) return;

  const zones = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"];

  container.innerHTML = zones
    .map(
      (zone) => `
    <button class="zchip ${app.selectedZone === zone ? "act" : ""}" onclick="selectZone('${zone}')">
      ${zone}
    </button>
  `
    )
    .join("");
}

// Select zone
function selectZone(zone) {
  app.selectedZone = zone;
  renderZoneChips();
  loadFamiliesForHome();
}

// Load statistics
async function loadStats() {
  try {
    const stats = await getStats();
    app.stats = stats.data || {};
    updateStats();
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// Update statistics display
function updateStats() {
  const container = document.getElementById("statsRow");
  if (!container) return;

  const stats = app.stats || {};
  const totalFamilies = stats.total_families || 0;
  const totalMembers =
    app.families?.reduce((sum, f) => sum + (f.members_count || 0), 0) || 0;
  const lowStockMedicines = stats.low_stock_medicines || 0;
  const costThisMonth = stats.cost_this_month || 0;

  container.innerHTML = `
    <div class="sc">
      <div class="si" style="background: var(--pri-p); color: var(--pri);">
        <i class="fas fa-users"></i>
      </div>
      <div class="sn">${totalFamilies}</div>
      <div class="sl">عائلات مسجلة</div>
    </div>
    <div class="sc">
      <div class="si" style="background: var(--acc-p); color: var(--acc);">
        <i class="fas fa-user-group"></i>
      </div>
      <div class="sn">${totalMembers}</div>
      <div class="sl">عدد الأفراد</div>
    </div>
    <div class="sc">
      <div class="si" style="background: var(--wrn-p); color: var(--wrn);">
        <i class="fas fa-pills"></i>
      </div>
      <div class="sn">${lowStockMedicines}</div>
      <div class="sl">أدوية قليلة</div>
    </div>
    <div class="sc">
      <div class="si" style="background: var(--gold-p); color: var(--gold);">
        <i class="fas fa-money-bill"></i>
      </div>
      <div class="sn">${formatCurrency(costThisMonth)}</div>
      <div class="sl">التكلفة هذا الشهر</div>
    </div>
  `;
}

// Load home data
async function loadHomeData() {
  renderZoneChips();
  await loadFamiliesForHome();
  await loadStats();
}
