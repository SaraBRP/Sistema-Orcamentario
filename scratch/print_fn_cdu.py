with open('schema_engenharia.sql', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

start = content.find('CREATE OR REPLACE FUNCTION engenharia.fn_calcular_cdu_composicao')
if start != -1:
    print(content[start:start+1800])
else:
    start_lower = content.lower().find('create or replace function engenharia.fn_calcular_cdu_composicao')
    if start_lower != -1:
        print(content[start_lower:start_lower+1800])
    else:
        print("Function definition not found in schema_engenharia.sql")
