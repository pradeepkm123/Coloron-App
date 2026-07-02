Add-Type -AssemblyName System.Drawing
$imgPath = "E:\prd\app\VMS\src\assets\Images\App-Icon.png"
if (-Not (Test-Path $imgPath)) { Write-Host "Image not found"; exit 1 }
$img = [System.Drawing.Image]::FromFile($imgPath)
$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}
foreach ($folder in $sizes.Keys) {
    $size = $sizes[$folder]
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()
    
    $path = "E:\prd\app\VMS\android\app\src\main\res\$folder\ic_launcher.png"
    $roundPath = "E:\prd\app\VMS\android\app\src\main\res\$folder\ic_launcher_round.png"
    
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    
    # Remove webp if exists
    $webpPath = "E:\prd\app\VMS\android\app\src\main\res\$folder\ic_launcher.webp"
    $webpRoundPath = "E:\prd\app\VMS\android\app\src\main\res\$folder\ic_launcher_round.webp"
    if (Test-Path $webpPath) { Remove-Item $webpPath -Force }
    if (Test-Path $webpRoundPath) { Remove-Item $webpRoundPath -Force }
}
$img.Dispose()
Write-Host "Icons generated successfully"
