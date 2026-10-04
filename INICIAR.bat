@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js LTS em https://nodejs.org e execute este arquivo novamente.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo Instalando dependencias do Neon Lexico...
  call npm install
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)
echo.
echo Abra no navegador o endereco Local exibido abaixo.
echo No celular, na mesma rede Wi-Fi, use o endereco Network.
echo Mantenha esta janela aberta. Para encerrar, pressione Ctrl+C.
echo.
call npm run dev -- --host 0.0.0.0 --strictPort
if errorlevel 1 pause
endlocal
