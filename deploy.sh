#!/bin/bash

# Define repositories
HEROKU_APP="agentforce-custom-ui"
BRANCH="main"  # Change to your current branch if different

echo "🔄 Checking authentication with Heroku..."
heroku whoami &> /dev/null
if [ $? -ne 0 ]; then
  echo "⚠️  You are not logged in to Heroku. Logging in now..."
  heroku login
  if [ $? -ne 0 ]; then
    echo "❌ Heroku login failed. Exiting."
    exit 1
  fi
fi

echo "📤 Pushing to Heroku..."
git push heroku $BRANCH

echo "📤 Pushing to GitHub (origin)..."
git push origin $BRANCH

echo "✅ Deployment complete!"

