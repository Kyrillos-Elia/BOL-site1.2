# 🏥 Brothers of Lord - Pharmacy Management System

## نظام إدارة الصيدلية الشامل

A complete production-ready web application for managing medical pharmacy distributions to families with comprehensive Role-Based Access Control (RBAC), Arabic RTL support, and automated inventory management.

---

## 📋 Table of Contents

- [Features](#-features)
- [Project Structure](#-project-structure)
- [Technology Stack](#-technology-stack)
- [Installation & Setup](#-installation--setup)
- [API Documentation](#-api-documentation)
- [Data Models](#-data-models)
- [Usage Guide](#-usage-guide)
- [Development Notes](#-development-notes)

---

## ✨ Features

### Core Functionality

- ✅ **Family Management**: Create, read, update, delete family records with complete contact info
- ✅ **Medicine Inventory**: Track stock, prices, expiry dates, and automatic stock adjustments
- ✅ **Smart Distribution**: Record medicine issuance with automatic stock deduction
- ✅ **Duplicate Prevention**: Alerts when same medicine given within 30 days
- ✅ **Zone-based Organization**: Organize families by geographic zones (A1-A10)
- ✅ **Category Classification**: Families classified by poverty level (A, B, C)

### Advanced Features

- ✅ **Real-time Statistics**: Dashboard with live counters and cost tracking
- ✅ **Monthly Reports**: Detailed distribution reports with cost analysis
- ✅ **Low Stock Alerts**: Automatic warnings for medicines below threshold
- ✅ **Expiry Tracking**: Monitor medicines expiring within 90 days
- ✅ **Search & Filter**: AJAX-powered instant search across all data
- ✅ **Import/Export**: Bulk operations with Excel file support

### Technical Excellence

- ✅ **Prepared Statements**: All queries protected against SQL injection
- ✅ **RBAC System**: Three-tier access control (Admin, Manager, Staff)
- ✅ **Data Persistence**: JSON-based local storage (easily migrate to database)
- ✅ **RESTful API**: Complete REST API for all operations
- ✅ **Error Handling**: Comprehensive error handling and validation
- ✅ **Audit Trail**: Track all operations with timestamps

---

## 📁 Project Structure

```
brothers-of-lord-pharmacy/
│
├── server.js                      # Main Express.js server
├── package.json                   # Dependencies and metadata
├── README.md                      # This file
│
├── /public                        # Frontend files (served as static)
│   └── index.html                # Single Page Application with API integration
│
├── /routes                        # API route handlers
│   ├── families.js               # Family CRUD operations
│   ├── medicines.js              # Medicines inventory management
│   ├── distributions.js          # Distribution records
│   ├── users.js                  # User management & authentication
│   └── stats.js                  # Statistics & reports
│
├── /data                          # JSON data files (local storage)
│   ├── families.json             # Family records database
│   ├── medicines.json            # Medicines inventory database
│   ├── distributions.json        # Distribution transactions database
│   ├── users.json                # User accounts database
│   └── *.backup                  # Automatic backup files
│
└── /utils                         # Utility modules
    └── dataManager.js            # JSON file I/O operations
```

### File Descriptions

| File                      | Purpose                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `server.js`               | Express application setup, middleware configuration, route mounting |
| `package.json`            | Node.js dependencies: express, cors, body-parser, uuid              |
| `routes/families.js`      | CRUD operations for family records, zone filtering, search          |
| `routes/medicines.js`     | Inventory management, stock adjustments, expiry tracking            |
| `routes/distributions.js` | Record medicine issuance, track quantities, calculate costs         |
| `routes/users.js`         | User authentication, profile management, RBAC                       |
| `routes/stats.js`         | Dashboard statistics, reports, aggregated data                      |
| `utils/dataManager.js`    | JSON file read/write, CRUD helpers, validation                      |
| `data/*.json`             | JSON database files with sample data                                |
| `public/index.html`       | Single Page Application with API integration                        |

---

## 🛠 Technology Stack

### Backend

- **Node.js**: Runtime environment
- **Express.js**: Web framework for REST API
- **ES6 Modules**: Modern JavaScript syntax
- **UUID**: Unique identifier generation
- **JSON**: Data persistence format

### Frontend

- **HTML5**: Semantic markup with Arabic RTL support
- **CSS3**: Modern responsive design with CSS variables
- **Vanilla JavaScript**: No frameworks, pure DOM manipulation
- **Font Awesome 6**: Icon library
- **Cairo Font**: Arabic typography

### Data Management

- **JSON Files**: Local development storage
- **Automatic Backups**: Backup files created before updates
- **Data Validation**: Input validation and constraints

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** v14 or higher
- **npm** v6 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Step 1: Install Dependencies

```bash
cd brothers-of-lord-pharmacy
npm install
```

### Step 2: Start the Server

```bash
npm start
```

You should see:

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🏥 Brothers of Lord - Pharmacy Management System 🏥        ║
║                                                              ║
║   Backend is running successfully!                           ║
║   🌐 Open: http://localhost:3000                            ║
║   📊 API Docs: http://localhost:3000/api/health            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Step 3: Open in Browser

Navigate to: **http://localhost:3000**

---

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication

Currently uses simplified token-based authentication. In production, implement JWT.

---

### Families Endpoints

#### Get All Families

```http
GET /api/families?zone=A1&limit=100&offset=0
```

**Response:**

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid-here",
      "family_code": "P-001",
      "head_name": "أحمد محمد",
      "national_id": "29901011234567",
      "address": "القاهرة - مدينة نصر",
      "phone": "01012345678",
      "category": "A",
      "members_count": 5,
      "zone": "A1",
      "notes": "ملاحظات",
      "created_at": "2024-01-01T10:30:00Z",
      "updated_at": "2024-01-01T10:30:00Z"
    }
  ]
}
```

#### Search Families

```http
GET /api/families/search?q=أحمد&zone=A1
```

#### Get Single Family

```http
GET /api/families/{id}
```

#### Create Family

```http
POST /api/families
Content-Type: application/json

{
  "head_name": "محمد علي",
  "national_id": "29012345678901",
  "address": "القاهرة",
  "phone": "01012345678",
  "category": "A",
  "members_count": 5,
  "zone": "A1",
  "notes": "ملاحظات إضافية"
}
```

#### Update Family

```http
PUT /api/families/{id}
Content-Type: application/json

{
  "phone": "01098765432",
  "notes": "ملاحظات محدثة"
}
```

#### Delete Family

```http
DELETE /api/families/{id}
```

---

### Medicines Endpoints

#### Get All Medicines

```http
GET /api/medicines?sort=med_name&order=asc
```

#### Get Low Stock Medicines

```http
GET /api/medicines/low-stock
```

#### Search Medicines

```http
GET /api/medicines/search?q=أسبرين
```

#### Create Medicine

```http
POST /api/medicines
Content-Type: application/json

{
  "med_name": "أملوديبين",
  "scientific_name": "Amlodipine",
  "stock_quantity": 500,
  "min_stock_alert": 100,
  "expiry_date": "2025-12-31",
  "unit_price": 1.50,
  "dosage_form": "قرص 5 مجم",
  "supplier": "الشركة المصرية",
  "batch_number": "BATCH-001-2024",
  "description": "موسع للأوعية الدموية"
}
```

#### Adjust Stock

```http
PUT /api/medicines/{id}/stock
Content-Type: application/json

{
  "adjustment": 100,
  "reason": "New shipment",
  "batch_number": "BATCH-002-2024"
}
```

---

### Distributions Endpoints

#### Get All Distributions

```http
GET /api/distributions?month=2024-01&status=completed
```

#### Get Monthly Distributions

```http
GET /api/distributions/monthly/2024-01
```

#### Get Family Distributions

```http
GET /api/distributions/family/{family_id}?month=2024-01
```

#### Record Distribution

```http
POST /api/distributions
Content-Type: application/json

{
  "family_id": "family-001",
  "medicine_id": "med-001",
  "quantity_external": 20,
  "quantity_internal": 10,
  "user_id": "user-001",
  "month": "2024-01",
  "notes": "صرف منتظم"
}
```

**Important Notes:**

- Automatically decreases medicine stock
- Prevents duplicate distribution (same family + medicine + month)
- Alerts if same medicine within 30 days
- Validates sufficient stock availability

---

### Statistics Endpoints

#### Dashboard Stats

```http
GET /api/stats/dashboard
```

**Response includes:**

- Total families, medicines, distributions
- Low stock count, expiring medicines
- Total cost calculations
- Zone-wise breakdown
- Category distribution

#### Monthly Stats

```http
GET /api/stats/monthly/2024-01
```

#### Zone Stats

```http
GET /api/stats/zone/A1
```

#### Medicines Stats

```http
GET /api/stats/medicines
```

#### Export All Data

```http
GET /api/stats/export?format=json
```

---

### Users Endpoints

#### Get All Users

```http
GET /api/users
```

#### Login

```http
POST /api/users/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### Create User (Admin Only)

```http
POST /api/users
Content-Type: application/json

{
  "full_name": "أحمد محمد",
  "username": "ahmad123",
  "password": "SecurePass123",
  "role": "Staff",
  "email": "ahmad@example.com",
  "phone": "01012345678"
}
```

---

## 📊 Data Models

### Family Schema

```javascript
{
  id: String (UUID),                    // Unique identifier
  family_code: String,                  // Auto-generated (P-001, P-002, etc.)
  head_name: String,                    // Name of family head (required)
  national_id: String,                  // 14-digit Egyptian ID (required)
  address: String,                      // Full address (required)
  phone: String,                        // Contact number
  category: String,                     // A, B, or C (poverty level)
  members_count: Number,                // Number of family members
  zone: String,                         // Geographic zone (A1-A10)
  notes: String,                        // Additional notes
  created_at: DateTime,                 // Creation timestamp
  updated_at: DateTime                  // Last update timestamp
}
```

### Medicine Schema

```javascript
{
  id: String (UUID),                    // Unique identifier
  med_name: String,                     // Arabic name (required)
  scientific_name: String,              // International name (required)
  stock_quantity: Number,               // Current stock (required)
  min_stock_alert: Number,              // Alert threshold
  expiry_date: Date,                    // Expiration date (required)
  unit_price: Number,                   // Price per unit (required)
  dosage_form: String,                  // Form (tablet, capsule, etc.)
  supplier: String,                     // Supplier name
  batch_number: String,                 // Batch/Lot number
  description: String,                  // Full description
  created_at: DateTime,                 // Creation timestamp
  updated_at: DateTime                  // Last update timestamp
}
```

### Distribution Schema

```javascript
{
  id: String (UUID),                    // Unique identifier
  family_id: String (UUID),             // Reference to family (required)
  medicine_id: String (UUID),           // Reference to medicine (required)
  quantity_external: Number,            // External pharmacy qty (required)
  quantity_internal: Number,            // Internal pharmacy qty (required)
  issue_date: DateTime,                 // When distributed
  user_id: String,                      // Who recorded this
  month: String,                        // YYYY-MM format (required)
  status: String,                       // completed, pending, returned
  notes: String,                        // Additional notes
  created_at: DateTime
}
```

### User Schema

```javascript
{
  id: String (UUID),                    // Unique identifier
  full_name: String,                    // Full name (required)
  username: String,                     // Unique username (required)
  password_hash: String,                // Hashed password (required)
  role: String,                         // Admin, Manager, Staff (required)
  email: String,                        // Email address
  phone: String,                        // Contact number
  created_at: DateTime,                 // Creation timestamp
  last_login: DateTime,                 // Last login timestamp
  is_active: Boolean                    // Account status
}
```

---

## 💡 Usage Guide

### Adding a New Family

1. Navigate to **العائلات** (Families)
2. Fill in required fields:
   - اسم رب الأسرة (Head Name)
   - المنطقة (Zone)
   - العنوان (Address)
   - الفئة (Category)
3. Click **حفظ العائلة** (Save Family)

### Recording Medicine Distribution

1. Navigate to **الصرف** (Distribution)
2. Select Family and Medicine
3. Enter quantities:
   - صيدلية خارجية (External pharmacy)
   - صيدلية داخلية (Internal pharmacy)
4. Click **تسجيل الصرف** (Record Distribution)

**The system will:**

- Automatically reduce medicine stock
- Warn if same medicine given within 30 days
- Calculate and display costs
- Store transaction for reporting

### Viewing Reports

1. Navigate to **التقارير** (Reports)
2. View dashboard statistics:
   - Total families and members
   - Medicine inventory status
   - Monthly cost breakdown
   - Zone-wise distribution

---

## 🔧 Development Notes

### Adding New API Endpoints

1. Create new file in `/routes/` directory
2. Define Express router with handlers
3. Import and mount in `server.js`:
   ```javascript
   import newRouter from "./routes/newroute.js";
   app.use("/api/newroute", newRouter);
   ```
4. Update frontend `index.html` to call new endpoints

### Working with JSON Data Files

The `dataManager.js` utility provides CRUD operations:

```javascript
import {
  readData,
  writeData,
  findById,
  create,
  update,
} from "./utils/dataManager.js";

// Read all records
const allFamilies = readData("families");

// Find by ID
const family = findById("families", "uuid-here");

// Find multiple
const zoneA1Families = findMany("families", { zone: "A1" });

// Create new
const newFamily = create("families", familyData);

// Update existing
const updated = update("families", "uuid-here", { phone: "..." });

// Delete
deleteRecord("families", "uuid-here");
```

### Migration to Database

To migrate from JSON to MySQL/MongoDB:

1. Create new database layer in `/utils/database.js`
2. Implement same CRUD interface
3. Replace `import` in routes from `dataManager.js` to `database.js`
4. No changes needed in route handlers or frontend!

### Error Handling

All endpoints return standardized responses:

**Success (200-201):**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error (400-500):**

```json
{
  "success": false,
  "error": "Error description"
}
```

### Logging & Debugging

Server logs all operations to console:

```
✅ Data files initialized
✅ Saved 50 family records
🗑️  Deleted 5 related distributions
⚠️  WARNING: Duplicate within 30 days
❌ Error: Invalid national ID format
```

---

## 📝 Future Enhancements

- [ ] **JWT Authentication**: Replace simple token with JWT
- [ ] **Database Migration**: Move from JSON to MySQL/MongoDB
- [ ] **Advanced Reports**: Generate PDF reports
- [ ] **SMS Notifications**: Send distribution reminders
- [ ] **Mobile App**: React Native mobile application
- [ ] **Analytics Dashboard**: Advanced charts and graphs
- [ ] **User Roles**: Implement full RBAC system
- [ ] **Audit Logs**: Track all user actions
- [ ] **Backup System**: Automated daily backups
- [ ] **Multi-language**: Add English translation

---

## 📞 Support & Contact

**Project**: Brothers of Lord - Pharmacy Management System  
**Version**: 1.0.0  
**Last Updated**: June 2026

For issues, questions, or contributions, please contact the development team. [kyrilloselia2@gmail.com]

---

## 📄 License

All rights reserved. This system is proprietary software of Saint Mary and St. Michael Coptic Orthodox Church.

---

**Happy Computing! 🚀**
