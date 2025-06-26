@echo off
echo Starting GIF Maker Project Cleanup...

REM Backup package.json
echo Backing up package.json...
copy package.json package.json.backup

REM Remove unused dependencies
echo Removing unused dependencies...
call npm uninstall @radix-ui/react-accordion @radix-ui/react-aspect-ratio @radix-ui/react-hover-card @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-context-menu @radix-ui/react-toggle @radix-ui/react-toggle-group date-fns react-day-picker recharts embla-carousel-react lenis next-themes @hookform/resolvers zod framer-motion react-pdf vaul input-otp

REM Clean node_modules and reinstall
echo Cleaning and reinstalling dependencies...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
call npm install

REM Archive old documentation
echo Organizing documentation...
if not exist docs\archive mkdir docs\archive
move cleanupUPDATE.md docs\archive\ 2>nul
move CLEANUP_SUMMARY.md docs\archive\ 2>nul
move UI_FIX_ATTEMPTS.md docs\archive\ 2>nul

REM Remove temp directory
echo Removing temporary files...
rmdir /s /q temp 2>nul

echo.
echo Cleanup complete! Removed ~15 unused dependencies.
echo Next steps: Run 'npm run build' to verify everything works.
pause
