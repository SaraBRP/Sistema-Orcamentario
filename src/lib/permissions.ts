export const ALL_MODULE_IDS = [
  'dashboard',
  'orcamentos',
  'banco-proprio',
  'banco-sistema',
  'curva-abc',
  'cotacoes',
  'fluxo-aprovacao',
  'padroes-tecnicos',
  'relatorios',
  'aprendizado',
  'configuracoes'
];

export const getDefaultPermittedScreens = (cargo?: string | null, email?: string | null): string[] => {
  const emailLower = (email || '').trim().toLowerCase();
  const cargoLower = (cargo || '').trim().toLowerCase();

  // Sara / Criadora / Administrador sempre possui acesso irrestrito a todos os módulos
  if (emailLower === 'sara.alves@brpmetalica.com' || emailLower.includes('sara.alves') || cargoLower === 'administrador') {
    return [...ALL_MODULE_IDS];
  }

  // Gestor possui acesso padrão a todos os módulos
  if (cargoLower === 'gestor') {
    return [...ALL_MODULE_IDS];
  }

  // Orçamentista possui acesso padrão a módulos operacionais (sem Configurações e sem Fluxo de Aprovação a menos que concedidos)
  return [
    'dashboard',
    'orcamentos',
    'banco-proprio',
    'banco-sistema',
    'curva-abc',
    'cotacoes',
    'padroes-tecnicos',
    'relatorios',
    'aprendizado'
  ];
};

export const getUserSavedPermissions = (email: string, cargo?: string | null): string[] => {
  if (!email) return getDefaultPermittedScreens(cargo, email);

  const lowerEmail = email.trim().toLowerCase();

  // 1. Tenta carregar do chaveamento direto por email em localStorage
  try {
    const saved = localStorage.getItem(`brp_user_permissions_${lowerEmail}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // 2. Tenta carregar das solicitações registradas em localStorage
  try {
    const savedList = localStorage.getItem('brp_solicitacoes_cadastro_usuarios');
    if (savedList) {
      const list = JSON.parse(savedList);
      const match = list.find((s: any) => s.email && s.email.toLowerCase() === lowerEmail);
      if (match && Array.isArray(match.permitted_screens) && match.permitted_screens.length > 0) {
        return match.permitted_screens;
      }
    }
  } catch {}

  return getDefaultPermittedScreens(cargo, email);
};

export const saveUserPermissionsLocally = (email: string, permitted_screens: string[]) => {
  if (!email) return;
  const lowerEmail = email.trim().toLowerCase();
  localStorage.setItem(`brp_user_permissions_${lowerEmail}`, JSON.stringify(permitted_screens));
};
