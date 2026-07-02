Add-Type -AssemblyName System.Drawing
$imgPath = "E:\prd\app\VMS\src\assets\Images\App-Icon.png"
if (-Not (Test-Path $imgPath)) { Write-Host "Image not found"; exit 1 }
$img = [System.Drawing.Image]::FromFile($imgPath)

# Sizes for ic_launcher_foreground (108dp based)
$sizes = @{
    "mipmap-mdpi" = 108
    "mipmap-hdpi" = 162
    "mipmap-xhdpi" = 216
    "mipmap-xxhdpi" = 324
    "mipmap-xxxhdpi" = 432
}
foreach ($folder in $sizes.Keys) {
    $size = $sizes[$folder]
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # We want to fill the adaptive icon. Since the visible safe zone is 72dp out of 108dp,
    # if the original image has no padding, we should scale it so it fills the 108dp.
    # Actually, if we draw it at 0,0 with $size, $size, it covers the entire 108dp background.
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()
    
    $path = "E:\prd\app\VMS\android\app\src\main\res\$folder\ic_launcher_foreground.png"
    
    # Ensure directory exists just in case
    if (!(Test-Path "E:\prd\app\VMS\android\app\src\main\res\$folder")) {
        New-Item -ItemType Directory -Force -Path "E:\prd\app\VMS\android\app\src\main\res\$folder"
    }
    
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}
$img.Dispose()
Write-Host "Foreground Icons generated successfully"
