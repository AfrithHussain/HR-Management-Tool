#!/bin/bash

echo "🚀 Deploying Firestore Security Rules..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Please login to Firebase first:"
    echo "firebase login"
    exit 1
fi

# Deploy Firestore rules
echo "📋 Deploying Firestore security rules..."
firebase deploy --only firestore:rules

echo "✅ Firestore rules deployed successfully!"
echo ""
echo "🔍 To test your Firestore connection:"
echo "1. Run your Next.js app: npm run dev"
echo "2. Open http://localhost:3000"
echo "3. Click 'Test Firestore Connection' button"
echo "4. Check the browser console for detailed error messages"