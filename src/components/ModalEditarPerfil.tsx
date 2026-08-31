import { useState } from 'react';
import { 
  User, 
  Camera, 
  Save, 
  CheckCircle2, 
  Briefcase, 
  Mail, 
  Trash2
} from 'lucide-react';

export interface UserProfileData {
  nome: string;
  email: string;
  funcao: 'Administrador' | 'Gestor' | 'Orçamentista';
  avatarUrl: string;
  permitted_screens?: string[];
}

interface ModalEditarPerfilProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfileData;
  onSaveProfile: (updatedProfile: UserProfileData) => void;
}

export function ModalEditarPerfil({ isOpen, onClose, profile, onSaveProfile }: ModalEditarPerfilProps) {
  const [nome, setNome] = useState(profile.nome || 'Sara');
  const funcao = profile.funcao || 'Orçamentista';
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Por favor, selecione uma imagem de até 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      nome: nome.trim() || 'Sara',
      email: profile.email,
      funcao,
      avatarUrl
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const getIniciais = (nameStr: string) => {
    if (!nameStr) return 'S';
    const parts = nameStr.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-6 shadow-2xl border border-slate-200">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Editar Meu Perfil</h3>
              <p className="text-xs text-slate-500">Atualize seu nome e foto de perfil no OrçaBRP</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Formulário de Edição */}
        <form onSubmit={handleSave} className="space-y-5">
          
          {/* Campo de Foto de Perfil */}
          <div className="flex flex-col items-center justify-center space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="relative group">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Foto do Orçamentista" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white font-extrabold text-2xl flex items-center justify-center shadow-md border-4 border-white">
                  {getIniciais(nome)}
                </div>
              )}

              {/* Botão de Câmera para alterar foto */}
              <label 
                htmlFor="avatar-upload-input"
                className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md cursor-pointer transition-transform hover:scale-110"
                title="Carregar nova foto"
              >
                <Camera className="w-4 h-4" />
                <input 
                  id="avatar-upload-input"
                  type="file" 
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label 
                htmlFor="avatar-upload-input"
                className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer hover:underline"
              >
                {avatarUrl ? 'Alterar foto' : 'Carregar foto de perfil'}
              </label>

              {avatarUrl && (
                <>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remover</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Nome Completo */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Nome Completo do Usuário
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Sara Alves"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all"
            />
          </div>

          {/* Função / Cargo (Somente Leitura) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>Função no Sistema (Cargo)</span>
            </label>
            
            <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${funcao === 'Gestor' ? 'bg-indigo-600' : 'bg-emerald-500'}`}></span>
              <span>{funcao}</span>
            </div>
          </div>

          {/* E-mail (Leitura) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>E-mail da Conta</span>
            </label>
            <input
              type="email"
              disabled
              value={profile.email || 'sara.alves@brpmetalica.com'}
              className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 animate-bounce" />
                  <span>Salvo com Sucesso!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
