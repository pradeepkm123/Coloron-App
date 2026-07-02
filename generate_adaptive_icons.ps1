Add-Type -AssemblyName System.Drawing
$imgPath = "E:\prd\app\VMS\src\assets\Images\App-Icon.png"
if (-Not (Test-Path $imgPath)) { Write-Host "Image not found"; exit 1 }
$img = [System.Drawing.Image]::FromFile($imgPath)

$sizes = @{
    "mipmap-mdpi" = 108
    "mipmap-hdpi" = 162
    "mipmap-xhdpi" = 216
    "mipmap-xxhdpi" = 324
    "mipmap-xxxhdpi" = 432
}

foreach ($folder in $sizes.Keys) {
    $size = $sizes[$folder]
    $safeSize = [int]($size * 72 / 108)
    $offset = [int](($size - $safeSize) / 2)
    
    # 1. Generate Foreground
    $bmpFg = New-Object System.Drawing.Bitmap($size, $size)
    $gFg = [System.Drawing.Graphics]::FromImage($bmpFg)
    $gFg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gFg.Clear([System.Drawing.Color]::Transparent)
    $gFg.DrawImage($img, $offset, $offset, $safeSize, $safeSize)
    $gFg.Dispose()
    
    # 2. Generate Background
    $bmpBg = New-Object System.Drawing.Bitmap($size, $size)
    $gBg = [System.Drawing.Graphics]::FromImage($bmpBg)
    $gBg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    # Fill with a solid red to prevent any transparent gaps just in case
    $gBg.Clear([System.Drawing.Color]::FromArgb(255, 180, 40, 40))
    $gBg.DrawImage($img, 0, 0, $size, $size)
    $gBg.Dispose()
    
    $fgPath = "E:\prd\app\VMS\android\app\src\main\res\$folder\ic_launcher_foreground.png"
    $bgPath = "E:\prd\app\VMS\android\app\src\main\res\$folder\ic_launcher_background.png"
    
    if (!(Test-Path "E:\prd\app\VMS\android\app\src\main\res\$folder")) {
        New-Item -ItemType Directory -Force -Path "E:\prd\app\VMS\android\app\src\main\res\$folder"
    }
    
    $bmpFg.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpBg.Save($bgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpFg.Dispose()
    $bmpBg.Dispose()
    
    # Let's also regenerate the legacy icons just in case they were messed up
    # Legacy icons are 48, 72, 96, 144, 192
    $legacySize = [int]($size * 48 / 108)
    $bmpLegacy = New-Object System.Drawing.Bitmap($legacySize, $legacySize)
    $gLegacy = [System.Drawing.Graphics]::FromImage($bmpLegacy)
    $gLegacy.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gLegacy.DrawImage($img, 0, 0, $legacySize, $legacySize)
    $gLegacy.Dispose()
    
    $legacyPath = "E:\prd\app\VMS\android\app\src\main\res\$folder\ic_launcher.png"
    $legacyRoundPath = "E:\prd\app\VMS\android\app\src\main\res\$folder\ic_launcher_round.png"
    $bmpLegacy.Save($legacyPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpLegacy.Save($legacyRoundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmpLegacy.Dispose()
}
$img.Dispose()
Write-Host "Adaptive and legacy icons generated successfully."
