import ctypes
import json
import urllib.request

free_b = ctypes.c_ulonglong()
total_b = ctypes.c_ulonglong()
total_free_b = ctypes.c_ulonglong()

ctypes.windll.kernel32.GetDiskFreeSpaceExW(
    'C:\\',
    ctypes.byref(free_b),
    ctypes.byref(total_b),
    ctypes.byref(total_free_b)
)

os_total = total_b.value
os_avail = free_b.value
os_used = os_total - os_avail
os_pct = round((os_used / os_total) * 100.0, 2)

res = json.loads(urllib.request.urlopen('http://127.0.0.1:5000/api/v1/storage').read())
primary = res['primary']

print('==================================================')
print(' STORAGE CAPACITY & USAGE VERIFICATION')
print('==================================================')
print(f'OS Direct (Kernel32): Total={os_total / (1024**3):.1f} GB, Used={os_used / (1024**3):.1f} GB, Free={os_avail / (1024**3):.1f} GB, Percent={os_pct}%')
print(f'Backend API (/storage): Total={primary["total_gb"]} GB, Used={primary["used_gb"]} GB, Free={primary["free_gb"]} GB, Percent={primary["percent"]}%')
print(f'Drive Label:          {primary["label"]} ({primary["drive"]})')
print(f'File System:          {primary["fs"]} ({primary["drive_type"]})')

assert abs(primary['total_gb'] - round(os_total / (1024**3), 1)) < 0.1
assert abs(primary['used_gb'] - round(os_used / (1024**3), 1)) < 0.2
assert abs(primary['percent'] - os_pct) < 0.1
print('==================================================')
print('SUCCESS: Backend and OS storage calculations match identically.')

