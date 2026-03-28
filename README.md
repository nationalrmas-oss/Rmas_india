## 📋 Recent Updates

**March 2026**: Restored to original Puppeteer-based PDF generation implementation for better compatibility and performance. ID cards and joining letters now use Chrome/Chromium rendering instead of html-pdf.

## 🌟 Features

### Core Functionality
- **Member Registration & Management**: Complete lifecycle from application to approval
- **Admin Dashboard**: User management, membership approvals, analytics
- **Document Generation**: ID cards and joining letters (PDF format)
- **Multilingual Support**: English, Hindi, and Urdu
- **File Uploads**: Member photos and documents
- **Email Notifications**: OTP verification, password reset, status updates
- **Audit Logging**: Complete activity tracking
- **Complaint System**: Member grievance management

### Technical Features
- **PDF Generation**: HTML-to-PDF using `Puppeteer` with Chrome/Chromium
- **QR Code Integration**: For document verification
- **Role-Based Access Control**: Admin, Super Admin, and member roles
- **Session Management**: Secure authentication
- **Responsive Design**: Tailwind CSS based UI
- **Internationalization**: i18next for multi-language support

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas account (or local MongoDB)
- Chrome/Chromium (for PDF generation via Puppeteer)

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
├── assets/                 # Static assets (fonts)
├── config/                 # Database configuration
├── locales/                # Translation files (en, hi, ur)
├── middleware/             # Express middleware
├── models/                 # Mongoose models
├── public/                 # Static files (css, js, images, pdfs)
├── routes/                 # Route handlers
├── scripts/                # Utility scripts
├── services/               # External services (AI agent)
├── src/                    # Source files (Tailwind CSS)
├── uploads/                # User uploaded files
├── utils/                  # Utility functions
├── views/                  # EJS templates
│   ├── admin/             # Admin panel templates
│   └── partials/          # Reusable components
├── .env                    # Environment variables
├── index.js               # Main application file
├── package.json           # Dependencies and scripts
└── tailwind.config.js     # Tailwind configuration
```

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB/Mongoose** - Database and ODM
- **EJS** - Template engine
- **Puppeteer** - PDF generation
- **QRCode** - QR code generation

### Frontend
- **Tailwind CSS** - Utility-first CSS framework
- **JavaScript** - Client-side scripting
- **EJS** - Server-side templating

### Other
- **i18next** - Internationalization
- **Multer** - File upload handling
- **Brevo** - Email service
- **Winston** - Logging
- **Helmet** - Security middleware
- **bcryptjs** - Password hashing

## 🔧 API Endpoints

### Public Routes
- `GET /` - Home page
- `GET /join` - Member registration
- `GET /about` - About page
- `GET /contact` - Contact page
- `POST /register` - Member registration
- `GET /verify-member` - Member verification
- `POST /verify-otp` - OTP verification

### Admin Routes
- `GET /admin/login` - Admin login
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/membership-applications` - View applications
- `POST /admin/approve-member` - Approve member
- `GET /admin/users` - User management

### Document Routes
- `GET /id-card/:membershipId` - Download ID card
- `GET /joining-letter/:membershipId` - Download joining letter

## 📊 Database Models

### Member
- Personal information (name, DOB, contact)
- Address details
- Membership status and ID
- Document uploads
- Approval workflow

### User
- Admin user accounts
- Role-based permissions
- Authentication details

### AuditLog
- Activity tracking
- User actions logging
- Security monitoring

### Complaint
- Member grievances
- Resolution tracking
- Status management

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Multilingual Interface**: EN/HI/UR support
- **Admin Panel**: Comprehensive management interface
- **Form Validation**: Client and server-side validation
- **Loading States**: User feedback during operations
- **Error Handling**: Graceful error management

## 🔒 Security Features

- **Session Management**: Secure session handling
- **Password Hashing**: bcryptjs encryption
- **Input Validation**: Sanitization and validation
- **CSRF Protection**: Helmet middleware
- **Audit Logging**: Complete activity tracking
- **File Upload Security**: Type and size restrictions

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-friendly interface
- Optimized forms for mobile devices
- Progressive Web App ready

## 🌐 Internationalization

- **English** (en.json)
- **Hindi** (hi.json)
- **Urdu** (ur.json)

Language switching based on user preference and browser settings.

## 📈 Analytics & Reporting

- Member registration statistics
- Application approval metrics
- User activity reports
- Geographic distribution
- Performance monitoring

## 🧪 Testing

Run test scripts:
```bash
node scripts/testHttp.js
node scripts/testJoiningLetter.js
node scripts/generateIdCard.js
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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

ISC License

## 📞 Support

For support and questions, please contact the development team.

## 🙏 Acknowledgments

- Rashtriya Manav Adhikar Sangathan
- Open source community
- Contributors and maintainers</content>
<parameter name="filePath">d:\rmas-national\README.md