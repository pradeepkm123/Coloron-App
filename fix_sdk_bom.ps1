$path = 'e:\prd\app\VMS\android\app\src\main\java\com\vms\nvrsdk\NvrSdkModule.java'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$content = Get-Content $path
[System.IO.File]::WriteAllLines($path, $content, $utf8NoBom)
