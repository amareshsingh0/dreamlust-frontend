@echo off
echo ========================================
echo Fixing Prisma Client Generation
echo ========================================
echo.

echo Step 1: Killing all Node and Bun processes...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM bun.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo Done!
echo.

echo Step 2: Removing locked Prisma client...
if exist "node_modules\.prisma\client" (
    rmdir /S /Q "node_modules\.prisma\client" 2>nul
    timeout /t 1 /nobreak >nul
)
echo Done!
echo.

echo Step 3: Generating Prisma client...
call bunx prisma generate
echo.

if %ERRORLEVEL% EQU 0 (
    echo ========================================
    echo SUCCESS! Prisma client generated
    echo ========================================
    echo.
    echo You can now start the server with:
    echo   bun run dev
) else (
    echo ========================================
    echo ERROR: Prisma generation failed
    echo ========================================
    echo Please check the error above
)
echo.
pause
