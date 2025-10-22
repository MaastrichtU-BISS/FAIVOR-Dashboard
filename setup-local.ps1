# FAIVOR Dashboard - Quick Local Setup Script (Windows PowerShell)
# This script downloads the necessary files and starts the application

# Enable strict error handling
$ErrorActionPreference = "Stop"

# URLs for downloading files
$DockerComposeUrl = "https://raw.githubusercontent.com/MaastrichtU-BISS/FAIVOR-Dashboard/main/docker-compose.local.yml"
$EnvFileUrl = "https://raw.githubusercontent.com/MaastrichtU-BISS/FAIVOR-Dashboard/main/.env.local.example"

# Function to print colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" "Green"
}

function Write-Error-Message {
    param([string]$Message)
    Write-ColorOutput "✗ Error: $Message" "Red"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ $Message" "Cyan"
}

function Write-Warning-Message {
    param([string]$Message)
    Write-ColorOutput "⚠ $Message" "Yellow"
}

# Header
Write-ColorOutput "╔════════════════════════════════════════════════╗" "Blue"
Write-ColorOutput "║   FAIVOR Dashboard - Quick Local Setup        ║" "Blue"
Write-ColorOutput "╚════════════════════════════════════════════════╝" "Blue"
Write-Host ""

# Check if Docker is installed
Write-ColorOutput "[1/6] Checking Docker installation..." "Blue"
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Success "Docker is installed: $dockerVersion"
} catch {
    Write-Error-Message "Docker is not installed. Please install Docker Desktop for Windows:
    
    Download from: https://www.docker.com/products/docker-desktop
    
    After installation:
    1. Run Docker Desktop
    2. Wait for it to start completely
    3. Run this script again"
    exit 1
}

# Check if Docker is running
Write-ColorOutput "[2/6] Checking if Docker daemon is running..." "Blue"
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Success "Docker daemon is running"
} catch {
    Write-Error-Message "Docker is installed but not running. Please start Docker Desktop and try again."
    exit 1
}

# Check if Docker Compose is available
Write-ColorOutput "[3/6] Checking Docker Compose..." "Blue"
try {
    $composeVersion = docker compose version 2>$null
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Success "Docker Compose is available: $composeVersion"
} catch {
    Write-Error-Message "Docker Compose is not available. Please update Docker Desktop to the latest version."
    exit 1
}

# Download docker-compose.local.yml
Write-ColorOutput "[4/6] Downloading docker-compose.local.yml..." "Blue"
if (Test-Path "docker-compose.local.yml") {
    Write-Warning-Message "docker-compose.local.yml already exists"
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -eq "y" -or $overwrite -eq "Y") {
        try {
            Invoke-WebRequest -Uri $DockerComposeUrl -OutFile "docker-compose.local.yml"
            Write-Success "Downloaded docker-compose.local.yml"
        } catch {
            Write-Error-Message "Failed to download docker-compose.local.yml: $_"
            exit 1
        }
    } else {
        Write-Info "Keeping existing docker-compose.local.yml"
    }
} else {
    try {
        Invoke-WebRequest -Uri $DockerComposeUrl -OutFile "docker-compose.local.yml"
        Write-Success "Downloaded docker-compose.local.yml"
    } catch {
        Write-Error-Message "Failed to download docker-compose.local.yml: $_"
        exit 1
    }
}

# Download and setup .env.local
Write-ColorOutput "[5/6] Setting up environment file..." "Blue"
if (Test-Path ".env.local") {
    Write-Warning-Message ".env.local already exists"
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -eq "y" -or $overwrite -eq "Y") {
        try {
            Invoke-WebRequest -Uri $EnvFileUrl -OutFile ".env.local"
            Write-Success "Downloaded .env.local"
        } catch {
            Write-Error-Message "Failed to download .env.local: $_"
            exit 1
        }
    } else {
        Write-Info "Keeping existing .env.local"
    }
} else {
    try {
        Invoke-WebRequest -Uri $EnvFileUrl -OutFile ".env.local"
        Write-Success "Created .env.local"
    } catch {
        Write-Error-Message "Failed to download .env.local: $_"
        exit 1
    }
}

# Generate AUTH_SECRET if needed
$envContent = Get-Content ".env.local" -Raw
if ($envContent -match "your-local-development-secret-change-this") {
    Write-Info "Generating secure AUTH_SECRET..."
    try {
        # Generate a random base64 string
        $randomBytes = New-Object byte[] 32
        [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($randomBytes)
        $newSecret = [System.Convert]::ToBase64String($randomBytes)
        
        # Replace in file
        $envContent = $envContent -replace "your-local-development-secret-change-this", $newSecret
        Set-Content ".env.local" -Value $envContent -NoNewline
        Write-Success "Generated secure AUTH_SECRET"
    } catch {
        Write-Warning-Message "Failed to generate AUTH_SECRET. Please manually update it in .env.local"
    }
}

# Start the application
Write-ColorOutput "[6/6] Starting FAIVOR Dashboard..." "Blue"
Write-Host ""
Write-Info "Pulling Docker images (this may take a few minutes on first run)..."
try {
    docker compose -f docker-compose.local.yml pull
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Error-Message "Failed to pull Docker images"
    exit 1
}

Write-Host ""
Write-Info "Starting containers..."
try {
    docker compose -f docker-compose.local.yml up -d
    if ($LASTEXITCODE -ne 0) { throw }
} catch {
    Write-Error-Message "Failed to start containers"
    exit 1
}

Write-Host ""
Write-Success "FAIVOR Dashboard is starting up!"
Write-Host ""
Write-ColorOutput "╔════════════════════════════════════════════════╗" "Green"
Write-ColorOutput "║          Setup Complete!                       ║" "Green"
Write-ColorOutput "╚════════════════════════════════════════════════╝" "Green"
Write-Host ""
Write-ColorOutput "📍 Application URL: " "Cyan" -NoNewline
Write-Host "http://localhost:3000"
Write-Host ""
Write-ColorOutput "⏳ Please wait 10-20 seconds for the application to fully start" "Yellow"
Write-Host ""
Write-ColorOutput "Useful commands:" "Cyan"
Write-Host "  View logs:          " -NoNewline
Write-ColorOutput "docker compose -f docker-compose.local.yml logs -f" "Green"
Write-Host "  Stop application:   " -NoNewline
Write-ColorOutput "docker compose -f docker-compose.local.yml down" "Green"
Write-Host "  Restart:            " -NoNewline
Write-ColorOutput "docker compose -f docker-compose.local.yml restart" "Green"
Write-Host "  View status:        " -NoNewline
Write-ColorOutput "docker compose -f docker-compose.local.yml ps" "Green"
Write-Host ""
Write-ColorOutput "Opening browser in 5 seconds..." "Cyan"

# Wait a bit for services to start
Start-Sleep -Seconds 5

# Open browser
try {
    Start-Process "http://localhost:3000"
} catch {
    Write-Warning-Message "Could not auto-open browser. Please navigate to: http://localhost:3000"
}

Write-Host ""
Write-Success "All done! Enjoy FAIVOR Dashboard! 🎉"
