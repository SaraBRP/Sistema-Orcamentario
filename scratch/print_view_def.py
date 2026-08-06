with open('schema_engenharia.sql', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

start = content.find('CREATE OR REPLACE VIEW engenharia.v_composicoes_cdu')
if start != -1:
    print(content[start:start+1200])
else:
    start_lower = content.lower().find('create or replace view engenharia.v_composicoes_cdu')
    if start_lower != -1:
        print(content[start_lower:start_lower+1200])
    else:
        print("View definition not found in schema_engenharia.sql")
