$path = 'e:\prd\app\VMS\android\app\src\main\java\com\vms\nvrsdk\NvrSdkModule.java'
$c = Get-Content $path
$keep = $c[0..1704]
$tail = $c[1720..($c.Length-1)]
($keep + $tail) | Set-Content $path -Encoding utf8
