#!/bin/bash

echo "🧹 Starting GIF Maker Project Cleanup..."

# Backup package.json
echo "📦 Backing up package.json..."
cp package.json package.json.backup

# Remove unused dependencies
echo "🗑️  Removing unused dependencies..."
npm uninstall @radix-ui/react-accordion @radix-ui/react-aspect-ratio \
  @radix-ui/react-hover-card @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu @radix-ui/react-context-menu \
  @radix-ui/react-toggle @radix-ui/react-toggle-group \
  date-fns react-day-picker recharts embla-carousel-react \
  lenis next-themes @hookform/resolvers zod framer-motion \
  react-pdf vaul input-otp

# Clean node_modules and reinstall
echo "♻️  Cleaning and reinstalling dependencies..."
rm -rf node_modules package-lock.json
npm install

# Archive old documentation
echo "📚 Organizing documentation..."
mkdir -p docs/archive
mv cleanupUPDATE.md CLEANUP_SUMMARY.md UI_FIX_ATTEMPTS.md docs/archive/ 2>/dev/null || true

# Remove temp directory
echo "🧹 Removing temporary files..."
rm -rf temp/

echo "✅ Cleanup complete! Removed ~15 unused dependencies."
echo "💡 Next steps: Run 'npm run build' to verify everything works."
