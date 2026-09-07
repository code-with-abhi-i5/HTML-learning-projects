# 🏢 OM HOSTEL — Management & Fee Administration Dashboard

A production-grade, SaaS-level hostel administration and student fee management web application built for **OM Hostel**.

---

## ✨ Features

- **Executive Analytics Dashboard**:
  - Live KPI stats (Active Students, Monthly Collection, Pending Dues, Occupancy Rate).
  - Visual monthly collection trend line/area chart (Recharts).
  - Payment mode distribution breakdown (UPI, Cash, Online, Bank Transfer).
  - High-priority overdue defaulters and recent payment logs.
- **Student Management**:
  - Full admission registration with granular monthly breakdown (room rent, mess fee, laundry, transport, caution deposit).
  - Student profile dossier with personal, guardian, room, and status info.
  - Complete month-by-month fee history & audit trail.
  - Search, filter by active/inactive/status, and profile updates.
- **Month-by-Month Fee Architecture**:
  - Dedicated monthly fee tracking for every student.
  - Real-time status indicators: `PAID`, `PARTIAL`, `PENDING`, `OVERDUE`.
  - Seamless recording of partial or full payments per month.
- **Payments & Digital Receipts**:
  - Manual payment recording with payment mode, date, transaction ID, and notes.
  - Automatic branded receipt generation with unique receipt IDs (`OMH-YYYYMM-XXXX`).
  - Professional **PDF receipt download** and instant **Print** capabilities.
- **Room Occupancy & Allocation**:
  - Visual room matrix cards displaying floor, capacity, and live occupancy progress.
  - Room configuration modal (add/edit room number, floor, capacity, room type).
  - Resident roster drilldown per room.
- **Reports & Data Export**:
  - 6 report types: Collection, Due/Defaulters, Student Roster, Occupancy, Payment Modes, and Monthly Ledger.
  - Export to **Excel (.xlsx)**, **CSV**, or formatted **PDF** with date filtering.
- **Audit Logs & Settings**:
  - Immutable audit logs tracking admin actions.
  - Configurable hostel profile, contact details, rules, and default fee parameters.
  - Dark mode and light mode switching.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + Curated modern design tokens
- **Icons & UI**: Lucide React + shadcn/ui components
- **Backend & Auth**: Firebase Auth + Cloud Firestore + Firebase Storage
- **Charts**: Recharts
- **PDF & Exports**: jsPDF, html2canvas, SheetJS (XLSX)
- **Forms & Validation**: React Hook Form + Zod

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Firebase project with Authentication, Firestore Database, and Storage enabled

### 2. Installation
```bash
git clone <repository-url>
cd "OM hostal admin"
npm install
```

### 3. Environment Variables
Create a `.env` file in the project root:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. Admin Account Creation
As this is an Admin-only dashboard without public registration:
1. Go to [Firebase Console](https://console.firebase.google.com).
2. Open **Authentication** -> **Users** tab.
3. Click **Add User** and create an admin email (e.g. `admin@omhostel.com`) and password.
4. Use these credentials to sign in at `/login`.

### 5. Deploy Security Rules
Deploy the included security rules:
```bash
firebase deploy --only firestore:rules,storage
```

### 6. Development & Production
```bash
# Start local development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📁 Project Architecture

```
src/
├── components/          # Reusable UI & domain-specific components
│   ├── dashboard/       # KPI cards, charts, defaulter tables, recent payments
│   ├── layout/          # Sidebar, Navbar, AppLayout with responsive drawer
│   ├── payments/        # RecordPaymentDialog, payment forms
│   └── ui/              # Badges, buttons, cards, dialogs, inputs, selects, tabs
├── contexts/            # AuthContext (Firebase Auth) & ThemeContext (Dark/Light)
├── lib/                 # Firebase initialization & formatting utilities
├── pages/               # Lazy-loaded route pages
│   ├── AddStudentPage.tsx
│   ├── AuditLogsPage.tsx
│   ├── DashboardPage.tsx
│   ├── EditStudentPage.tsx
│   ├── FeesPage.tsx
│   ├── LoginPage.tsx
│   ├── PaymentsPage.tsx
│   ├── ReceiptsPage.tsx
│   ├── ReportsPage.tsx
│   ├── RoomsPage.tsx
│   ├── SettingsPage.tsx
│   ├── StudentDetailsPage.tsx
│   └── StudentsPage.tsx
├── routes/              # Protected & public route guards with suspense fallbacks
├── services/            # Firebase Firestore service layer & PDF generator
│   ├── firebase/        # students, payments, rooms, auditLogs, settings
│   └── pdf/             # receiptGenerator (jsPDF + HTML canvas)
└── types/               # TypeScript interfaces & types
```
