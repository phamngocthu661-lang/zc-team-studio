Get-Item C:\*.sys -Force -ErrorAction SilentlyContinue | Select-Object Name, Length
Get-ChildItem C:\$Recycle.Bin -Force -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
