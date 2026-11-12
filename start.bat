@echo off
rem Chay game qua web server cuc bo (can de nap nhan vat va hieu ung beanfx).
cd /d "%~dp0"
start "" http://localhost:8080/
python tools\serve.py 8080
