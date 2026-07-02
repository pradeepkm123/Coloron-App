Add-Type -AssemblyName System.Drawing
$imgPath = "E:\prd\app\VMS\src\assets\Images\App-Icon.png"
$img = [System.Drawing.Image]::FromFile($imgPath)
$bmp = New-Object System.Drawing.Bitmap($img)
# Sample a few pixels to find a good background color
$color1 = $bmp.GetPixel(5, 5) # Top left might be transparent if rounded corners
$color2 = $bmp.GetPixel($bmp.Width / 2, 5) # Top middle is likely solid red
$color3 = $bmp.GetPixel($bmp.Width / 2, $bmp.Height - 5) # Bottom middle
Write-Host "Color1: $($color1.R), $($color1.G), $($color1.B), $($color1.A)"
Write-Host "Color2: $($color2.R), $($color2.G), $($color2.B), $($color2.A)"
Write-Host "Color3: $($color3.R), $($color3.G), $($color3.B), $($color3.A)"
$bmp.Dispose()
$img.Dispose()
