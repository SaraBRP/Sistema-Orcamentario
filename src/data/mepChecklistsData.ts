export interface ItemMepChecklist {
  disciplina: string;
  subsistema: string;
  item: string;
  apoioCivil: string;
  cotacaoDireta: boolean;
}

export type TipologiaMep = 'Hospital' | 'Industrial' | 'Comercial' | 'Hotel' | 'Shopping';

export const MEP_CHECKLISTS_DATA: Record<TipologiaMep, ItemMepChecklist[]> = {
  "Hospital": [
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "",
      "item": "",
      "apoioCivil": "Apoio Civil Associado",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Poste + Kit MT",
      "apoioCivil": "Abertura para chumbamento do poste",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Alimentadores (com infraestrutura) MT",
      "apoioCivil": "Abertura e fechamento de vala para cabos MT",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cabine Primária",
      "apoioCivil": "Envelopamento da Tubulação dos Alimentadores MT",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículo de Entrada de Energia e Medição",
      "apoioCivil": "Canaleta de Concreto com tampa em chapa xadrez para cabos MT",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículo de Proteção",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículos de Distribuição (mesmo nº de transformadores)",
      "apoioCivil": "Escoramento",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "Geradores",
      "apoioCivil": "Base para GMG",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "Transformadores",
      "apoioCivil": "Base para Trafo",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "No Breaks",
      "apoioCivil": "Bases para QGBT's / No Breaks",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "QGBT Normal (ligado a rede da concessionária)",
      "apoioCivil": "Canaleta de Concreto com tampa em chapa xadrez para cabos MT",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "QGBT Emergencial (ligado ao GMG)",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Cabos Alimentadores",
      "apoioCivil": "Valas para eletrodutos enterrados",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Barramentos Blindados",
      "apoioCivil": "Envelopamento da Tubulação dos Alimentadores BT (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Leitos com conexões",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Perfilados",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Painéis de Força (Ressonância, RX, etc.)",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Iluminação e Tomadas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Tomadas Estabilizadas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Ar Condicionado",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Cabos Alimentadores",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Estacionamento",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Áreas Comuns",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Quartos",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias de Emergência",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Cobertura (Gaiola de Faraday)",
      "apoioCivil": "Vala para Aterramento",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Amarração da Ferragem (Garantia de Continuidade para Descidas Estruturais) - por conta do Armador - checar sempre",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Enterrados / Embutidos (descidas e malha de aterramento)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Valas para eletrodutos enterrados",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Envelopamento da Tubulação dos Sistemas Especiais (Apenas onde solicitado)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Equipamentos de Detecção e Alarme de Incêndio",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Equipamentos de Detecção e Alarme de Gás",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "13. Sistema de Chamada de Enfermagem (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "13. Sistema de Chamada de Enfermagem (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "13. Sistema de Chamada de Enfermagem (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "13. Sistema de Chamada de Enfermagem (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "13. Sistema de Chamada de Enfermagem (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "14. IT Médico (Bender)",
      "item": "Transformadores Isoladores",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "14. IT Médico (Bender)",
      "item": "Quadros de Energia",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "14. IT Médico (Bender)",
      "item": "No Breaks dedicados",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "14. IT Médico (Bender)",
      "item": "Anunciadores e Alarmes (DSI e DST)",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Tubos e Conexões",
      "apoioCivil": "Envelopamento de Tubulação (Apenas onde solicitado)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Reservatório",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Tubos e Conexões",
      "apoioCivil": "Abrigo para Cavaletes (Água Fria e Gás GLP)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Aquecimento (Aquecedores / Boiler / Passagem / etc.)",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Aquecimento Solar",
      "apoioCivil": "Escoramento",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Sistema de Bombeamento de Esgoto (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "4. Águas Pluviais",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "4. Águas Pluviais",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "5. Instalação de Gás GLP",
      "item": "Tubos e Conexões (cobre)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "5. Instalação de Gás GLP",
      "item": "Central de Gás (manifolds e cilindros)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Caixas de Hidrante, Válvulas, Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Válvulas, Bicos, Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Sistema de Filtragem/Tratamento",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "12. ETE (esgoto) / ETA (água)",
      "item": "Tubos, interligações e conexões",
      "apoioCivil": "Escavação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "12. ETE (esgoto) / ETA (água)",
      "item": "Sistema de Bombeamento da ETA/ETE",
      "apoioCivil": "Fundação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações de Ar Condicionado",
      "subsistema": "3. Automação Stand Alone",
      "item": "",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Gases Medicinais (Oxigênio, Vácuo, Ar Comprimido, etc)",
      "item": "Tubos e Conexões em cobre",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Gases Medicinais (Oxigênio, Vácuo, Ar Comprimido, etc)",
      "item": "Reguas Medicinais",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Correio Pneumático",
      "item": "Tubos e Conexões em PVC",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Correio Pneumático",
      "item": "Estações de Envio e Recebimento",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Correio Pneumático",
      "item": "Cápsulas de Envio",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Correio Pneumático",
      "item": "Equipamentos para Automação do Sistema",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Equipamentos Passivos de Rede",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Equipamentos Ativos de Rede",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de Automação, Supervisão e Controle",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de Automação, Supervisão e Controle",
      "item": "Equipamentos (Controladoras, Gerenciadoras, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de Automação, Supervisão e Controle",
      "item": "Sistema BMS",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "5. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "5. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes",
      "item": "Equipamentos (Câmeras, Catracas, Cancelas, Softwares, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "6. Sistema de CATV(antena coletiva), SOM",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "6. Sistema de CATV(antena coletiva), SOM",
      "item": "Laços para Sistema de Som",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "6. Sistema de CATV(antena coletiva), SOM",
      "item": "Equipamentos (sonofletores, microfones, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "7. Detecção e Alarme de Incêndio e/ou Gás",
      "item": "Laços",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "7. Detecção e Alarme de Incêndio e/ou Gás",
      "item": "Equipamentos (detectores, módulos, centrais, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "8. Sistema de Chamada de Enfermagem",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "8. Sistema de Chamada de Enfermagem",
      "item": "Equipamentos (Sinalizadores de Paciente / Audio Visuais, Módulos, Centrais, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "9. Blindagem Eletromagnética (Normalmente é do Cliente)",
      "item": "Gaiola de Faraday (Aterramento/Cobre)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "9. Blindagem Eletromagnética (Normalmente é do Cliente)",
      "item": "Gaiola de Radio Freqüência (Fita de Aluminio)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Utilidades",
      "subsistema": "1. Ar Comprimido (Normalmente fornecido pela empresa de Gases Medicinais)",
      "item": "Equipamentos (Compressores, Pulmão, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    }
  ],
  "Industrial": [
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "",
      "item": "",
      "apoioCivil": "Apoio Civil Associado",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Poste + Kit MT",
      "apoioCivil": "Abertura para chumbamento do poste",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Alimentadores (com infraestrutura) MT",
      "apoioCivil": "Abertura e fechamento de vala para cabos MT",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cabine Primária",
      "apoioCivil": "Envelopamento da Tubulação dos Alimentadores MT",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículo de Entrada de Energia e Medição",
      "apoioCivil": "Canaleta de Concreto com tampa em chapa xadrez para cabos MT",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículo de Proteção",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículos de Distribuição (mesmo nº de transformadores)",
      "apoioCivil": "Escoramento",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "Geradores",
      "apoioCivil": "Base para GMG",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "Transformadores",
      "apoioCivil": "Base para Trafo",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "No Breaks",
      "apoioCivil": "Bases para QGBT's / No Breaks",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "QGBT Normal (ligado a rede da concessionária)",
      "apoioCivil": "Canaleta de Concreto com tampa em chapa xadrez para cabos MT",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "QGBT Emergencial (ligado ao GMG)",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Cabos Alimentadores",
      "apoioCivil": "Valas para eletrodutos enterrados",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Barramentos Blindados",
      "apoioCivil": "Envelopamento da Tubulação dos Alimentadores BT (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Leitos com conexões",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Perfilados",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Painéis de Força",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Iluminação e Tomadas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Tomadas Estabilizadas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Ar Condicionado",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Cabos Alimentadores",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Galpões",
      "apoioCivil": "Atenção para Luminárias EXPROOF",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Escritórios",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Externas (Prever Postes onde necessário)",
      "apoioCivil": "Valas para iluminação externa",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias de Emergência",
      "apoioCivil": "Envelopamento da Tubulação de Iluminação Externa (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Cobertura (Gaiola de Faraday)",
      "apoioCivil": "Vala para Aterramento",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Amarração da Ferragem (Garantia de Continuidade para Descidas Estruturais) - por conta do Armador - checar sempre",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Enterrados / Embutidos (descidas e malha de aterramento)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Valas para eletrodutos enterrados",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Envelopamento da Tubulação dos Sistemas Especiais (Apenas onde solicitado)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Equipamentos de Detecção e Alarme de Incêndio",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Equipamentos de Detecção e Alarme de Gás",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Tubos e Conexões",
      "apoioCivil": "Valas para tubos enterrados (Água Fria, Esgoto, incêndio, Utilidades, Irrigação, etc)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Reservatório",
      "apoioCivil": "Envelopamento de Tubulação (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Tubos e Conexões",
      "apoioCivil": "Bases para Bombas e Equipamentos",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Aquecimento (Aquecedores / Boiler / Passagem / etc.)",
      "apoioCivil": "Abrigo para Cavaletes (Água Fria, Gás GLP e Gás Industrial)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Aquecimento Solar",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "Escoramento",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Sistema de Bombeamento de Esgoto (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Sistema de Esgoto a Vácuo",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "4. Águas Pluviais",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "4. Águas Pluviais",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "5. Instalação de Gás GLP",
      "item": "Tubos e Conexões (cobre)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "5. Instalação de Gás GLP",
      "item": "Central de Gás (manifolds e cilindros)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Caixas de Hidrante, Válvulas, Tubos e Conexões",
      "apoioCivil": "A altura máxima da cumeeira da edificação não deverá exceder 13,70m com uma altura máxima de estocagem de 12,20m conforme determinação da NFPA13, caso ultrapasse essa altura o Sprinkler tende a ficar muito mais caro",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Reservatório",
      "apoioCivil": "Para estimativas e conferências utilizar  xxxxx unidades /m2",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Válvulas, Bicos, Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Sistema de Filtragem/Tratamento",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "12. ETE (esgoto) / ETA (água)",
      "item": "Tubos, interligações e conexões",
      "apoioCivil": "Escavação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "12. ETE (esgoto) / ETA (água)",
      "item": "Sistema de Bombeamento da ETA/ETE",
      "apoioCivil": "Fundação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "13. Sistema de Ar Comprimido (Apenas Infraestrutura)",
      "item": "Tubos em Aço Carbono com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "13. Sistema de Ar Comprimido (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "13. Sistema de Ar Comprimido (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "14. Sistema de Gases Industriais (Apenas Infraestrutura)",
      "item": "Tubos em cobre classe A com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "14. Sistema de Gases Industriais (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "14. Sistema de Gases Industriais (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "15. Sistema de Água Tratada/Industrial/Purificada (Apenas Infraestrutura)",
      "item": "Tubos em Aço Carbono com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "15. Sistema de Água Tratada/Industrial/Purificada (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "15. Sistema de Água Tratada/Industrial/Purificada (Apenas Infraestrutura)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "15. Sistema de Água Tratada/Industrial/Purificada (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "16. Sistema de Esgoto Industrial",
      "item": "Tubos em aluminio com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "16. Sistema de Esgoto Industrial",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "16. Sistema de Esgoto Industrial",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Equipamentos Passivos de Rede",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Equipamentos Ativos de Rede",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Equipamentos (Controladoras, Gerenciadoras, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Sistema BMS",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes",
      "item": "Cablagem e Terminações",
      "apoioCivil": "Atenção para Retrofits, precisamos saber qual a central existente",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes",
      "item": "Equipamentos (Câmeras, Catracas, Cancelas, Softwares, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Laços para Sistema de Som",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Equipamentos (sonofletores, microfones, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "5. Detecção e Alarme de Incêndio e/ou Gás",
      "item": "Laços",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "5. Detecção e Alarme de Incêndio e/ou Gás",
      "item": "Equipamentos (detectores, módulos, centrais, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Utilidades",
      "subsistema": "1. Ar Comprimido",
      "item": "Equipamentos (Compressores, Pulmão, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Utilidades",
      "subsistema": "2. Gases Industriais",
      "item": "Central de Gases (Manifold, Cavalete, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Utilidades",
      "subsistema": "2. Gases Industriais",
      "item": "Tanques (Cilindros) de Gás - Normalmente Comodato",
      "apoioCivil": "",
      "cotacaoDireta": false
    }
  ],
  "Comercial": [
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "",
      "item": "",
      "apoioCivil": "Apoio Civil Associado",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Poste + Kit MT",
      "apoioCivil": "Abertura para chumbamento do poste",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Alimentadores (com infraestrutura) MT",
      "apoioCivil": "Abertura e fechamento de vala para cabos MT",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cabine Primária",
      "apoioCivil": "Envelopamento da Tubulação dos Alimentadores MT",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículo de Entrada de Energia e Medição",
      "apoioCivil": "Canaleta de Concreto com tampa em chapa xadrez para cabos MT",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículo de Proteção",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículos de Distribuição (mesmo nº de transformadores)",
      "apoioCivil": "Escoramento",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "Geradores",
      "apoioCivil": "Base para GMG",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "Transformadores",
      "apoioCivil": "Base para Trafo",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "No Breaks",
      "apoioCivil": "Bases para QGBT's / No Breaks",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "QGBT Normal (ligado a rede da concessionária)",
      "apoioCivil": "Canaleta de Concreto com tampa em chapa xadrez para cabos MT",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "QGBT Emergencial (ligado ao GMG)",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Cabos Alimentadores",
      "apoioCivil": "Valas para eletrodutos enterrados",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Barramentos Blindados",
      "apoioCivil": "Envelopamento da Tubulação dos Alimentadores BT (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Leitos com conexões",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Perfilados",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Painéis de Força",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Iluminação e Tomadas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Tomadas Estabilizadas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Ar Condicionado",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Cabos Alimentadores",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Fachada",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Escritórios/Salas/Lojas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Externas (Prever Postes onde necessário)",
      "apoioCivil": "Valas para iluminação externa",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias de Emergência",
      "apoioCivil": "Envelopamento da Tubulação de Iluminação Externa (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Cobertura (Gaiola de Faraday)",
      "apoioCivil": "Vala para Aterramento",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Amarração da Ferragem (Garantia de Continuidade para Descidas Estruturais) - por conta do Armador - checar sempre",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Enterrados / Embutidos (descidas e malha de aterramento)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Valas para eletrodutos enterrados",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Envelopamento da Tubulação dos Sistemas Especiais (Apenas onde solicitado)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Equipamentos de Detecção e Alarme de Incêndio",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Equipamentos de Detecção e Alarme de Gás",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Tubos e Conexões",
      "apoioCivil": "Valas para tubos enterrados (Água Fria, Esgoto, incêndio, Utilidades, Irrigação, etc)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Reservatório",
      "apoioCivil": "Envelopamento de Tubulação (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Tubos e Conexões",
      "apoioCivil": "Bases para Bombas e Equipamentos",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Aquecimento (Aquecedores / Boiler / Passagem / etc.)",
      "apoioCivil": "Abrigo para Cavaletes (Água Fria, Gás GLP e Gás Industrial)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Aquecimento Solar",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "Escoramento",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Sistema de Bombeamento de Esgoto (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "4. Águas Pluviais",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "4. Águas Pluviais",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "5. Instalação de Gás GLP",
      "item": "Tubos e Conexões (cobre)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "5. Instalação de Gás GLP",
      "item": "Central de Gás (manifolds e cilindros)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Caixas de Hidrante, Válvulas, Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Válvulas, Bicos, Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Sistema de Filtragem/Tratamento",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "11. ETE (esgoto) / ETA (água)",
      "item": "Tubos, interligações e conexões",
      "apoioCivil": "Escavação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "11. ETE (esgoto) / ETA (água)",
      "item": "Sistema de Bombeamento da ETA/ETE",
      "apoioCivil": "Fundação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações de Ar Condicionado",
      "subsistema": "13. Sistema de Irrigação",
      "item": "",
      "apoioCivil": "Plataformas Metálicas (em caso de Cobertura)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Equipamentos Passivos de Rede",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Equipamentos Ativos de Rede",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Equipamentos (Controladoras, Gerenciadoras, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Sistema BMS",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes",
      "item": "Equipamentos (Câmeras, Catracas, Cancelas, Softwares, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Laços para Sistema de Som",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Equipamentos (sonofletores, microfones, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "5. Detecção e Alarme de Incêndio e/ou Gás",
      "item": "Laços",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "5. Detecção e Alarme de Incêndio e/ou Gás",
      "item": "Equipamentos (detectores, módulos, centrais, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    }
  ],
  "Hotel": [
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "",
      "item": "",
      "apoioCivil": "Apoio Civil Associado",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Poste + Kit MT",
      "apoioCivil": "Abertura para chumbamento do poste",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Alimentadores (com infraestrutura) MT",
      "apoioCivil": "Abertura e fechamento de vala para cabos MT",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cabine Primária",
      "apoioCivil": "Envelopamento da Tubulação dos Alimentadores MT",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículo de Entrada de Energia e Medição",
      "apoioCivil": "Canaleta de Concreto com tampa em chapa xadrez para cabos MT",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículo de Proteção",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículos de Distribuição (mesmo nº de transformadores)",
      "apoioCivil": "Escoramento",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "Geradores",
      "apoioCivil": "Base para GMG",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "Transformadores",
      "apoioCivil": "Base para Trafo",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "No Breaks",
      "apoioCivil": "Bases para QGBT's / No Breaks",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "QGBT Normal (ligado a rede da concessionária)",
      "apoioCivil": "Canaleta de Concreto com tampa em chapa xadrez para cabos MT",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "QGBT Emergencial (ligado ao GMG)",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Cabos Alimentadores",
      "apoioCivil": "Valas para eletrodutos enterrados",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Barramentos Blindados",
      "apoioCivil": "Envelopamento da Tubulação dos Alimentadores BT (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Leitos com conexões",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Perfilados",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Painéis de Força",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Iluminação e Tomadas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Tomadas Estabilizadas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Ar Condicionado",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Cabos Alimentadores",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Fachada",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Quartos/Bangalôs/Suites",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Área Administrativa",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Externas (Prever Postes onde necessário)",
      "apoioCivil": "Valas para iluminação externa",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias de Emergência",
      "apoioCivil": "Envelopamento da Tubulação de Iluminação Externa (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Cobertura (Gaiola de Faraday)",
      "apoioCivil": "Vala para Aterramento",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Amarração da Ferragem (Garantia de Continuidade para Descidas Estruturais) - por conta do Armador - checar sempre",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Enterrados / Embutidos (descidas e malha de aterramento)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Valas para eletrodutos enterrados",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Envelopamento da Tubulação dos Sistemas Especiais (Apenas onde solicitado)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Equipamentos de Detecção e Alarme de Incêndio",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Equipamentos de Detecção e Alarme de Gás",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "13. Sistema Inteligente para Desligamento de Energia (quartos)",
      "item": "Sistema de Automação no Quadro de Energia do Quadro de Energia",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "13. Sistema Inteligente para Desligamento de Energia (quartos)",
      "item": "Cartões de Proximidade",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Tubos e Conexões",
      "apoioCivil": "Valas para tubos enterrados (Água Fria, Esgoto, incêndio, Utilidades, Irrigação, etc)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Reservatório",
      "apoioCivil": "Envelopamento de Tubulação (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Tubos e Conexões",
      "apoioCivil": "Bases para Bombas e Equipamentos",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Aquecimento (Aquecedores / Boiler / Passagem / etc.)",
      "apoioCivil": "Abrigo para Cavaletes (Água Fria, Gás GLP e Gás Industrial)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Aquecimento Solar",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "Escoramento",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Sistema de Bombeamento de Esgoto (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "4. Águas Pluviais",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "4. Águas Pluviais",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "5. Instalação de Gás GLP",
      "item": "Tubos e Conexões (cobre)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "5. Instalação de Gás GLP",
      "item": "Central de Gás (manifolds e cilindros)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Caixas de Hidrante, Válvulas, Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Válvulas, Bicos, Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Sistema de Filtragem/Tratamento",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "11. ETE (esgoto) / ETA (água)",
      "item": "Tubos, interligações e conexões",
      "apoioCivil": "Escavação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "11. ETE (esgoto) / ETA (água)",
      "item": "Sistema de Bombeamento da ETA/ETE",
      "apoioCivil": "Fundação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "12. Piscina",
      "item": "Tubos, interligações e conexões",
      "apoioCivil": "Escavação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "12. Piscina",
      "item": "Sistema de Filtragem/Tratamento",
      "apoioCivil": "Fundação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "12. Piscina",
      "item": "Sistema de Bombeamento da Piscina",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações de Ar Condicionado",
      "subsistema": "15. Dreno de Ar Condicionado",
      "item": "",
      "apoioCivil": "Plataformas Metálicas (em caso de Cobertura)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Equipamentos Passivos de Rede",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Equipamentos Ativos de Rede",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Equipamentos (Controladoras, Gerenciadoras, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Sistema BMS",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes",
      "item": "Equipamentos (Câmeras, Catracas, Cancelas, Softwares, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Laços para Sistema de Som",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Equipamentos (sonofletores, microfones, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "5. Detecção e Alarme de Incêndio e/ou Gás",
      "item": "Laços",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "5. Detecção e Alarme de Incêndio e/ou Gás",
      "item": "Equipamentos (detectores, módulos, centrais, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    }
  ],
  "Shopping": [
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "",
      "item": "",
      "apoioCivil": "Apoio Civil Associado",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Poste + Kit MT",
      "apoioCivil": "Abertura para chumbamento do poste",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Alimentadores (com infraestrutura) MT",
      "apoioCivil": "Abertura e fechamento de vala para cabos MT",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cabine Primária",
      "apoioCivil": "Envelopamento da Tubulação dos Alimentadores MT",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículo de Entrada de Energia e Medição",
      "apoioCivil": "Canaleta de Concreto com tampa em chapa xadrez para cabos MT",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículo de Proteção",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "1. Entrada de Energia MT (Medição e Distribuição)",
      "item": "Cubículos de Distribuição (mesmo nº de transformadores)",
      "apoioCivil": "Escoramento",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "Geradores",
      "apoioCivil": "Base para GMG",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "Transformadores",
      "apoioCivil": "Base para Trafo",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "No Breaks",
      "apoioCivil": "Bases para QGBT's / No Breaks",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "QGBT Normal (ligado a rede da concessionária)",
      "apoioCivil": "Canaleta de Concreto com tampa em chapa xadrez para cabos MT",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "2. Subestações e Equipamentos",
      "item": "QGBT Emergencial (ligado ao GMG)",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Cabos Alimentadores",
      "apoioCivil": "Valas para eletrodutos enterrados",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Barramentos Blindados",
      "apoioCivil": "Envelopamento da Tubulação dos Alimentadores BT (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Leitos com conexões",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Perfilados",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "3. Alimentadores",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Painéis de Força",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Iluminação e Tomadas (Checar se quadros de energia para lojistas é do escopo da Construtora)",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Tomadas Estabilizadas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "4. Quadros / Painéis (Checar se quadros são TTA ou PTTA)",
      "item": "Paineis de Ar Condicionado",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Cabos Alimentadores",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "5. Iluminação e Tomadas",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Estacionamentos",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Mall",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Áreas Administrativas",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Lojas (Checar se é escopo da construtora)",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias Externas (Prever Postes onde necessário)",
      "apoioCivil": "Valas para iluminação externa",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "6. Luminárias",
      "item": "Luminárias de Emergência",
      "apoioCivil": "Envelopamento da Tubulação de Iluminação Externa (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Cobertura (Gaiola de Faraday)",
      "apoioCivil": "Vala para Aterramento",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Amarração da Ferragem (Garantia de Continuidade para Descidas Estruturais) - por conta do Armador - checar sempre",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "7. SPDA",
      "item": "Enterrados / Embutidos (descidas e malha de aterramento)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "Valas para eletrodutos enterrados",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "Envelopamento da Tubulação dos Sistemas Especiais (Apenas onde solicitado)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "8. Sistema de Telefonia e Lógica - Cabeamento Estruturado (Apenas Infraestrutura)",
      "item": "",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "9. Sistema de Automação, Supervisão e Controle (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "10. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Eletrocalhas com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Perfilados",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Acabamentos",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "11. Sistema de CATV(antena coletiva), SOM - (Apenas Infraestrutura)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Eletrodutos com conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Suportes e Miudezas",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Equipamentos de Detecção e Alarme de Incêndio",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Elétricas",
      "subsistema": "12. Detecção e Alarme de Incêndio e/ou Gás (SDAI e/ou SDAG)",
      "item": "Equipamentos de Detecção e Alarme de Gás",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Tubos e Conexões",
      "apoioCivil": "Valas para tubos enterrados (Água Fria, Esgoto, incêndio, Utilidades, Irrigação, etc)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Reservatório",
      "apoioCivil": "Envelopamento de Tubulação (Apenas onde solicitado)",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "Furos em lajes",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "1. Água Fria",
      "item": "",
      "apoioCivil": "Furos em vigas",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Tubos e Conexões",
      "apoioCivil": "Bases para Bombas e Equipamentos",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Aquecimento (Aquecedores / Boiler / Passagem / etc.)",
      "apoioCivil": "Abrigo para Cavaletes (Água Fria, Gás GLP e Gás Industrial)",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Aquecimento Solar",
      "apoioCivil": "Caixas de Passagem",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "2. Água Quente",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "Escoramento",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "3. Esgoto e Ventilação",
      "item": "Sistema de Bombeamento de Esgoto (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "4. Águas Pluviais",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "4. Águas Pluviais",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "5. Instalação de Gás GLP",
      "item": "Tubos e Conexões (cobre)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "5. Instalação de Gás GLP",
      "item": "Central de Gás (manifolds e cilindros)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Caixas de Hidrante, Válvulas, Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "6. Rede de Hidrantes (Checar se sistema é FM Global)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Válvulas, Bicos, Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "7. Rede de Sprinklers (Checar se sistema é FM Global)",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Tubos e Conexões",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Sistema de Bombeamento de Água (Bombas e infraestrutura)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Sistema de Filtragem/Tratamento",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "9. Água de Reuso",
      "item": "Reservatório",
      "apoioCivil": "",
      "cotacaoDireta": true
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "12. ETE (esgoto) / ETA (água)",
      "item": "Tubos, interligações e conexões",
      "apoioCivil": "Escavação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações Hidráulicas",
      "subsistema": "12. ETE (esgoto) / ETA (água)",
      "item": "Sistema de Bombeamento da ETA/ETE",
      "apoioCivil": "Fundação",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações de Ar Condicionado",
      "subsistema": "14. Sistema de Irrigação",
      "item": "",
      "apoioCivil": "Bases para Equipamentos",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Instalações de Ar Condicionado",
      "subsistema": "3. Automação Stand Alone",
      "item": "",
      "apoioCivil": "Rasgos em paredes com recomposição",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Equipamentos Passivos de Rede",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "1. Sistema de Telefonia e Lógica - Cabeamento Estruturado",
      "item": "Equipamentos Ativos de Rede",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Medidores de Energia / Água / Gás para rateio",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Equipamentos (Controladoras, Gerenciadoras, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "2. Sistema de Automação, Supervisão e Controle",
      "item": "Sistema BMS",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "3. Sistema de Segurança - CFTV, Controle de Acesso e Alarmes",
      "item": "Equipamentos (Câmeras, Catracas, Cancelas, Softwares, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Cablagem e Terminações",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Laços para Sistema de Som",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "4. Sistema de CATV(antena coletiva), SOM",
      "item": "Equipamentos (sonofletores, microfones, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "5. Detecção e Alarme de Incêndio e/ou Gás",
      "item": "Laços",
      "apoioCivil": "",
      "cotacaoDireta": false
    },
    {
      "disciplina": "Sistemas Especiais",
      "subsistema": "5. Detecção e Alarme de Incêndio e/ou Gás",
      "item": "Equipamentos (detectores, módulos, centrais, etc)",
      "apoioCivil": "",
      "cotacaoDireta": false
    }
  ]
};