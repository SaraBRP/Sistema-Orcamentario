export interface ParametroTecnicoItem {
  id: string;
  parametro: string; // Ex: "Área de Superfície", "Altura", "Volume de Concreto"
  sigla: string;     // Ex: "A", "H", "Vc"
  unidade: string;   // Ex: "m²", "m", "m³"
  descricao?: string; // Descrição opcional ou significado (ex: "Área do Banheiro Suíte")
  categoria?: string; // Ex: "Geometria", "Estrutura", "Consumo", "Produtividade", "Outros"
  isCustom?: boolean; // Se foi cadastrado pelo usuário
}
