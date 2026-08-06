with open('schema_engenharia.sql', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

lines = content.split('\n')
for i, line in enumerate(lines):
    if 'policy' in line.lower() or 'row level security' in line.lower():
        print(f"Line {i+1}: {line}")
