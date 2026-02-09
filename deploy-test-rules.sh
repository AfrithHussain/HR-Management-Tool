#!/bin/bash

echo "🔥 Deploying TESTING Firestore Rules (Allow All Access)"
echo "================================================"
echo ""
echo "⚠️  WARNING: This will allow ALL read/write access to Firestore"
echo "⚠️  Use ONLY for testing, then revert to secure rules!"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "📋 Backing up current rules..."
    cp firestore.rules firestore.rules.backup
    
    echo "📝 Copying test rules..."
    cp firestore.rules.testing firestore.rules
    
    echo "🚀 Deploying to Firebase..."
    firebase deploy --only firestore:rules
    
    echo ""
    echo "✅ Test rules deployed!"
    echo ""
    echo "To revert to secure rules, run:"
    echo "  cp firestore.rules.backup firestore.rules"
    echo "  firebase deploy --only firestore:rules"
else
    echo "❌ Cancelled"
fi
