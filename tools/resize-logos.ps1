# Downscales the 4096x4096 ATAI logo PNGs into web-sized copies for this project.
# Originals in ATAIHQ-WEBSITE\images are not modified.

Add-Type -AssemblyName System.Drawing

$srcDir = "C:\Users\lapto\OneDrive\Desktop\ATAIHQ-WEBSITE\images"
$dstDir = "C:\Users\lapto\OneDrive\Desktop\PROJECTS PERSONAL\ATAIHQ-LANDING-V2\images"

New-Item -ItemType Directory -Force $dstDir | Out-Null

function Resize-Png {
    param([string]$Source, [string]$Destination, [int]$Size)

    $img = [System.Drawing.Image]::FromFile($Source)
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $Size, $Size)
    $g.Dispose()
    $img.Dispose()
    $bmp.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# Favicon: 180px covers favicon + apple-touch-icon duty
Resize-Png "$srcDir\ATAI-A-logo-trans.png" "$dstDir\ATAI-A-logo-trans.png" 180

# Navbar logo: 256px gives retina headroom at ~32px display height
Resize-Png "$srcDir\ATAI-logo-trans.png" "$dstDir\ATAI-logo-trans.png" 256

Get-ChildItem $dstDir | Select-Object Name, Length
