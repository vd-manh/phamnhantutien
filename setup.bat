@echo off
chcp 65001 >nul
REM Cài đặt lần đầu trên máy mới: tạo môi trường Python .venv và cài thư viện cho các công cụ.
REM Cần có Python 3.10+ (https://www.python.org/downloads/ - nhớ tích "Add python.exe to PATH").
cd /d "%~dp0"
where python >nul 2>nul || (echo [!] Chưa có Python. Cài Python rồi chạy lại file này. & pause & exit /b 1)
if not exist .venv (
  echo Tạo môi trường .venv ...
  python -m venv .venv || (echo [!] Không tạo được .venv & pause & exit /b 1)
)
echo Cài thư viện ...
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt || (echo [!] Cài thư viện lỗi & pause & exit /b 1)
echo.
echo Xong. Nháy đúp start.bat để chạy game.
pause
