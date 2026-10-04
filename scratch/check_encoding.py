import glob
import sys

# Force UTF-8 stdout
sys.stdout.reconfigure(encoding='utf-8')

files = glob.glob('scaffold/backend/app/**/*.py', recursive=True)

results = []

for f in files:
    with open(f, 'r', encoding='utf-8', errors='replace') as fp:
        lines = fp.readlines()
    
    for idx, line in enumerate(lines, 1):
        non_ascii = [c for c in line if ord(c) > 127]
        if non_ascii:
            # Check if it contains replacement char \ufffd or weird chars
            results.append((f, idx, line.strip(), set(non_ascii)))

print(f"Scanned {len(files)} files.")
print(f"Found {len(results)} lines with non-ASCII characters:\n")

with open('scratch/non_ascii_report.txt', 'w', encoding='utf-8') as out:
    out.write(f"Scanned {len(files)} files. Found {len(results)} lines with non-ASCII characters:\n\n")
    for f, idx, line, char_set in results:
        char_hex = [f"U+{ord(c):04X} ({c})" for c in char_set]
        msg = f"{f}:{idx}:\n  Content: {line}\n  Chars: {', '.join(char_hex)}\n\n"
        out.write(msg)
        print(f"{f}:{idx}: {line[:80]}...")

print("\nFull report written to scratch/non_ascii_report.txt")
