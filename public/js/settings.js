/* ════════════════════════════════════════════════════════════════════════════════
 SETTINGS PAGE - settings.js
 
 PURPOSE:
 - Application settings and configuration
 - Database status
 - API connection information
 ════════════════════════════════════════════════════════════════════════════════ */

// Load settings page
async function loadSettingsPage() {
  // Check if user is admin and show import/export section
  const userRole = window.app?.user?.role || '';
  if (userRole.toLowerCase() === 'admin') {
    const adminSection = document.getElementById('adminDataImportExportSection');
    if (adminSection) {
      adminSection.style.display = 'block';
    }
  }
  
  console.log("Settings page loaded", "User role:", userRole);
}
