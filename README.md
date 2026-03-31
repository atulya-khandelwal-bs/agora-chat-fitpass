# FITPASS CRM v2 - Admin Dashboard

A modern, full-featured CRM system built with Laravel 12, Inertia.js, and Vue 3 for managing holidays, health coaches, user diets, ratings, and more.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Module System](#module-system)
- [GridView System](#gridview-system)
- [File Storage](#file-storage)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)
- [UI/UX Features](#uiux-features)
- [Quick Start](#quick-start)

---

## 🎯 Overview

### For Users
This is an admin dashboard for managing:
- **Holidays**: Create and manage public/personal holidays with health coach assignments
- **Health Coaches**: Manage coach profiles, photos, specialties, and ratings
- **User Diets**: Assign and manage diet plans for Fitpass users
- **Ratings**: View and manage health coach ratings from users
- **Users**: View Fitpass user details and manage assignments
- **Calls & Tasks**: Manage call schedules and task assignments

### For Developers
A modern Laravel + Inertia.js + Vue 3 application with:
- **Modular architecture**: Easy to add new modules
- **Reusable components**: GridView system for data tables
- **Type-safe**: DTOs for data transfer
- **Repository pattern**: Clean separation of concerns
- **Configuration-driven**: Module configs define behavior

---

## 🛠 Tech Stack

### Backend
- **Laravel 12** - PHP framework
- **Inertia.js** - Modern monolith approach (no API needed)
- **PostgreSQL** - Database
- **Repository Pattern** - Data access layer
- **Service Layer** - Business logic

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **Inertia.js** - SPA-like experience without API
- **Bootstrap 5** - UI framework
- **Bootstrap Vue Next** - Vue components
- **Vite** - Build tool
- **SCSS** - Styling

### Key Libraries
- **FlatPickr** - Date picker
- **Vue Slider** - Range sliders
- **ApexCharts** - Charts and graphs
- **FullCalendar** - Calendar views
- **CKEditor** - Rich text editor

---

## 🏗 Architecture

### High-Level Flow

```
User Request
    ↓
Laravel Route → Controller
    ↓
Service Layer (Business Logic)
    ↓
Repository (Data Access)
    ↓
Database
    ↓
DTO (Data Transfer Object)
    ↓
Inertia Response → Vue Component
    ↓
User Interface
```

### Component Architecture

```
Pages (Vue Components)
    ↓
Module Config (JavaScript)
    ↓
GridView Components
    ├── ModernGridView (Modern UI)
    ├── ClassicGridView (Classic UI)
    └── GridView (Core Component)
    ↓
Data Display & Interaction
```

### Key Patterns

1. **Repository Pattern**: All database access through repositories
2. **Service Layer**: Business logic separated from controllers
3. **DTO Pattern**: Structured data transfer between layers
4. **Module Configuration**: JavaScript configs define module behavior
5. **Component Composition**: Reusable Vue components

---

## 📁 Project Structure

```
fitfeast_crm_v2/
├── app/
│   ├── Contracts/          # Interfaces (Repository, Service)
│   ├── DTOs/                # Data Transfer Objects
│   ├── Enums/               # PHP Enums (Status, Type)
│   ├── Http/
│   │   ├── Controllers/     # Route controllers
│   │   ├── Middleware/      # Custom middleware
│   │   ├── Requests/        # Form validation
│   │   └── Resources/       # API resources
│   ├── Models/              # Eloquent models
│   ├── Repositories/        # Data access layer
│   └── Services/            # Business logic
│
├── config/
│   └── modules.php          # Module registry (sidebar menu)
│
├── resources/
│   ├── js/
│   │   ├── Components/       # Reusable Vue components
│   │   │   ├── DataTable/    # GridView system
│   │   │   └── Forms/        # Form components
│   │   ├── Pages/            # Page components (routes)
│   │   ├── config/
│   │   │   └── modules/       # Module configurations
│   │   ├── composables/      # Vue composables
│   │   └── utils/            # Utility functions
│   └── scss/                 # Stylesheets
│
├── routes/
│   └── web.php               # Application routes
│
└── storage/
    └── app/
        └── public/           # User uploads (needs symlink)
```

---

## 🧩 Module System

### How Modules Work

Each module (Holiday, Health Coach, etc.) has:

1. **Backend Configuration** (`config/modules.php`):
   ```php
   [
       'key' => 'holiday',
       'name' => 'Manage Holidays',
       'icon' => 'ri-calendar-2-line',
       'route' => 'holiday.index',
       'page' => 'holiday/index',
   ]
   ```

2. **Frontend Configuration** (`resources/js/config/modules/holiday.js`):
   ```javascript
   {
     columns: [...],           // Table columns
     filterMapping: {...},     // Filter mapping
     actions: [...],           // Action buttons
     details: {...}            // View/offcanvas fields
   }
   ```

3. **Vue Page** (`resources/js/Pages/holiday/index.vue`):
   - Uses GridView components
   - Handles user interactions
   - Displays data

### Adding a New Module

1. **Add to `config/modules.php`**:
   ```php
   [
       'key' => 'new-module',
       'name' => 'Manage New Module',
       'icon' => 'ri-icon-name',
       'route' => 'new-module.index',
       'page' => 'new-module/index',
   ]
   ```

2. **Create module config** (`resources/js/config/modules/new-module.js`):
   ```javascript
   export default {
     key: 'new-module',
     columns: [...],
     actions: [...],
     // ... other config
   }
   ```

3. **Create controller, repository, service** (follow existing patterns)

4. **Create Vue page** (`resources/js/Pages/new-module/index.vue`)

---

## 📊 GridView System

### Three GridView Types

1. **ModernGridView**: Modern UI with card-like rows, rounded corners
2. **ClassicGridView**: Classic table UI with dark headers
3. **GridView**: Base component (used directly or via wrappers)

### Usage Example

```vue
<ModernGridView
    :columns="gridColumns"
    :data-provider="gridDataProvider"
    :filters="filters"
    :actions="gridActions"
    @filter-change="handleFilterChange"
/>
```

### Features

- **Filtering**: Search, select, date, date-range, range-inputs
- **Sorting**: Click column headers to sort
- **Pagination**: Smart pagination (shows 1,2,3 or 1,2...current)
- **Actions**: View, Edit, Delete buttons with dropdowns
- **Custom Slots**: Override column rendering
- **Responsive**: Works on all screen sizes

### Column Types

- `search` - Text input filter
- `select` - Dropdown filter
- `date` - Single date picker
- `date-range` - Date range picker
- `range-inputs` - Min/max number inputs
- `range-slider` - Visual slider
- `text` - Display only (no filter)

---

## 💾 File Storage

### Storage Structure

```
storage/
└── app/
    └── public/              # Public files (user uploads)
        ├── dietitian/       # Health coach photos
        ├── profile/         # User profile images
        └── icons/           # App icons

public/
└── images/                  # Static assets (always accessible)
    └── profile/
        └── profile-picture.png # Default images
```

### How It Works

1. **User Uploads** → `storage/app/public/`
   - Requires symlink: `php artisan storage:link`
   - Accessible at: `/storage/path/to/file.jpg`
   - Symlink creates: `public/storage` → `storage/app/public`

2. **Static Assets** → `public/images/`
   - Always accessible
   - No symlink needed
   - Accessible at: `/images/path/to/file.png`

### Creating Storage Symlink

```bash
php artisan storage:link
```

**Important**: Run this on every server (local, dev, production) after deployment.

### Why Symlink?

- Files in `storage/app/public/` are **outside** web root
- Symlink makes web server think they're in `public/storage/`
- Only **one copy** of files exists (pointer, not copy)
- Each server needs its own symlink (different paths)

---

## 🔄 Development Workflow

### Local Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd fitfeast_crm_v2

# 2. Install dependencies
composer install
npm install

# 3. Environment setup
cp .env.example .env
php artisan key:generate

# 4. Database setup
php artisan migrate
php artisan db:seed  # If seeders exist

# 5. Create storage symlink
php artisan storage:link

# 6. Start development servers
npm run dev          # Frontend (Vite)
php artisan serve    # Backend (Laravel)
```

### Development Commands

```bash
# Frontend
npm run dev          # Development server with HMR
npm run build        # Production build

# Backend
php artisan serve    # Start Laravel server
php artisan migrate  # Run migrations
php artisan tinker  # Interactive shell
```

### Code Structure

- **Controllers**: Handle HTTP requests, call services
- **Services**: Business logic, validation
- **Repositories**: Database queries, data access
- **DTOs**: Structured data objects
- **Vue Pages**: User interface components
- **Module Configs**: Define module behavior

---

## 🚀 Deployment

### Deployment Script

Use the provided `deploy.sh`:

```bash
#!/bin/bash
git pull
composer install --no-dev --optimize-autoloader
npm install
npm run build
php artisan storage:link  # IMPORTANT!
php artisan config:clear
php artisan cache:clear
```

### Key Steps

1. **Pull latest code**: `git pull`
2. **Install dependencies**: `composer install` and `npm install`
3. **Build assets**: `npm run build`
4. **Create symlink**: `php artisan storage:link` ⚠️ **Critical!**
5. **Clear caches**: `php artisan cache:clear`

### Environment Variables

Ensure `.env` has:
- Database credentials
- `APP_URL` set correctly
- Session/cookie configuration
- Any API keys

---

## 🎨 UI/UX Features

### Design System

- **Bootstrap 5** - Base framework
- **Custom SCSS** - Extended styling
- **RemixIcon** - Icon library
- **Dark/Light Mode** - Theme support

### Key UI Components

1. **Sidebar Navigation**
   - Collapsible menu
   - Icon-based navigation
   - Active state highlighting

2. **Data Tables (GridView)**
   - Modern card-style rows
   - Classic table style
   - Filtering and sorting
   - Action buttons with dropdowns

3. **Forms**
   - Dynamic form builder
   - Validation with error display
   - File uploads with preview
   - Date pickers and sliders

4. **Modals & Offcanvas**
   - View details in offcanvas
   - Edit forms in modals
   - Confirmation dialogs

5. **Pagination**
   - Smart pagination (1,2,3 or 1,2...current)
   - Previous/Next buttons
   - Ellipsis for skipped pages

### Responsive Design

- Mobile-friendly layouts
- Collapsible sidebar on mobile
- Responsive tables
- Touch-friendly buttons

---

## 🚦 Quick Start

### For New Developers

1. **Understand the Flow**:
   ```
   Route → Controller → Service → Repository → Database
   Database → DTO → Inertia → Vue Component → UI
   ```

2. **Find a Module**:
   - Check `config/modules.php` for module list
   - Look at `resources/js/config/modules/` for config
   - Check `resources/js/Pages/` for Vue pages
   - Check `app/Http/Controllers/` for controllers

3. **Modify a Module**:
   - Update module config for columns/actions
   - Modify Vue page for UI changes
   - Update controller for new logic
   - Update repository for data changes

### Common Tasks

**Add a new column to a table:**
1. Add to module config (`columns` array)
2. Add to `filterMapping` if filterable
3. Backend will automatically handle it

**Add a new filter:**
1. Add column with `label-type: 'search'` or other type
2. Add to `filterMapping`
3. Update repository to handle filter

**Add a new action button:**
1. Add to module config (`actions` array)
2. Define action handler in page component
3. Add route if needed

---

## 📝 Important Notes

### Storage Symlink

- **Always create** on every server: `php artisan storage:link`
- **Don't commit** symlink to git (it's in `.gitignore`)
- **Each server** needs its own symlink (different paths)

### Module Configuration

- Module configs are in `resources/js/config/modules/`
- They define columns, filters, actions, and display rules
- Changes require frontend rebuild: `npm run build`

### File Uploads

- User uploads go to `storage/app/public/`
- Static/default files go to `public/images/`
- Always use `Storage::disk('public')` for uploads

### CSRF & Cookies

- Custom CSRF cookie name: `XSRF-TOKEN-FITFEAST-V2`
- Custom session cookie: `fitfeast_crm_v2_session`
- Prevents conflicts with iframes

---

## 🐛 Troubleshooting

### 404 on `/storage/...` URLs
- **Solution**: Run `php artisan storage:link` on server

### Module not showing in sidebar
- **Check**: `config/modules.php` has the module
- **Check**: Route exists in `routes/web.php`

### Filters not working
- **Check**: `filterMapping` in module config
- **Check**: Repository handles the filter

### Build errors
- **Clear**: `rm -rf node_modules package-lock.json && npm install`
- **Rebuild**: `npm run build`

---

## 📚 Additional Resources

- **Laravel Docs**: https://laravel.com/docs
- **Inertia.js Docs**: https://inertiajs.com
- **Vue 3 Docs**: https://vuejs.org
- **Bootstrap 5 Docs**: https://getbootstrap.com

---

## 👥 Contributing

1. Follow existing code patterns
2. Use Repository/Service pattern for data access
3. Create module configs for new modules
4. Test on multiple screen sizes
5. Ensure storage symlink is created

---

## 📄 License

This project is proprietary software.

---

**Built with ❤️ for FITPASS**
