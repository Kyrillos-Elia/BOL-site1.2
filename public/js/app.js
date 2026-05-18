/* ════════════════════════════════════════════════════════════════════════════════
 APPLICATION STATE & UTILITIES - app.js
 
 PURPOSE:
 - Manage global application state
 - Provide common utility functions
 - Handle page navigation
 - Manage notifications and loading states
 ════════════════════════════════════════════════════════════════════════════════ */

/**
 * Fix nested tabs structure (browser parsing issue with HTML)
 * Some browsers nest tab elements incorrectly, this ensures they're siblings
 * IMPORTANT: This only fixes the nesting of tabs, not moving contents within tabs
 */
function fixTabsStructure() {
  const tabData = document.getElementById('tab-data');
  if (tabData) {
    // Find all family-tab-content divs that are direct children of tab-data
    // (These are tabs that should be siblings)
    const tabsToMove = [];
    for (let child of tabData.children) {
      if (child.classList.contains('family-tab-content') && child.id !== 'tab-data') {
        tabsToMove.push(child);
      }
    }
    
    // Move them to be siblings of tab-data (outside of tab-data)
    for (const tab of tabsToMove) {
      tabData.after(tab);
    }
  }
}

// Run this fix immediately when the script loads
if (document.readyState !== 'loading') {
  fixTabsStructure();
} else {
  document.addEventListener('DOMContentLoaded', fixTabsStructure);
}

/**
 * Application State
 *
 * Contains:
 * - Current user
 * - Cached data (families, medicines, distributions)
 * - UI state (current page, selected items)
 * - Temporary form data
 */
window.app = {
  user: null,
  families: [],
  medicines: [],
  pharmacies: [],
  distributions: [],
  stats: {},
  currentPage: "home",
  selectedZone: "A1",
  currentMonth: new Date().toISOString().slice(0, 7),
  isLoading: false,
  selectedFamilyId: null,
  familyDetails: null,
};

/**
 * UTILITY FUNCTIONS
 */

// Format numbers as Arabic currency
function formatCurrency(value) {
  return Number(value || 0).toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Get avatar color based on name hash
function getColorByName(name) {
  const colors = [
    "#2D6A4F",
    "#E76F51",
    "#264653",
    "#E9C46A",
    "#F4A261",
    "#6D6875",
    "#B5838D",
    "#457B9D",
    "#BC6C25",
    "#606C38",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name) {
  const words = name.trim().split(/\s+/);
  return words.length >= 2
    ? words[0][0] + words[1][0]
    : words[0].substring(0, 2);
}

// Show toast notification
function toast(message, type = "success") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.style.background = type === "error" ? "var(--err)" : "var(--pri)";
  el.style.color = "#fff";
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

// Debounce function for search
let debounceTimer;
function debounce(func, wait) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(func, wait);
}

// Show loading indicator
function showLoading(show = true) {
  const ind = document.getElementById("saveInd");
  if (!ind) return;

  if (show) {
    ind.className = "saving";
    ind.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }
}

// Hide loading indicator
function hideLoading(success = true) {
  const ind = document.getElementById("saveInd");
  if (!ind) return;

  ind.className = success ? "ok" : "err";
  ind.innerHTML = success
    ? '<i class="fas fa-check-circle"></i>'
    : '<i class="fas fa-exclamation-circle"></i>';
}

/**
 * NAVIGATION FUNCTIONS
 */

// Check if user has access to a page based on their role
function hasPageAccess(page) {
  if (!app.user) return false;
  
  // Define which pages each role can access
  const adminPages = ["home", "families", "medicines", "distributions", "reports", "family-details", "settings", "import-export"];
  const staffPages = ["home", "families", "medicines", "distributions", "family-details"];
  
  const allowedPages = app.user.role === "Admin" ? adminPages : staffPages;
  return allowedPages.includes(page);
}

// Update navigation visibility based on user role
function updateNavigationByRole() {
  const navItems = document.querySelectorAll(".ni");
  
  navItems.forEach((item) => {
    const onclick = item.getAttribute("onclick");
    let page = null;
    
    // Extract page name from onclick attribute
    if (onclick && onclick.includes("nav('")) {
      page = onclick.match(/nav\('([^']+)'\)/)?.[1];
    }
    
    // Hide navigation items based on role
    if (page) {
      if (hasPageAccess(page)) {
        item.style.display = "flex";
      } else {
        item.style.display = "none";
      }
    }
  });
}

// Navigate to a page
function nav(page) {
  // Check page access
  if (!hasPageAccess(page)) {
    toast("ليس لديك صلاحية الوصول لهذه الصفحة", "error");
    return;
  }
  
  // Hide all pages
  document.querySelectorAll(".pg").forEach((el) => el.classList.remove("act"));

  // Show target page
  const pageEl = document.getElementById(`pg-${page}`);
  if (pageEl) {
    pageEl.classList.add("act");
  }

  // Update navigation items
  document.querySelectorAll(".ni").forEach((el) => el.classList.remove("act"));
  const navBtn = Array.from(document.querySelectorAll(".ni")).find(
    (btn) => btn.getAttribute("onclick")?.includes(`'${page}'`)
  );
  if (navBtn) navBtn.classList.add("act");

  // Update current page
  app.currentPage = page;

  // Update header
  updateHeader(page);

  // Load page data
  loadPageData(page);
}

// Update header based on current page
function updateHeader(page) {
  const HTitle = document.getElementById("HTitle");
  const HBack = document.getElementById("HBack");
  const HAct = document.getElementById("HAct");

  const titles = {
    home: "نظام إدارة الصيدلية",
    families: "إدارة العائلات",
    medicines: "إدارة الأدوية",
    distributions: "تسجيل الصرف",
    reports: "التقارير والإحصائيات",
    "family-details": "تفاصيل العائلة",
    settings: "الإعدادات",
    "import-export": "استيراد وتصدير البيانات",
  };

  HTitle.textContent = titles[page] || "نظام إدارة الصيدلية";
  HBack.style.display = page === "family-details" ? "flex" : "none";
  HAct.style.display = "none";
}

// Load data for specific page
async function loadPageData(page) {
  try {
    switch (page) {
      case "home":
        await loadHomeData();
        break;
      case "families":
        await loadFamiliesPage();
        break;
      case "medicines":
        await loadMedicinesPage();
        break;
      case "distributions":
        await loadDistributionsPage();
        break;
      case "reports":
        await loadReportsPage();
        break;
      case "family-details":
        await loadFamilyDetailsPage();
        break;
      case "settings":
        await loadSettingsPage();
        break;
      case "import-export":
        // Initialize import/export page
        initializeImportExportPage();
        break;
    }
  } catch (error) {
    console.error(`Error loading ${page}:`, error);
  }
}

/**
 * INITIALIZATION
 */

// Initialize app on page load
async function initApp() {
  console.log("🚀 Initializing pharmacy management system...");
  console.log("👤 User:", app.user?.username, "Role:", app.user?.role);

  try {
    // Update navigation based on user role
    updateNavigationByRole();
    
    // Load initial data
    await Promise.all([
      loadFamiliesForHome(),
      loadMedicines(),
      loadDistributions(),
      loadStats(),
    ]);

    console.log("✅ App initialized successfully");

    // Setup event listeners
    setupEventListeners();
  } catch (error) {
    console.error("❌ Initialization error:", error);
    toast("خطأ في تحميل البيانات", "error");
  }
}

// Setup global event listeners
function setupEventListeners() {
  // Search input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(() => loadFamiliesForHome(), 300)
    );
  }
}

// Go back to home
function goBack() {
  nav("home");
}

// Header action (menu)
function headerAction() {
  console.log("Header action clicked");
  // TODO: Implement header menu
}
