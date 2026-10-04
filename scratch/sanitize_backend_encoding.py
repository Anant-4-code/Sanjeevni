import glob

files = glob.glob('scaffold/backend/app/**/*.py', recursive=True)

mojibake_replacements = {
    'Âµ': 'µ',
    'â€”': '—',
    'â€“': '–',
    'â€™': "'",
    'â€œ': '"',
    'â€': '"',
    '102A?AF': '102°F',
    '101.4A?AF': '101.4°F',
    'Sep 10??16': 'Sep 10-16',
}

bom_count = 0
cleaned_count = 0

for filepath in files:
    with open(filepath, 'rb') as fp:
        raw_bytes = fp.read()
    
    # Check for BOM
    has_bom = raw_bytes.startswith(b'\xef\xbb\xbf')
    if has_bom:
        raw_bytes = raw_bytes[3:]
        bom_count += 1
    
    try:
        text = raw_bytes.decode('utf-8')
    except UnicodeDecodeError:
        # If it was saved in cp1252 or iso-8859-1
        text = raw_bytes.decode('cp1252')
    
    modified = False
    for bad, good in mojibake_replacements.items():
        if bad in text:
            text = text.replace(bad, good)
            modified = True
    
    if has_bom or modified:
        with open(filepath, 'w', encoding='utf-8', newline='\n') as fp:
            fp.write(text)
        cleaned_count += 1
        print(f"Sanitized: {filepath} (BOM removed: {has_bom}, Mojibake fixed: {modified})")

print(f"\nProcessing complete. Removed BOM from {bom_count} file(s). Updated {cleaned_count} file(s).")
