import { useState, useEffect, useCallback } from 'react';
import { X, Save, Database, Building2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

type InsumoFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  insumoToEdit: any | null;
  isCopyMode?: boolean;
  onSuccess: () => void;
  bancoProprio?: boolean;
};

const TIPOS_INSUMO = [
  'Equipamento',
  'Equipamento para Aquisição Permanente',
  'Mão de Obra',
  'Material',
  'Taxas',
  'Administração',
  'Aluguel',
  'Verba',
  'Transporte e Logística',
  'Outros'
];

const FONTES_PROPRIO = ['Cotação', 'Histórico'];

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const UNIDADES = ['un', 'm', 'm²', 'm³', 'kg', 't', 'L', 'h', 'cj', 'vb', 'gl', 'cx', 'sc', 'pr', 'km', 'mes', 'dia'];

// Componente de campo monetário formatado
const CurrencyInput = ({ value, onChange, name, className }: any) => {
  const displayValue = (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (!raw) raw = '0';
    const num = parseInt(raw, 10) / 100;
    onChange({ target: { name, value: num, type: 'currency' } } as any);
  };
  return (
    <input type="text" name={name} value={displayValue} onChange={handleInput}
      className={className} placeholder="0,00" autoComplete="off" />
  );
};

// Estado inicial limpo do formulário
const emptyForm = () => ({
  codigo: '', descricao: '', unidade: 'un', tipo: 'Material', estado: 'SP',
  valor: 0, fonte_preco: 'Cotação',
  data_base: new Date().toISOString().split('T')[0],
  estado_registro: 'ativo',
  valor_nao_desonerado_operativo: 0, valor_desonerado_operativo: 0,
  valor_nao_desonerado_improdutivo: 0, valor_desonerado_improdutivo: 0,
  valor_desonerado: 0, valor_nao_desonerado: 0, valor_sem_encargos: 0,
  codigo_pai: null, subitem: null
});

export default function InsumoFormModal({ isOpen, onClose, insumoToEdit, isCopyMode = false, onSuccess, bancoProprio }: InsumoFormModalProps) {
  const [aba, setAba] = useState<'proprio' | 'sistema'>('proprio');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>(emptyForm());
  const [isCopyActive, setIsCopyActive] = useState(false);

  // Estados para autocomplete da descrição
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Estados para a aba Base Sistema
  const [fonteSistema, setFonteSistema] = useState('SINAPI');
  const [buscaSistema, setBuscaSistema] = useState('');
  const [resultadosSistema, setResultadosSistema] = useState<any[]>([]);
  const [insumoBaseSelecionado, setInsumoBaseSelecionado] = useState<any>(null);
  const [fontesSistemaList, setFontesSistemaList] = useState<string[]>(['SINAPI', 'SICRO 3']);
  const [errorBusca, setErrorBusca] = useState<string | null>(null);

  // Modal de confirmação de duplicidade por estado
  const [confirmacaoDuplicidade, setConfirmacaoDuplicidade] = useState<any>(null);
  const [existingStatesForInsumo, setExistingStatesForInsumo] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !insumoToEdit) {
      setExistingStatesForInsumo([]);
      return;
    }

    const fetchExistingStates = async () => {
      try {
        let query = supabase.schema('engenharia').from('insumos')
          .select('estado')
          .ilike('descricao', insumoToEdit.descricao);

        if (['Cotação', 'Histórico'].includes(insumoToEdit.fonte_preco)) {
          query = query.in('fonte_preco', ['Cotação', 'Histórico']);
        } else {
          query = query.eq('fonte_preco', insumoToEdit.fonte_preco);
        }

        const { data, error } = await query;
        if (data && !error) {
          const ufs = Array.from(new Set(data.map((i: any) => i.estado).filter(Boolean))) as string[];
          setExistingStatesForInsumo(ufs);
        }
      } catch (err) {
        console.error('Erro ao buscar estados do insumo:', err);
      }
    };

    fetchExistingStates();
  }, [isOpen, insumoToEdit, isCopyActive]);

  // Busca fontes de referência do sistema disponíveis
  useEffect(() => {
    if (isOpen) {
      const fetchFontes = async () => {
        try {
          const { data, error } = await supabase.schema('engenharia').from('v_fontes_preco').select('*');
          if (data && !error) {
            const unicas = data.map((i: any) => i.fonte_preco).filter(Boolean);
            const final = Array.from(new Set([['SINAPI', 'SICRO 3'], ...unicas].flat()))
              .filter(f => f !== 'Cotação' && f !== 'Histórico')
              .sort();
            setFontesSistemaList(final as string[]);
            
            // Se a fonteSistema selecionada não está na lista final, atualiza para a primeira
            if (!final.includes(fonteSistema) && final.length > 0) {
              setFonteSistema(final[0]);
            }
          }
        } catch (err) {
          console.error('Erro ao buscar fontes de referência:', err);
        }
      };
      fetchFontes();
    }
  }, [isOpen]);

  // ─── Inicializa o form ao abrir ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setIsCopyActive(isCopyMode);
    if (insumoToEdit) {
      if (isCopyMode) {
        setFormData({
          ...insumoToEdit,
          id: undefined,
          estado: ''
        });
      } else {
        setFormData({ ...insumoToEdit });
      }
      setAba('proprio');
    } else {
      const fresh = emptyForm();
      setFormData(fresh);
      setAba('proprio');
      setInsumoBaseSelecionado(null);
      setBuscaSistema('');
      setResultadosSistema([]);
      setErrorBusca(null);
      generateAndSetCodigo('Material');
    }
    setSuggestions([]);
    setShowSuggestions(false);
  }, [isOpen, insumoToEdit, isCopyMode]);

  const handleToggleCopy = () => {
    setIsCopyActive(true);
    setFormData((prev: any) => ({
      ...prev,
      id: undefined,
      estado: ''
    }));
  };

  // ─── Geração automática de código ────────────────────────────────────────
  const generateAndSetCodigo = async (tipo: string) => {
    let prefix = 'out';
    switch (tipo) {
      case 'Material': prefix = 'mat'; break;
      case 'Equipamento': prefix = 'eq'; break;
      case 'Transporte e Logística': prefix = 'trans'; break;
      case 'Serviços':
      case 'Serviços de Terceiros': prefix = 'srv'; break;
      case 'Verba': prefix = 'vrb'; break;
      case 'Administração': prefix = 'adm'; break;
      case 'Mão de Obra': prefix = 'mo'; break;
      case 'Aluguel': prefix = 'alg'; break;
      case 'Taxas': prefix = 'tx'; break;
      default: prefix = 'out'; break;
    }

    const { data } = await supabase.schema('engenharia').from('insumos')
      .select('codigo').ilike('codigo', `${prefix}.%`)
      .not('codigo', 'ilike', `${prefix}.%.%`)  // exclui subitens
      .order('codigo', { ascending: false }).limit(1);

    let nextNumber = 1;
    if (data && data.length > 0) {
      const parts = data[0].codigo.split('.');
      if (parts.length >= 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num)) nextNumber = num + 1;
      }
    }

    const nextCode = `${prefix}.${nextNumber.toString().padStart(3, '0')}`;
    setFormData((prev: any) => ({ ...prev, codigo: nextCode }));
  };

  // ─── Formatação da descrição ──────────────────────────────────────────────
  const formatarDescricao = (value: string) =>
    value
      .replace(/^\s+/, '')
      .replace(/\s{2,}/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

  // ─── Busca de sugestões de descrição ─────────────────────────────────────
  const fetchSuggestions = async (text: string) => {
    if (text.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    const { data } = await supabase.schema('engenharia').from('insumos')
      .select('id, descricao, codigo, unidade')
      .in('fonte_preco', ['Cotação', 'Histórico'])
      .ilike('descricao', `%${text}%`).limit(6);
    if (data) { setSuggestions(data); setShowSuggestions(data.length > 0); }
  };

  const checkValoresModificadosInsumo = (nextFormData: any) => {
    if (!insumoBaseSelecionado) return false;
    return (
      (nextFormData.valor || 0) !== (insumoBaseSelecionado.valor || 0) ||
      (nextFormData.valor_nao_desonerado_operativo || 0) !== (insumoBaseSelecionado.valor_nao_desonerado_operativo || 0) ||
      (nextFormData.valor_desonerado_operativo || 0) !== (insumoBaseSelecionado.valor_desonerado_operativo || 0) ||
      (nextFormData.valor_nao_desonerado_improdutivo || 0) !== (insumoBaseSelecionado.valor_nao_desonerado_improdutivo || 0) ||
      (nextFormData.valor_desonerado_improdutivo || 0) !== (insumoBaseSelecionado.valor_desonerado_improdutivo || 0) ||
      (nextFormData.valor_desonerado || 0) !== (insumoBaseSelecionado.valor_desonerado || 0) ||
      (nextFormData.valor_nao_desonerado || 0) !== (insumoBaseSelecionado.valor_nao_desonerado || 0) ||
      (nextFormData.valor_sem_encargos || 0) !== (insumoBaseSelecionado.valor_sem_encargos || 0)
    );
  };

  // ─── Handler genérico ────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let val: any = value;
    if (type === 'checkbox') {
      val = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      val = parseFloat(value) || 0;
    } else if (type === 'currency') {
      val = parseFloat(value) || 0;
    } else {
      let finalValue = value;
      if (name === 'descricao') finalValue = formatarDescricao(value);
      val = finalValue;
    }

    setFormData((prev: any) => {
      const updated = { ...prev, [name]: val };
      
      if (name === 'valor') {
        updated.valor_nao_desonerado = val;
      }
      
      if (aba === 'sistema' && insumoBaseSelecionado) {
        const mod = checkValoresModificadosInsumo(updated);
        const fonteOriginal = insumoBaseSelecionado.fonte_preco || fonteSistema;
        if (mod && updated.fonte_preco === fonteOriginal) {
          updated.fonte_preco = 'Cotação';
        } else if (!mod) {
          updated.fonte_preco = fonteOriginal;
        }
      }
      
      return updated;
    });

    if (name === 'tipo') generateAndSetCodigo(value);
    if (name === 'descricao') {
      const finalValue = formatarDescricao(value);
      fetchSuggestions(finalValue);
    }
  };

  // ─── Busca de insumos na Base Sistema ────────────────────────────────────
  const handleBuscarSistema = useCallback(async (termo: string, fonte: string) => {
    if (termo.trim().length < 2) return;
    setErrorBusca(null);
    try {
      const { data, error } = await supabase.schema('engenharia').from('insumos')
        .select('*')
        .eq('fonte_preco', fonte)
        .or(`descricao.ilike."%${termo.trim()}%",codigo.ilike."%${termo.trim()}%"`)
        .limit(20);
      if (error) {
        console.error('Erro ao buscar na base sistema:', error);
        setErrorBusca(error.message);
        setResultadosSistema([]);
      } else {
        setResultadosSistema(data || []);
      }
    } catch (err: any) {
      console.error('Erro ao buscar na base sistema:', err);
      setErrorBusca(err.message || 'Erro inesperado');
      setResultadosSistema([]);
    }
  }, []);

  // Efeito de busca em tempo real conforme digita (Live Search)
  useEffect(() => {
    if (aba !== 'sistema') return;
    if (buscaSistema.trim().length < 2) {
      setResultadosSistema([]);
      setErrorBusca(null);
      return;
    }
    const handler = setTimeout(() => {
      handleBuscarSistema(buscaSistema, fonteSistema);
    }, 300);
    return () => clearTimeout(handler);
  }, [buscaSistema, fonteSistema, aba, handleBuscarSistema]);

  const handleSelecionarInsumoBase = async (insumo: any) => {
    setInsumoBaseSelecionado(insumo);
    setResultadosSistema([]);
    setBuscaSistema('');
    // Preenche os campos com os dados do insumo base, gera novo código e preenche valores e descrição
    await generateAndSetCodigo(insumo.tipo || 'Material');
    setFormData((prev: any) => ({
      ...prev,
      tipo: insumo.tipo || 'Material',
      unidade: UNIDADES.find(u => u.toLowerCase() === (insumo.unidade || '').trim().toLowerCase()) || insumo.unidade || 'un',
      estado: insumo.estado || 'SP',
      fonte_preco: bancoProprio ? 'Cotação' : (insumo.fonte_preco || 'SINAPI'),
      descricao: '',
      data_base: insumo.data_base || new Date().toISOString().split('T')[0],
      valor: insumo.valor !== null && insumo.valor !== undefined ? insumo.valor : 0,
      valor_desonerado: insumo.valor_desonerado !== null && insumo.valor_desonerado !== undefined ? insumo.valor_desonerado : 0,
      valor_nao_desonerado: insumo.valor_nao_desonerado !== null && insumo.valor_nao_desonerado !== undefined ? insumo.valor_nao_desonerado : 0,
      valor_sem_encargos: insumo.valor_sem_encargos !== null && insumo.valor_sem_encargos !== undefined ? insumo.valor_sem_encargos : 0,
      valor_nao_desonerado_operativo: insumo.valor_nao_desonerado_operativo !== null && insumo.valor_nao_desonerado_operativo !== undefined ? insumo.valor_nao_desonerado_operativo : 0,
      valor_desonerado_operativo: insumo.valor_desonerado_operativo !== null && insumo.valor_desonerado_operativo !== undefined ? insumo.valor_desonerado_operativo : 0,
      valor_nao_desonerado_improdutivo: insumo.valor_nao_desonerado_improdutivo !== null && insumo.valor_nao_desonerado_improdutivo !== undefined ? insumo.valor_nao_desonerado_improdutivo : 0,
      valor_desonerado_improdutivo: insumo.valor_desonerado_improdutivo !== null && insumo.valor_desonerado_improdutivo !== undefined ? insumo.valor_desonerado_improdutivo : 0,
    }));
  };

  // ─── Lógica de cópia com mesmo código por estado ────────────────────────
  const converterParaSubitens = async (existente: any, novoEstado: string, novosValores: any) => {
    setLoading(true);
    try {
      // Salvar o novo registro com o mesmo código do existente
      const dataToInsert = {
        ...novosValores,
        codigo: existente.codigo,
        codigo_pai: null,
        subitem: null,
        estado: novoEstado
      };
      delete dataToInsert.id;
      delete dataToInsert.created_at;
      delete dataToInsert.updated_at;

      const { error: insertError } = await supabase.schema('engenharia').from('insumos').insert([dataToInsert]);
      if (insertError) throw insertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Erro ao criar cópia do insumo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit principal ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSave = {
      ...formData,
      descricao: formData.descricao.trim(),
      unidade: formData.unidade.toLowerCase().trim()
    };

    // Limpar campos não usados pelo tipo
    if (dataToSave.tipo !== 'Equipamento') {
      dataToSave.valor_nao_desonerado_operativo = null;
      dataToSave.valor_desonerado_operativo = null;
      dataToSave.valor_nao_desonerado_improdutivo = null;
      dataToSave.valor_desonerado_improdutivo = null;
    }
    if (dataToSave.tipo !== 'Mão de Obra') {
      dataToSave.valor_desonerado = null;
      dataToSave.valor_nao_desonerado = null;
      dataToSave.valor_sem_encargos = null;
    }
    if (dataToSave.tipo === 'Equipamento' || dataToSave.tipo === 'Mão de Obra') {
      dataToSave.valor = null;
    }

    try {
      // Edição de insumo existente - sem verificação de duplicidade
      if (insumoToEdit?.id && !isCopyActive) {
        const { error } = await supabase.schema('engenharia').from('insumos')
          .update(dataToSave).eq('id', insumoToEdit.id);
        if (error) throw error;
        onSuccess(); onClose();
        return;
      }

      // ── Verificação de duplicidade ──────────────────────────────────────
      let queryExistentes = supabase.schema('engenharia').from('insumos')
        .select('*')
        .ilike('descricao', dataToSave.descricao);

      if (['Cotação', 'Histórico'].includes(dataToSave.fonte_preco)) {
        queryExistentes = queryExistentes.in('fonte_preco', ['Cotação', 'Histórico']);
      } else {
        queryExistentes = queryExistentes.eq('fonte_preco', dataToSave.fonte_preco);
      }

      const { data: existentes } = await queryExistentes;

      if (existentes && existentes.length > 0) {
        // Verifica se tem algum no mesmo estado
        const mesmoPadrão = existentes.filter(
          (ex: any) => ex.estado === dataToSave.estado || (!ex.estado && !dataToSave.estado)
        );

        if (mesmoPadrão.length > 0) {
          alert(`❌ Já existe um insumo cadastrado com esta descrição para o estado ${dataToSave.estado}.\n\nVerifique a lista de insumos e edite o existente caso necessário.`);
          setLoading(false);
          return;
        }

        // Mesmo insumo, mas estado diferente → cadastrar com o mesmo código
        const existente = existentes[0];
        if (isCopyActive) {
          converterParaSubitens(existente, dataToSave.estado, dataToSave);
          return;
        }
        setLoading(false);
        setConfirmacaoDuplicidade({ existente, novoEstado: dataToSave.estado, dataToSave });
        return;
      }

      // ── Novo insumo sem duplicidade ─────────────────────────────────────
      const { error } = await supabase.schema('engenharia').from('insumos').insert([dataToSave]);
      if (error) throw error;
      onSuccess(); onClose();

    } catch (error: any) {
      alert('Erro ao salvar insumo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Campos de custo (reutilizável) removidos daqui e declarados fora do componente

  // Campos comuns (tipo, código, unidade, descrição, estado) removidos daqui e declarados fora do componente

  const valoresModificados = insumoBaseSelecionado ? checkValoresModificadosInsumo(formData) : false;
  const isEstadoInvalidoCopia = isCopyActive && (formData.estado === '' || existingStatesForInsumo.includes(formData.estado));

  if (!isOpen) return null;

  return (
    <>
      {/* ── Modal Principal ────────────────────────────────────────────────── */}
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">

          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h2 className="text-xl font-bold text-slate-800">
              {isCopyActive ? 'Criar Cópia de Insumo' : insumoToEdit ? 'Editar Insumo' : 'Novo Insumo'}
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas (só aparecem no cadastro novo) */}
          {!insumoToEdit && (
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setAba('proprio')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${aba === 'proprio' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Building2 className="w-4 h-4" />
                Base Própria
              </button>
              <button
                onClick={() => setAba('sistema')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${aba === 'sistema' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Database className="w-4 h-4" />
                Base Sistema
              </button>
            </div>
          )}

          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <form id="insumo-form" onSubmit={handleSubmit}>

              {/* ─── ABA: BASE SISTEMA ──────────────────────────────────────── */}
              {aba === 'sistema' && (
                <div className="space-y-6">
                  {/* Seleção de fonte e busca */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-500" />
                      Importar da Base de Referência
                    </h3>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Fonte de Referência</label>
                          <select value={fonteSistema} onChange={(e) => { setFonteSistema(e.target.value); setResultadosSistema([]); setInsumoBaseSelecionado(null); setErrorBusca(null); }}
                            className="w-full px-3 py-2 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-400 outline-none">
                             {fontesSistemaList.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-col justify-end">
                          {insumoBaseSelecionado ? (
                            <div className="flex items-center justify-between bg-white border border-purple-300 rounded-lg px-3 py-2">
                              <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]" title={insumoBaseSelecionado.descricao}>
                                {insumoBaseSelecionado.descricao}
                              </span>
                              <button type="button" onClick={() => setInsumoBaseSelecionado(null)}
                                className="text-xs text-purple-600 hover:underline whitespace-nowrap ml-2">Trocar</button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input type="text" value={buscaSistema}
                                onChange={(e) => setBuscaSistema(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleBuscarSistema(buscaSistema, fonteSistema))}
                                placeholder="Buscar por código ou nome..."
                                className="flex-1 px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-400 outline-none text-sm" />
                              <button type="button" onClick={() => handleBuscarSistema(buscaSistema, fonteSistema)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors">
                                <Search className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Resultados da busca */}
                      {resultadosSistema.length > 0 && (
                        <div className="border border-purple-200 rounded-lg overflow-hidden bg-white">
                          <div className="px-3 py-1.5 bg-purple-100 text-xs font-semibold text-purple-700">{resultadosSistema.length} resultado(s) em {fonteSistema}</div>
                          <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                            {resultadosSistema.map((ins: any) => (
                              <li key={ins.id}
                                onClick={() => handleSelecionarInsumoBase(ins)}
                                className="px-3 py-2.5 hover:bg-purple-50 cursor-pointer flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{ins.descricao}</p>
                                  <p className="text-xs text-slate-500">{ins.codigo} · {ins.unidade} · {ins.estado}</p>
                                </div>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium whitespace-nowrap">{ins.fonte_preco}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {errorBusca && (
                        <p className="text-sm text-rose-600 text-center py-2 bg-rose-50 border border-rose-200 rounded-lg font-medium">
                          Erro na busca: {errorBusca}
                        </p>
                      )}

                      {resultadosSistema.length === 0 && buscaSistema.length > 0 && !insumoBaseSelecionado && !errorBusca && (
                        <p className="text-sm text-slate-500 text-center py-2">Nenhum insumo encontrado em {fonteSistema}.</p>
                      )}
                    </div>
                  </div>

                  {/* Formulário só aparece após selecionar insumo base ou em branco */}
                  {insumoBaseSelecionado && (
                    <>
                      <div className="h-px bg-slate-200" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Dados do Novo Registro</h3>
                        <CamposBase
                          formData={formData}
                          handleChange={handleChange}
                          suggestions={suggestions}
                          showSuggestions={showSuggestions}
                          setShowSuggestions={setShowSuggestions}
                          setFormData={setFormData}
                          isCopyActive={isCopyActive}
                          originalEstado={insumoToEdit?.estado}
                          existingStatesForInsumo={existingStatesForInsumo}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Custo e Referência</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fonte do Preço</label>
                            {bancoProprio ? (
                              <select
                                name="fonte_preco"
                                value={formData.fonte_preco}
                                onChange={handleChange}
                                disabled={!valoresModificados}
                                className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                                  !valoresModificados ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white text-slate-700"
                                }`}
                              >
                                {!valoresModificados ? (
                                  <option value={insumoBaseSelecionado?.fonte_preco || fonteSistema}>
                                    {insumoBaseSelecionado?.fonte_preco || fonteSistema}
                                  </option>
                                ) : (
                                  <>
                                    <option value="Cotação">Cotação</option>
                                    <option value="Histórico">Histórico</option>
                                  </>
                                )}
                              </select>
                            ) : (
                              <input type="text" value={formData.fonte_preco} readOnly disabled
                                className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg outline-none cursor-not-allowed font-medium" />
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data Base</label>
                            <input type="date" name="data_base" value={formData.data_base} onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select name="estado_registro" value={formData.estado_registro} onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                              <option value="ativo">Ativo</option>
                              <option value="inativo">Inativo</option>
                            </select>
                          </div>
                          <CamposValor formData={formData} handleChange={handleChange} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ─── ABA: BASE PRÓPRIA ──────────────────────────────────────── */}
              {aba === 'proprio' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Informações Básicas</h3>
                    <CamposBase
                      formData={formData}
                      handleChange={handleChange}
                      suggestions={suggestions}
                      showSuggestions={showSuggestions}
                      setShowSuggestions={setShowSuggestions}
                      setFormData={setFormData}
                      isCopyActive={isCopyActive}
                      originalEstado={insumoToEdit?.estado}
                      existingStatesForInsumo={existingStatesForInsumo}
                    />
                  </div>

                  <div className="h-px bg-slate-200" />

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Custo e Referência</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fonte do Preço</label>
                        <select name="fonte_preco" value={formData.fonte_preco} onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                          {FONTES_PROPRIO.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data Base</label>
                        <input type="date" name="data_base" value={formData.data_base} onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status do Registro</label>
                        <select name="estado_registro" value={formData.estado_registro} onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                        </select>
                      </div>
                      <CamposValor formData={formData} handleChange={handleChange} />
                    </div>
                  </div>
                </div>
              )}

            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors">
              Cancelar
            </button>
            {insumoToEdit && !isCopyActive && (
              <button type="button" onClick={handleToggleCopy}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-md transition-colors flex items-center gap-2">
                Criar Cópia
              </button>
            )}
            <button type="submit" form="insumo-form"
              disabled={loading || (aba === 'sistema' && !insumoBaseSelecionado) || isEstadoInvalidoCopia}
              className={`px-6 py-2 text-white font-medium rounded-lg shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 ${isCopyActive ? 'bg-emerald-600 hover:bg-emerald-700' : aba === 'sistema' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-700 hover:bg-blue-800'}`}>
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {isCopyActive ? 'Salvar Cópia' : 'Salvar Insumo'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal de Confirmação de Duplicidade por Estado ─────────────────── */}
      {confirmacaoDuplicidade && (
        <div className="fixed inset-0 bg-slate-900/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Insumo Já Cadastrado</h3>
                <p className="text-slate-600 mt-1 text-sm">
                  O insumo <strong>"{confirmacaoDuplicidade.dataToSave.descricao}"</strong> já existe no banco, mas para um estado diferente.
                </p>
                <p className="text-slate-600 mt-2 text-sm">
                  Deseja cadastrar este insumo para o estado <strong className="text-blue-700">{confirmacaoDuplicidade.novoEstado}</strong>? Ele será salvo com o mesmo código do insumo já existente.
                </p>
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
                  <p>• Código: <span className="font-mono font-medium text-slate-700">{confirmacaoDuplicidade.existente.codigo}</span></p>
                  <p>• Estado original: <span className="font-medium text-slate-700">{confirmacaoDuplicidade.existente.estado}</span></p>
                  <p>• Novo registro: <span className="font-mono font-medium text-slate-700">{confirmacaoDuplicidade.existente.codigo}</span> ({confirmacaoDuplicidade.novoEstado})</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmacaoDuplicidade(null)}
                className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={() => {
                setConfirmacaoDuplicidade(null);
                converterParaSubitens(
                  confirmacaoDuplicidade.existente,
                  confirmacaoDuplicidade.novoEstado,
                  confirmacaoDuplicidade.dataToSave
                );
              }}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg transition-colors">
                Sim, cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Componentes Auxiliares Declarados Fora para Manter Foco do Input ────────

type CamposBaseProps = {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  suggestions: any[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isCopyActive?: boolean;
  originalEstado?: string;
  existingStatesForInsumo?: string[];
};

const CamposBase = ({
  formData,
  handleChange,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  setFormData,
  isCopyActive = false,
  existingStatesForInsumo = []
}: CamposBaseProps) => {
  const isDuplicado = existingStatesForInsumo.includes(formData.estado);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="col-span-1 md:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Insumo *</label>
        <select required name="tipo" value={formData.tipo} onChange={handleChange} disabled={isCopyActive}
          className={`w-full px-3 py-2 border border-slate-300 rounded-lg outline-none ${isCopyActive ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:ring-2 focus:ring-blue-500'}`}>
          {TIPOS_INSUMO.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="col-span-1">
        <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
        <input type="text" value={formData.codigo} readOnly disabled
          className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg outline-none cursor-not-allowed font-mono font-medium" />
      </div>

      <div className="col-span-1">
        <label className="block text-sm font-medium text-slate-700 mb-1">Unidade *</label>
        <select required name="unidade" value={formData.unidade} onChange={handleChange} disabled={isCopyActive}
          className={`w-full px-3 py-2 border border-slate-300 rounded-lg outline-none ${isCopyActive ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:ring-2 focus:ring-blue-500'}`}>
          {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div className="col-span-1 md:col-span-3 relative">
        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição *</label>
        <input required type="text" name="descricao" value={formData.descricao} onChange={handleChange} disabled={isCopyActive}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className={`w-full px-3 py-2 border border-slate-300 rounded-lg outline-none ${isCopyActive ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'}`}
          autoComplete="off" placeholder="DESCREVA O INSUMO..." />
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
            <div className="px-3 py-1.5 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Insumos Semelhantes Cadastrados
            </div>
            <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100">
              {suggestions.map((sug: any) => (
                <li key={sug.id}
                  onClick={() => { setFormData((p: any) => ({ ...p, descricao: sug.descricao })); setShowSuggestions(false); }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center gap-4">
                  <span className="text-sm font-medium text-slate-800">{sug.descricao}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{sug.codigo} · {sug.unidade}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="col-span-1">
        <label className="block text-sm font-medium text-slate-700 mb-1">Estado (UF)</label>
        <select name="estado" value={formData.estado} onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-lg outline-none bg-white font-medium ${isCopyActive && (formData.estado === '' || isDuplicado) ? 'border-rose-300 focus:ring-2 focus:ring-rose-500' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`}>
          {isCopyActive && <option value="">Selecione...</option>}
          {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
        </select>
        {isCopyActive && isDuplicado && (
          <span className="text-[10px] text-rose-600 font-semibold block mt-1 leading-tight">Este estado já possui este insumo cadastrado ({formData.estado}).</span>
        )}
        {isCopyActive && formData.estado === '' && (
          <span className="text-[10px] text-slate-500 font-semibold block mt-1 leading-tight">Estados já cadastrados: <span className="font-bold text-slate-700">{existingStatesForInsumo.join(', ') || 'Nenhum'}</span></span>
        )}
      </div>
    </div>
  );
};

type CamposValorProps = {
  formData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
};

const CamposValor = ({ formData, handleChange }: CamposValorProps) => (
  <>
    {formData.tipo !== 'Equipamento' && formData.tipo !== 'Mão de Obra' && (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Valor Padrão (R$)</label>
        <CurrencyInput name="valor" value={formData.valor} onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right font-medium" />
      </div>
    )}
    {formData.tipo === 'Mão de Obra' && (
      <div className="col-span-2 grid grid-cols-3 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-200">
        <div>
          <label className="block text-xs font-medium text-blue-800 mb-1">Valor Não Desonerado (R$)</label>
          <CurrencyInput name="valor_nao_desonerado" value={formData.valor_nao_desonerado} onChange={handleChange}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right bg-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-blue-800 mb-1">Valor Desonerado (R$)</label>
          <CurrencyInput name="valor_desonerado" value={formData.valor_desonerado} onChange={handleChange}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right bg-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-blue-800 mb-1">Valor Sem Encargos (R$)</label>
          <CurrencyInput name="valor_sem_encargos" value={formData.valor_sem_encargos} onChange={handleChange}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right bg-white" />
        </div>
      </div>
    )}
    {formData.tipo === 'Equipamento' && (
      <div className="col-span-2 grid grid-cols-2 gap-4 bg-amber-50 p-4 rounded-xl border border-amber-200">
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Não Desonerado (Operativo)</label>
          <CurrencyInput name="valor_nao_desonerado_operativo" value={formData.valor_nao_desonerado_operativo} onChange={handleChange}
            className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-right" />
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Desonerado (Operativo)</label>
          <CurrencyInput name="valor_desonerado_operativo" value={formData.valor_desonerado_operativo} onChange={handleChange}
            className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-right" />
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Não Desonerado (Improdutivo)</label>
          <CurrencyInput name="valor_nao_desonerado_improdutivo" value={formData.valor_nao_desonerado_improdutivo} onChange={handleChange}
            className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-right" />
        </div>
        <div>
          <label className="block text-xs font-medium text-amber-800 mb-1">Desonerado (Improdutivo)</label>
          <CurrencyInput name="valor_desonerado_improdutivo" value={formData.valor_desonerado_improdutivo} onChange={handleChange}
            className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-right" />
        </div>
      </div>
    )}
  </>
);
