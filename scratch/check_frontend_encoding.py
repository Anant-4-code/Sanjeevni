import glob

extensions = ['tsx', 'ts', 'jsx', 'js', 'css']
files = []
for ext in extensions:
    files.extend(glob.glob(f'scaffold/frontend/apps/patient/src/**/*.{ext}', recursive=True))

results = []

for f in files:
    with open(f, 'rb') as fp:
        raw = fp.read()
    
    try:
        text = raw.decode('utf-8')
    except UnicodeDecodeError as e:
        results.append(f"{f}: Invalid UTF-8 bytes: {e}")
        continue
    
    lines = text.splitlines()
    for idx, line in enumerate(lines, 1):
        if any(bad in line for bad in ['Â', 'â', 'Ã', 'ï¿½', '??', '102A', 'ÂµL', 'â€”', 'Â·', 'â–']):
            results.append(f"{f}:{idx}: {line.strip()}")

print(f"Scanned {len(files)} frontend files.")
if results:
    print(f"Found {len(results)} potential issues:")
    for r in results:
        print(r)
else:
    print("Clean! No mojibake or double-encoding issues found in frontend files.")
