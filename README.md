# HireLearn

**Hire Smarter, Learn Faster** - A comprehensive platform for technical hiring assessments and employee training management.

## 📋 Overview

HireLearn is a full-stack web application designed to streamline both hiring processes and employee training. It provides:

- **Hiring Assessments**: Technical screening tests for Frontend and Backend developer positions
- **Employee Training**: Module-based learning system with multiple product tracks
- **Admin Dashboard**: Complete management system for users, questions, submissions, and content
- **Real-time Analytics**: Track user progress, quiz submissions, and badge achievements

## ✨ Key Features

### For Administrators
- **User Management**: Add users, assign roles, manage access to products and modules
- **Question Bank**: Create and manage technical questions for hiring and training
- **Content Library**: Upload and organize learning resources (PDFs, videos, documents)
- **Submission Tracking**: View detailed quiz results and user progress
- **Multi-Product Support**: Manage multiple training products (CloudSync Pro, TaskFlow, AnalyticsPro, Company Training)

### For Users
- **Technical Assessments**: Take role-based quizzes for hiring screening
- **Module-Based Learning**: Complete training modules with progress tracking
- **Badge System**: Earn badges for completing modules successfully
- **Resource Library**: Access study materials and documentation
- **Multi-Product Access**: Users can be enrolled in multiple training products

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **AI Integration**: Google Gemini AI for content processing
- **Authentication**: Google OAuth via Firebase
- **Database**: Cloud Firestore
- **Hosting**: Vercel (recommended) or Firebase Hosting

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- Firebase account with a project created
- Google Cloud account (for Gemini AI API)

### Step 1: Clone the Repository

```bash
git clone https://github.com/AfrithHussain/HR-Management-Tool.git
cd HR-Management-Tool
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Authentication** → Sign-in method → Google
4. Enable **Firestore Database** → Create database in production mode
5. Enable **Storage** (optional, for file uploads)
6. Go to Project Settings → General → Your apps → Web app
7. Copy your Firebase configuration

### Step 4: Environment Variables

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (for server-side operations)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="your_private_key_here"

# Google Gemini AI API
GEMINI_API_KEY=your_gemini_api_key_here
```

**Getting Firebase Admin SDK credentials:**
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Copy `project_id`, `client_email`, and `private_key` to your `.env.local`

**Getting Gemini API Key:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Copy it to your `.env.local`

### Step 5: Deploy Firestore Rules

Deploy the security rules to your Firebase project:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (select Firestore)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

### Step 6: Create First Admin User

1. Run the development server (see below)
2. Sign in with Google
3. You'll see "Access Denied" - this is expected
4. Go to Firebase Console → Firestore Database
5. Find the `users` collection → your email document
6. Add a field: `isSuperuser` = `true` (boolean)
7. Refresh the app and sign in again

### Step 7: Run Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add all environment variables from `.env.local`
5. Deploy

### Deploy to Firebase Hosting

```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

## 📚 Usage Guide

### Admin Workflow

1. **Add Users**: Go to Users page → Add Users → Select products and modules
2. **Create Questions**: Go to HireLearn Questions → Add questions for specific products/modules
3. **Upload Content**: Go to Upload Content → Add learning resources
4. **Monitor Progress**: Go to Submissions → View user progress and results

### User Workflow

1. **Sign In**: Use Google account to sign in
2. **Dashboard**: View assigned modules and progress
3. **Take Quiz**: Click on a module → Answer questions → Submit
4. **Earn Badges**: Pass modules to earn badges (70% passing score)
5. **Access Resources**: Click Documents to view learning materials

## 🔐 User Roles

- **Superuser/Admin**: Full access to admin dashboard, can manage users, questions, and content
- **Regular User**: Access to assigned products and modules, can take quizzes and view resources

## 📊 Product Structure

The platform supports multiple training products:

- **CloudSync Pro**: Cloud synchronization training
- **TaskFlow**: Task management training
- **AnalyticsPro**: Analytics platform training
- **Company Training**: General onboarding and training

Each product has multiple modules with questions and learning resources.

## 🎯 Module System

- Users are assigned specific modules within products
- Each module has multiple questions
- Users get 3 attempts per module
- 70% score required to pass
- Badges earned for passing modules

## 🔧 Configuration

### Firestore Collections

- `users`: User profiles, roles, and progress
- `questions`: Hiring assessment questions (Frontend/Backend)
- `gg-questions`: Training module questions (product-based)
- `submissions`: Quiz submission records
- `content`: Learning resources and documents

### Security Rules

The `firestore.rules` file contains security rules. Key points:

- Only authenticated users can read data
- Only superusers can write/modify data
- Users can update their own profile (for login timestamps)

## 🐛 Troubleshooting

**Issue**: "Access Denied" after sign in
- **Solution**: Make sure your email is added to the `users` collection with `isSuperuser: true`

**Issue**: Firebase permission errors
- **Solution**: Deploy Firestore rules using `firebase deploy --only firestore:rules`

**Issue**: Gemini API errors
- **Solution**: Verify your `GEMINI_API_KEY` is correct and has proper permissions

**Issue**: Build errors
- **Solution**: Delete `.next` folder and `node_modules`, then run `npm install` and `npm run dev`

## 📝 License

This project is private and proprietary.

## 👥 Contributing

This is a private project. For questions or issues, contact the repository owner.

## 📧 Support

For support, please contact: [afrithhussain64@gmail.com]

---

Built with ❤️ using Next.js and Firebase
