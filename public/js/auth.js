/* ════════════════════════════════════════════════════════════════════════════════
 AUTHENTICATION - auth.js
 
 PURPOSE:
 - Handle user login/signup
 - Manage authentication state
 - Track user role (admin/staff)
 ════════════════════════════════════════════════════════════════════════════════ */

// Login function
async function handleLogin() {
  try {
    showLoading(true);

    const username = document.getElementById("loginUsername")?.value?.trim() || "";
    const password = document.getElementById("loginPassword")?.value?.trim() || "";

    if (!username || !password) {
      throw new Error("اسم المستخدم وكلمة السر إجباريين");
    }

    // Call login API
    const response = await apiCall("/auth/login", "POST", {
      username,
      password
    });

    const user = response.data;

    // Store user data
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", user.token);
    app.user = user;

    toast(`👋 مرحباً ${user.username}`, "success");

    // Redirect to home
    setTimeout(() => {
      showLoginPage(false);
      updateNavigationByRole();
      nav("home");
    }, 500);
  } catch (error) {
    console.error("Login error:", error);
    toast(error.message || "خطأ في تسجيل الدخول", "error");
    hideLoading(false);
  }
}

// Signup function
async function handleSignup() {
  try {
    showLoading(true);

    const name = document.getElementById("signupName")?.value?.trim() || "";
    const username = document.getElementById("signupUsername")?.value?.trim() || "";
    const password = document.getElementById("signupPassword")?.value?.trim() || "";
    const confirmPassword = document.getElementById("signupConfirmPassword")?.value?.trim() || "";

    // Validation
    if (!name || name.length < 3) {
      throw new Error("الاسم يجب أن يكون 3 أحرف على الأقل");
    }

    if (!username || username.length < 3) {
      throw new Error("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
    }

    if (!password || password.length < 6) {
      throw new Error("كلمة السر يجب أن تكون 6 أحرف على الأقل");
    }

    if (password !== confirmPassword) {
      throw new Error("كلمات السر غير متطابقة");
    }

    // Call signup API
    const response = await apiCall("/auth/signup", "POST", {
      name,
      username,
      password
    });

    const user = response.data;

    // Store user data
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", user.token);
    app.user = user;

    toast(`🎉 مرحباً ${user.username}! تم إنشاء الحساب بنجاح`, "success");

    // Redirect to home
    setTimeout(() => {
      showLoginPage(false);
      updateNavigationByRole();
      nav("home");
    }, 500);
  } catch (error) {
    console.error("Signup error:", error);
    toast(error.message || "خطأ في إنشاء الحساب", "error");
    hideLoading(false);
  }
}

// Logout function
function handleLogout() {
  if (confirm("هل تريد تسجيل الخروج؟")) {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    app.user = null;
    showLoginPage(true);
    toast("👋 تم تسجيل الخروج بنجاح", "success");
  }
}

// Check if user is authenticated
function isAuthenticated() {
  return app.user && localStorage.getItem("token");
}

// Show/Hide login page
function showLoginPage(show = true) {
  const loginPage = document.getElementById("pg-login");
  const mainContent = document.querySelector(".mc");

  if (show) {
    if (loginPage) loginPage.style.display = "block";
    if (mainContent) mainContent.style.display = "none";
    document.querySelector(".bn").style.display = "none";
    document.querySelector(".hdr").style.display = "none";
  } else {
    if (loginPage) loginPage.style.display = "none";
    if (mainContent) mainContent.style.display = "block";
    document.querySelector(".bn").style.display = "flex";
    document.querySelector(".hdr").style.display = "flex";
  }
}

// Toggle between login and signup
function toggleAuthMode() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  if (loginForm?.style.display !== "none") {
    // Show signup
    loginForm.style.display = "none";
    signupForm.style.display = "block";
    document.getElementById("authModeText").textContent = "لديك حساب؟ سجل دخول";
  } else {
    // Show login
    loginForm.style.display = "block";
    signupForm.style.display = "none";
    document.getElementById("authModeText").textContent = "ليس لديك حساب؟ أنشئ حساب";
  }
}

// Initialize auth
async function initAuth() {
  // Check if user is already logged in
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      app.user = JSON.parse(storedUser);
      showLoginPage(false);
      initApp();
    } catch (error) {
      console.error("Error restoring user:", error);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      showLoginPage(true);
    }
  } else {
    showLoginPage(true);
  }
}

/**
 * INITIALIZATION ON PAGE LOAD
 * Trigger authentication check when the page loads
 */
window.addEventListener("load", initAuth);
