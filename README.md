# RMAS National - Rashtriya Manav Adhikar Sangathan

## 📋 Recent Updates

**March 2026**: Migrated to Playwright-based PDF generation for better compatibility and performance. ID cards and joining letters now use Playwright with bundled Chromium rendering.

## 🌟 Features

### Core Functionality
- **Member Registration & Management**: Complete lifecycle from application to approval
- **Admin Dashboard**: User management, membership approvals, analytics
- **Document Generation**: ID cards, joining letters, and membership kits (PDF format)
- **Multilingual Support**: English, Hindi, and Urdu with RTL support
- **File Uploads**: Member photos and documents (images and PDF)
- **Email Notifications**: OTP verification, password reset, welcome emails, status updates
- **Audit Logging**: Complete activity tracking with exportable logs
- **Complaint System**: Public grievance submission with document uploads
- **Password Reset**: OTP-based secure password reset flow
- **Team Management**: Position assignment with hierarchical limits (Adhyaksh, Sachiv, etc.)

### Technical Features
- **PDF Generation**: HTML-to-PDF using Playwright with bundled Chromium
- **QR Code Integration**: For document verification
- **Role-Based Access Control**: Superadmin, Secretary, President, Admin levels
- **Location-Based Hierarchy**: National > State > Division > District > Block > Panchayat
- **Session Management**: Secure authentication with express-session
- **Responsive Design**: Tailwind CSS based UI
- **Internationalization**: i18next for multi-language support (EN/HI/UR)

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas account (or local MongoDB)
- Playwright with bundled Chromium (for PDF generation)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rmas-national
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Database
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rmas_national

   # Session
   SESSION_SECRET=your-super-secret-key-here

   # Email (Brevo)
   BREVO_API_KEY=your-brevo-api-key
   SENDER_EMAIL=your-email@domain.com

   # Base URL
   BASE_URL=https://your-domain.com

   # Cloudinary (optional, for image storage)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Build CSS**
   ```bash
   npm run build:css
   ```

5. **Seed Admin User**
   ```bash
   node scripts/seedAdmin.js
   ```

6. **Start the Application**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
rmas-national/
├── assets/                 # Static assets (fonts - Noto Sans Devanagari/Nastaliq Urdu)
├── config/                 # Database configuration (db.js)
├── locales/                # Translation files (en.json, hi.json, ur.json)
├── middleware/             # Express middleware
│   ├── adminActivityLogger.js    # Admin action logging
│   └── auth.js                  # Authentication middleware
├── models/                 # Mongoose models
│   ├── Adhyaksh.js        # Team position assignments
│   ├── AuditLog.js        # Activity logging
│   ├── Complaint.js       # Grievance/complaint system
│   ├── Location.js        # Geographic data
│   ├── Member.js          # Member registrations
│   └── User.js            # Admin users
├── public/                 # Static files
│   ├── css/               # Compiled Tailwind CSS
│   ├── js/                # Client-side JavaScript
│   ├── locations/         # State/District data (JSON)
│   ├── pdfs/              # Generated PDF documents
│   └── uploads/           # User uploaded files
├── routes/                 # Route handlers
├── scripts/                # Utility scripts
│   ├── checkMember.js     # Check member details
│   ├── deleteAll.js       # Delete all data
│   ├── seedAdmin.js       # Seed default admin
│   ├── seedStates.js      # Seed state data
│   ├── seedTestMember.js  # Seed test member
│   ├── testGenerateKit.js # Test PDF generation
│   └── testHttp.js        # HTTP testing
├── services/               # External services
│   └── aiAgent.js         # AI integration
├── src/                    # Source files
│   └── tailwind.css       # Tailwind CSS source
├── utils/                  # Utility functions
│   ├── adminUtils.js      # Admin utilities
│   ├── auditUtils.js      # Audit logging utilities
│   ├── dateUtils.js       # Date formatting
│   ├── idCardGenerator.js # ID card PDF generation
│   ├── joiningLetterGenerator.js # Joining letter PDF
│   ├── mailer.js          # Email sending (Brevo)
│   ├── membershipKitGenerator.js # Membership kit PDF
│   ├── roleDisplay.js     # Role display helpers
│   └── textFormatting.js  # Text formatting utilities
├── views/                  # EJS templates
│   ├── admin/             # Admin panel templates
│   │   ├── analytics.ejs  # Reports & analytics
│   │   ├── assign-role.ejs # Position assignment
│   │   ├── dashboard.ejs  # Main dashboard
│   │   ├── logs.ejs       # Audit logs
│   │   ├── login.ejs      # Admin login
│   │   ├── membership-applications.ejs # Applications list
│   │   ├── membership-application-detail.ejs # Application detail
│   │   ├── users.ejs      # User management
│   │   └── users-add.ejs  # Add user form
│   ├── partials/          # Reusable components
│   │   ├── footer.ejs     # Footer
│   │   ├── header.ejs     # Header
│   │   └── layout.ejs     # Main layout
│   ├── about.ejs          # About page
│   ├── activities.ejs     # Activities page
│   ├── complaint.ejs      # Complaint form
│   ├── contact.ejs       # Contact page
│   ├── download-links.ejs # Download links
│   ├── download-verify.ejs # Download verification
│   ├── forgot-password.ejs # Forgot password
│   ├── gallery.ejs       # Gallery page
│   ├── home.ejs           # Home page
│   ├── join.ejs           # Member registration
│   ├── member-registration.ejs # Alt registration
│   ├── news.ejs          # News page
│   ├── reset-password-otp.ejs # Password reset
│   ├── team.ejs           # Team page
│   ├── terms.ejs          # Terms & conditions
│   ├── verification.ejs   # Membership verification
│   └── verify-member.ejs  # Member verification
├── .env                    # Environment variables
├── .gitignore              # Git ignore
├── index.js               # Main application file (3280 lines)
├── package.json           # Dependencies and scripts
├── postcss.config.js      # PostCSS configuration
├── tailwind.config.js     # Tailwind configuration
└── validate.js            # Validation utilities
```

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment (v16+)
- **Express.js** - Web framework (v5.2.1)
- **MongoDB/Mongoose** - Database and ODM
- **EJS** - Template engine

### PDF Generation
- **Playwright** - Browser automation with bundled Chromium
- **QRCode** - QR code generation

### Frontend
- **Tailwind CSS** - Utility-first CSS framework (v4.2.1)
- **JavaScript** - Client-side scripting
- **EJS** - Server-side templating

### Other Dependencies
- **i18next** - Internationalization (EN/HI/UR)
- **Multer** - File upload handling
- **@getbrevo/brevo** - Email service (Brevo/Sendinblue)
- **bcryptjs** - Password hashing
- **helmet** - Security middleware
- **winston** - Logging
- **moment** - Date handling
- **canvas** - Image processing
- **cloudinary** - Cloud image storage

## 🔧 API Endpoints

### Public Routes
- `GET /` - Home page
- `GET /join` - Member registration form
- `POST /join` - Submit member registration
- `GET /about` - About page
- `GET /contact` - Contact page
- `GET /activities` - Activities page
- `GET /news` - News page
- `GET /gallery` - Gallery page
- `GET /team` - Team page
- `GET /api/team` - Team API (filtered)
- `GET /terms` - Terms & conditions
- `GET /verify/:membershipId` - Membership verification
- `GET /v/:membershipId` - Mobile-friendly verification
- `GET /complaint` - Complaint form
- `POST /api/complaints` - Submit complaint
- `GET /download-verify` - Document download
- `POST /download-verify` - Send OTP for download
- `POST /verify-otp` - Verify OTP and show download links

### Admin Routes
- `GET /admin/login` - Admin login
- `POST /admin/login` - Submit login
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/analytics` - Reports & analytics
- `GET /admin/logs` - Audit logs
- `GET /admin/logs/export` - Export logs as CSV
- `GET /admin/membership-applications` - View applications
- `GET /admin/membership-applications/:id` - Application detail
- `POST /admin/membership-applications/:id/verify` - Verify application
- `POST /admin/membership-applications/:id/approve` - Approve application
- `POST /admin/membership-applications/:id/reject` - Reject application
- `GET /admin/membership-applications/:id/assign-role` - Assign position form
- `POST /admin/membership-applications/:id/assign-role` - Submit position assignment
- `POST /admin/approve-id-card/:memberId` - Approve ID card (Superadmin)
- `GET /admin/users` - User management
- `GET /admin/users/add` - Add user form
- `POST /admin/users/add` - Create user
- `GET /admin/users/:id/edit` - Edit user form
- `POST /admin/users/:id/edit` - Update user
- `GET /admin/users/:id/delete` - Delete user
- `GET /admin/logout` - Admin logout

### Document Routes
- `GET /certificate/:membershipId` - Download ID card PDF
- `GET /joining-letter/:membershipId` - Download joining letter PDF
- `GET /membership-kit/:membershipId` - Download membership kit PDF

### Password Reset Routes
- `GET /forgot-password` - Forgot password page
- `POST /forgot-password` - Send OTP
- `GET /verify-password-otp` - Verify OTP page
- `POST /verify-password-otp` - Verify OTP
- `GET /reset-password-otp` - Reset password page
- `POST /reset-password-otp` - Reset password

## 📊 Database Models

### Member
- Personal information (name, DOB, gender, contact)
- Address details (state, division, district, block, panchayat)
- Membership ID, status, approval workflow
- Document uploads (photo, documents)
- Position/role assignment
- Review history

### User (Admin)
- Admin user accounts
- Role-based permissions (Superadmin, Secretary, President, Admin)
- Location-based access (State, Division, District, Block, Panchayat)
- OTP-based password reset

### AuditLog
- Activity tracking (login, logout, approve, reject, download)
- User actions logging with IP and user agent
- Filterable and exportable to CSV

### Complaint
- complainant Information
- Victim Information
- Incident Details (category, location, description)
- Document uploads (police reports, medical reports, photos, videos)
- Priority and status tracking

### Adhyaksh (Team Positions)
- Position assignments (Adhyaksh, Upadhyaksh, Sachiv, etc.)
- Team types (Core, Mahila, Yuva, Alpsankhyak, SC-ST)
- Hierarchical level assignment
- Active/inactive status

### Location
- Geographic data storage
- States, divisions, districts, blocks, panchayats

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Multilingual Interface**: EN/HI/UR with RTL support
- **Admin Panel**: Comprehensive management interface
- **Form Validation**: Client and server-side validation
- **Loading States**: User feedback during operations
- **Error Handling**: Graceful error management
- **Theme**: Blue/Navy color scheme with white accents

## 🔒 Security Features

- **Session Management**: Secure session handling
- **Password Hashing**: bcryptjs encryption
- **Input Validation**: Sanitization and validation
- **CSRF Protection**: Helmet middleware
- **Role-Based Access**: Location and role-based filtering
- **Audit Logging**: Complete activity tracking
- **File Upload Security**: Type and size restrictions
- **OTP-based Password Reset**: Secure recovery flow

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-friendly interface
- Optimized forms for mobile devices
- Mobile-friendly verification pages

## 🌐 Internationalization

- **English** (en.json)
- **Hindi** (hi.json)
- **Urdu** (ur.json) - RTL support

Language switching based on URL parameter, cookie, or browser settings.

## 📈 Analytics & Reporting

- Member registration statistics
- Application approval metrics (pending, verified, approved, rejected)
- User activity reports
- Geographic distribution (state, district)
- Monthly growth charts
- Download statistics

## 🧪 Testing

Run test scripts:
```bash
node scripts/testHttp.js
node scripts/testGenerateKit.js
node scripts/checkMember.js
```

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=your-production-db-uri
SESSION_SECRET=strong-production-secret
BREVO_API_KEY=production-email-key
BASE_URL=https://yourdomain.com
```

### Build Process
```bash
npm run build:css
npm start
```

## 📄 License

ISC License

## 📞 Support

For support and questions, please contact the development team.

## 🙏 Acknowledgments

- Rashtriya Manav Adhikar Sangathan
- Open source community
- Contributors and maintainers