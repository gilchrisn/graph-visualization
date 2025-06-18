

# Define the base directory name
$baseDir = "src"

# Remove existing 'src' directory if it exists to ensure a clean build for the new structure
if (Test-Path $baseDir) {
    Write-Host "Removing existing '$baseDir' directory for a clean build..."
    Remove-Item -Path $baseDir -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
}

# Create the base directory
Write-Host "Creating base directory: $baseDir"
New-Item -ItemType Directory -Path $baseDir -ErrorAction SilentlyContinue | Out-Null

# Define the subdirectories to create, relative to the base directory
$subdirectories = @(
    "core",
    "algorithms",
    "modes",
    "visualization",
    "components/FileUpload",
    "components/Controls",
    "components/Navigation",
    "components/NodeInfo",
    "components/Layout",
    "context", # Keep context folder for deprecation note, even if its file is removed
    "services", # Keep services folder for compatibility
    "utils"
)

# Loop through and create each subdirectory
foreach ($dir in $subdirectories) {
    $fullPath = Join-Path $baseDir $dir
    Write-Host "Creating directory: $fullPath"
    New-Item -ItemType Directory -Path $fullPath -ErrorAction SilentlyContinue | Out-Null
}

# Define the specific files to create as empty files
$filesToCreate = @(
    # Core system interfaces
    "core/DataService.js",
    "core/AlgorithmRegistry.js",
    "core/VisualizationEngine.js",
    "core/AppStateManager.js",

    # Algorithm implementations
    "algorithms/BaseAlgorithm.js",
    "algorithms/HomogeneousAlgorithm.js",
    "algorithms/HeterogeneousAlgorithm.js",
    "algorithms/ScarAlgorithm.js",
    "algorithms/ComparisonEngine.js",

    # Application modes
    "modes/ModeContainer.js",
    "modes/SingleModeView.js",
    "modes/ComparisonModeView.js",

    # Visualization layer
    "visualization/CytoscapeContainer.js",
    "visualization/LayoutManager.js",
    "visualization/InteractionHandler.js",
    "visualization/ElementTransformer.js",

    # UI Components
    "components/FileUpload/FileUpload.js",
    "components/Controls/ParameterPanel.js",
    "components/Controls/VisualizationControls.js",
    "components/Navigation/BreadcrumbNav.js",
    "components/NodeInfo/NodeInfoPanel.js",
    "components/Layout/Header.js",

    # Legacy Services (kept for compatibility)
    "services/api.js",

    # Utilities
    "utils/cytoscapeConfig.js",
    "utils/dataTransformers.js",
    "utils/structureAwareFisheye.js",

    # App entry point
    "App.js"
)

# Loop through and create each file
foreach ($file in $filesToCreate) {
    $fullFilePath = Join-Path $baseDir $file
    Write-Host "Creating empty file: $fullFilePath"
    New-Item -ItemType File -Path $fullFilePath -ErrorAction SilentlyContinue | Out-Null
}

Write-Host "Directory structure and empty files created successfully based on the new specification!"
Write-Host "You can now navigate into the '$baseDir' directory and start developing."
