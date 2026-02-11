@echo off
echo Setting up GHL Workflow Debugger MVP
echo =====================================
echo.

echo Installing backend dependencies...
cd backend
call npm install

if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo Please edit backend\.env with your credentials
)

echo.
echo Installing frontend dependencies...
cd ..\frontend
call npm install

echo.
echo ================================
echo Setup complete!
echo.
echo To start the application:
echo 1. Edit backend\.env with your credentials
echo 2. In backend directory: npm run dev
echo 3. In frontend directory: npm start
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:3001
echo ================================
pause