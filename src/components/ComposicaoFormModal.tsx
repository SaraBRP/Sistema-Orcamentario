import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Database, Search, Plus, Trash2, Link2 } from 'lucide-react';
import { clsx } from 'clsx';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

type ComposicaoFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  composicaoToEdit: any | null;
  onSuccess: (id?: string) => void;
  bancoProprio?: boolean;
};

const ATIVIDADES = [
  'Administração Local',
  'Trabalhos em Terra',
  'Fundações',
  'Estrutura',
  'Instalações',
  'Acabamentos',
  'Esquadrias',
  'Pintura',
  'Cobertura',
  'Outros'
];

const UNIDADES = ['un', 'm', 'm²', 'm³', 'kg', 't', 'L', 'h', 'cj', 'vb', 'gl', 'cx', 'sc', 'pr', 'km', 'mes', 'dia'];

export default function ComposicaoFormModal({ isOpen, onClose, composicaoToEdit, onSuccess, bancoProprio = true }: ComposicaoFormModalProps) {
  const [aba, setAba] = useState<'manual' | 'sistema'>('manual');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({
    codigo: '',
    descricao: '',
    unidade: '',
    tipo_atividade: '',
    estado: '',
    fonte: bancoProprio ? 'Própria' : 'SINAPI'
  });

  // Estados para busca na base de referência
  const [buscaSistema, setBuscaSistema] = useState('');
  const [fonteSistema, setFonteSistema] = useState('SINAPI');
  const [resultadosSistema, setResultadosSistema] = useState<any[]>([]);
  const [fontesSistemaList, setFontesSistemaList] = useState<string[]>(['SINAPI', 'SICRO 3', 'SICRO 2']);
  const [composicaoBaseSelecionada, setComposicaoBaseSelecionada] = useState<any | null>(null);
  const [errorBusca, setErrorBusca] = useState<string | null>(null);

  // Estados para Mapeamento de Itens da composição base selecionada
  const [itensMapeamento, setItensMapeamento] = useState<any[]>([]);
  const [loadingMapeamento, setLoadingMapeamento] = useState(false);
  const [insumoParaImportar, setInsumoParaImportar] = useState<any | null>(null);

  // Estados para buscar e adicionar novos itens próprios ao mapeamento
  const [isAddNovoItemOpen, setIsAddNovoItemOpen] = useState(false);
  const [buscaItemNovo, setBuscaItemNovo] = useState('');
  const [resultadosItemNovo, setResultadosItemNovo] = useState<any[]>([]);
  const [tipoItemNovo, setTipoItemNovo] = useState<'insumo' | 'subcomposicao'>('insumo');

  // Estados para busca de correspondência por linha
  const [rowSearchTerms, setRowSearchTerms] = useState<Record<string, string>>({});
  const [rowSearchResults, setRowSearchResults] = useState<Record<string, any[]>>({});

  // Geração automática de código COMP.0001
  const generateAndSetCodigo = async () => {
    try {
      const { data } = await supabase.schema('engenharia').from('composicoes')
        .select('codigo')
        .ilike('codigo', 'COMP.%')
        .order('codigo', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0) {
        const parts = data[0].codigo.split('.');
        if (parts.length >= 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num)) nextNumber = num + 1;
        }
      }

      const nextCode = `COMP.${nextNumber.toString().padStart(4, '0')}`;
      setFormData((prev: any) => ({ ...prev, codigo: nextCode }));
    } catch (err) {
      console.error('Erro ao gerar código de composição:', err);
    }
  };

  // Busca fontes de composições de referência disponíveis no banco
  const fetchFontesComposicoes = async () => {
    try {
      const { data, error } = await supabase.schema('engenharia')
        .from('composicoes')
        .select('fonte');
      if (data && !error) {
        const unicas = Array.from(new Set(data.map((i: any) => i.fonte).filter(Boolean)))
          .filter(f => f !== 'Própria')
          .sort() as string[];
        const padrao = ['SINAPI', 'SICRO 3', 'GOINFRA'];
        const final = Array.from(new Set([...padrao, ...unicas])).sort() as string[];
        setFontesSistemaList(final);
        if (!final.includes(fonteSistema)) {
          setFonteSistema(final[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar fontes de composição:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFontesComposicoes();
    }
  }, [isOpen]);

  // Busca automática na base de referência enquanto digita
  useEffect(() => {
    const handler = setTimeout(() => {
      if (buscaSistema.trim().length >= 2) {
        handleBuscarSistema(buscaSistema, fonteSistema);
      } else {
        setResultadosSistema([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [buscaSistema, fonteSistema]);

  useEffect(() => {
    if (!isOpen) return;
    if (composicaoToEdit) {
      setFormData({
        ...composicaoToEdit,
        unidade: composicaoToEdit.unidade ? composicaoToEdit.unidade.toLowerCase().trim() : '',
        tipo_atividade: composicaoToEdit.tipo_atividade || '',
        estado: composicaoToEdit.estado || ''
      });
      setAba('manual');
    } else {
      setFormData({
        codigo: '',
        descricao: '',
        unidade: '',
        tipo_atividade: '',
        estado: '',
        fonte: bancoProprio ? 'Própria' : 'SINAPI'
      });
      setAba('manual');
      setComposicaoBaseSelecionada(null);
      setBuscaSistema('');
      setResultadosSistema([]);
      setErrorBusca(null);
      if (bancoProprio) {
        generateAndSetCodigo();
      }
    }
  }, [composicaoToEdit, isOpen, bancoProprio]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleBuscarSistema = async (termo: string, fonte: string) => {
    if (termo.trim().length < 2) return;
    setErrorBusca(null);
    try {
      const { data, error } = await supabase.schema('engenharia')
        .from('composicoes')
        .select('*')
        .eq('fonte', fonte)
        .or(`descricao.ilike.%${termo.trim()}%,codigo.ilike.%${termo.trim()}%`)
        .limit(20);

      if (error) {
        console.error(error);
        setErrorBusca(error.message);
        setResultadosSistema([]);
      } else {
        setResultadosSistema(data || []);
      }
    } catch (err: any) {
      console.error(err);
      setErrorBusca(err.message || 'Erro inesperado');
      setResultadosSistema([]);
    }
  };

  const handleSelecionarComposicaoBase = async (comp: any) => {
    setComposicaoBaseSelecionada(comp);
    setFormData((prev: any) => ({
      ...prev,
      descricao: comp.descricao,
      unidade: comp.unidade ? comp.unidade.toLowerCase().trim() : 'un',
      tipo_atividade: comp.tipo_atividade || 'Outros',
      fonte: 'Própria'
    }));
    setResultadosSistema([]);
    
    // Iniciar carregamento e mapeamento dos subitens da composição
    setLoadingMapeamento(true);
    setItensMapeamento([]);
    try {
      const { data: baseItens, error: errorItens } = await supabase.schema('engenharia')
        .from('composicao_itens')
        .select(`
          *,
          insumo:insumos (*),
          sub_composicao:composicoes!sub_composicao_id (*)
        `)
        .eq('composicao_id', comp.id);
        
      if (errorItens) throw errorItens;
      
      if (baseItens) {
        // Tenta encontrar um item correspondente no Banco Próprio para cada subitem
        const mapeados = await Promise.all(baseItens.map(async (item: any) => {
          let mapeado: any = null;
          
          if (item.insumo) {
            const { data: proprioInsumo } = await supabase.schema('engenharia')
              .from('insumos')
              .select('*')
              .in('fonte_preco', ['Cotação', 'Histórico'])
              .eq('descricao', item.insumo.descricao)
              .limit(1);
            if (proprioInsumo && proprioInsumo.length > 0) {
              mapeado = proprioInsumo[0];
            }
          } else if (item.sub_composicao) {
            const { data: propriaComp } = await supabase.schema('engenharia')
              .from('composicoes')
              .select('*')
              .eq('fonte', 'Própria')
              .eq('descricao', item.sub_composicao.descricao)
              .limit(1);
            if (propriaComp && propriaComp.length > 0) {
              mapeado = propriaComp[0];
            }
          }
          
          return {
            id: Math.random().toString(36).substring(2),
            original: item,
            mapeado
          };
        }));
        
        setItensMapeamento(mapeados);
      }
    } catch (err) {
      console.error('Erro ao carregar itens da composição base:', err);
    } finally {
      setLoadingMapeamento(false);
    }
  };

  const handleRowSearchChange = async (rowId: string, val: string, isOriginalInsumo: boolean) => {
    setRowSearchTerms(prev => ({ ...prev, [rowId]: val }));
    
    if (val.trim().length < 2) {
      setRowSearchResults(prev => ({ ...prev, [rowId]: [] }));
      return;
    }
    
    try {
      const { data } = await supabase.schema('engenharia')
        .from(isOriginalInsumo ? 'insumos' : 'v_composicoes_cdu')
        .select('*')
        .or(`descricao.ilike."%${val.trim()}%",codigo.ilike."%${val.trim()}%"`)
        .limit(8);
        
      let filtered = data || [];
      if (isOriginalInsumo) {
        filtered = filtered.filter((i: any) => ['Cotação', 'Histórico'].includes(i.fonte_preco));
      } else {
        filtered = filtered.filter((c: any) => c.fonte === 'Própria');
      }
      
      setRowSearchResults(prev => ({ ...prev, [rowId]: filtered }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleVincularItem = (rowId: string, itemProprio: any) => {
    setItensMapeamento(prev => prev.map(item => {
      if (item.id === rowId) {
        return { ...item, mapeado: itemProprio };
      }
      return item;
    }));
    
    setRowSearchTerms(prev => ({ ...prev, [rowId]: '' }));
    setRowSearchResults(prev => ({ ...prev, [rowId]: [] }));
  };
  
  const handleDesvincularItem = (rowId: string) => {
    setItensMapeamento(prev => prev.map(item => {
      if (item.id === rowId) {
        return { ...item, mapeado: null };
      }
      return item;
    }));
  };
  
  const handleExcluirLinhaMapeamento = (rowId: string) => {
    setItensMapeamento(prev => prev.filter(item => item.id !== rowId));
  };

  const checkValoresModificados = (insumo: any) => {
    if (!insumo || !insumo.originais) return false;
    return (
      insumo.valor !== insumo.originais.valor ||
      insumo.valor_nao_desonerado_operativo !== insumo.originais.valor_nao_desonerado_operativo ||
      insumo.valor_desonerado_operativo !== insumo.originais.valor_desonerado_operativo ||
      insumo.valor_nao_desonerado_improdutivo !== insumo.originais.valor_nao_desonerado_improdutivo ||
      insumo.valor_desonerado_improdutivo !== insumo.originais.valor_desonerado_improdutivo ||
      insumo.valor_desonerado !== insumo.originais.valor_desonerado ||
      insumo.valor_nao_desonerado !== insumo.originais.valor_nao_desonerado ||
      insumo.valor_sem_encargos !== insumo.originais.valor_sem_encargos
    );
  };

  const handlePriceFieldChange = (field: string, val: number) => {
    if (!insumoParaImportar) return;
    
    const updated = {
      ...insumoParaImportar,
      [field]: val
    };
    
    if (field === 'valor') {
      updated.valor_nao_desonerado = val;
    }
    
    const mod = checkValoresModificados(updated);
    if (mod && updated.fonte_preco === fonteSistema) {
      updated.fonte_preco = 'Cotação';
    } else if (!mod) {
      updated.fonte_preco = fonteSistema;
    }
    
    setInsumoParaImportar(updated);
  };

  const handleAbrirImportador = (rowId: string, insumoOriginal: any) => {
    const originais = {
      valor: insumoOriginal.valor || 0,
      valor_nao_desonerado_operativo: insumoOriginal.valor_nao_desonerado_operativo || 0,
      valor_desonerado_operativo: insumoOriginal.valor_desonerado_operativo || 0,
      valor_nao_desonerado_improdutivo: insumoOriginal.valor_nao_desonerado_improdutivo || 0,
      valor_desonerado_improdutivo: insumoOriginal.valor_desonerado_improdutivo || 0,
      valor_desonerado: insumoOriginal.valor_desonerado || 0,
      valor_nao_desonerado: insumoOriginal.valor_nao_desonerado || 0,
      valor_sem_encargos: insumoOriginal.valor_sem_encargos || 0
    };

    setInsumoParaImportar({
      rowId,
      descricao: insumoOriginal.descricao,
      unidade: insumoOriginal.unidade ? insumoOriginal.unidade.toLowerCase().trim() : 'un',
      tipo: insumoOriginal.tipo || 'Material',
      estado: insumoOriginal.estado || 'SP',
      fonte_preco: fonteSistema,
      originais,
      valor: originais.valor,
      valor_nao_desonerado_operativo: originais.valor_nao_desonerado_operativo,
      valor_desonerado_operativo: originais.valor_desonerado_operativo,
      valor_nao_desonerado_improdutivo: originais.valor_nao_desonerado_improdutivo,
      valor_desonerado_improdutivo: originais.valor_desonerado_improdutivo,
      valor_desonerado: originais.valor_desonerado,
      valor_nao_desonerado: originais.valor_nao_desonerado,
      valor_sem_encargos: originais.valor_sem_encargos
    });
  };

  const generateInsumoCodigo = async (tipo: string) => {
    let prefix = 'out';
    if (tipo === 'Material') prefix = 'mat';
    else if (tipo === 'Equipamento') prefix = 'eq';
    else if (tipo === 'Mão de Obra') prefix = 'mo';
    else if (tipo === 'Transporte e Logística') prefix = 'trans';
    
    const { data } = await supabase.schema('engenharia').from('insumos')
      .select('codigo')
      .ilike('codigo', `${prefix}.%`)
      .order('codigo', { ascending: false })
      .limit(1);
      
    let nextNum = 1;
    if (data && data.length > 0) {
      const parts = data[0].codigo.split('.');
      if (parts.length >= 2) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num)) nextNum = num + 1;
      }
    }
    return `${prefix}.${nextNum}`;
  };

  const handleConfirmarImportacao = async () => {
    if (!insumoParaImportar) return;
    setLoading(true);
    try {
      const nextCode = await generateInsumoCodigo(insumoParaImportar.tipo);
      
      const { data, error } = await supabase.schema('engenharia')
        .from('insumos')
        .insert([{
          codigo: nextCode,
          descricao: insumoParaImportar.descricao.trim(),
          unidade: insumoParaImportar.unidade,
          tipo: insumoParaImportar.tipo,
          estado: insumoParaImportar.estado,
          fonte_preco: insumoParaImportar.fonte_preco,
          valor: insumoParaImportar.valor,
          valor_nao_desonerado_operativo: insumoParaImportar.valor_nao_desonerado_operativo,
          valor_desonerado_operativo: insumoParaImportar.valor_desonerado_operativo,
          valor_nao_desonerado_improdutivo: insumoParaImportar.valor_nao_desonerado_improdutivo,
          valor_desonerado_improdutivo: insumoParaImportar.valor_desonerado_improdutivo,
          valor_desonerado: insumoParaImportar.valor_desonerado,
          valor_nao_desonerado: insumoParaImportar.valor_nao_desonerado,
          valor_sem_encargos: insumoParaImportar.valor_sem_encargos
        }])
        .select();
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        handleVincularItem(insumoParaImportar.rowId, data[0]);
      }
      setInsumoParaImportar(null);
    } catch (err: any) {
      alert('Erro ao importar insumo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscaItemNovo = async (val: string) => {
    setBuscaItemNovo(val);
    if (val.trim().length < 2) {
      setResultadosItemNovo([]);
      return;
    }
    
    try {
      const { data } = await supabase.schema('engenharia')
        .from(tipoItemNovo === 'insumo' ? 'insumos' : 'v_composicoes_cdu')
        .select('*')
        .or(`descricao.ilike."%${val.trim()}%",codigo.ilike."%${val.trim()}%"`)
        .limit(8);
        
      let filtered = data || [];
      if (tipoItemNovo === 'insumo') {
        filtered = filtered.filter((i: any) => ['Cotação', 'Histórico'].includes(i.fonte_preco));
      } else {
        filtered = filtered.filter((c: any) => c.fonte === 'Própria');
      }
      
      setResultadosItemNovo(filtered);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleAdicionarItemNovoAoMapeamento = (itemProprio: any) => {
    setItensMapeamento(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2),
        original: null,
        mapeado: itemProprio,
        coeficiente: 1.00,
        perda_percentual: 0
      }
    ]);
    setIsAddNovoItemOpen(false);
    setBuscaItemNovo('');
    setResultadosItemNovo([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSave = { 
      codigo: formData.codigo,
      descricao: formData.descricao,
      unidade: formData.unidade.toLowerCase().trim(),
      tipo_atividade: formData.tipo_atividade,
      fonte: formData.fonte,
      estado: formData.estado
    };

    try {
      let newCompositionId = '';

      if (composicaoToEdit?.id) {
        const { error } = await supabase.schema('engenharia').from('composicoes').update(dataToSave).eq('id', composicaoToEdit.id);
        if (error) throw error;
        newCompositionId = composicaoToEdit.id;
      } else {
        const { data, error } = await supabase.schema('engenharia').from('composicoes').insert([dataToSave]).select();
        if (error) throw error;
        if (data && data.length > 0) {
          newCompositionId = data[0].id;
        }
      }

      // Se foi selecionada uma composição base na aba "sistema", copia os seus subitens mapeados
      if (aba === 'sistema' && newCompositionId) {
        const unmapped = itensMapeamento.filter(item => !item.mapeado);
        if (unmapped.length > 0) {
          throw new Error(`Existem ${unmapped.length} item(ns) na composição sem correspondente no Banco Próprio. Vincule ou crie-os antes de salvar.`);
        }

        const newItens = itensMapeamento.map((item: any) => {
          const isInsumo = !!item.mapeado.fonte_preco;
          return {
            composicao_id: newCompositionId,
            insumo_id: isInsumo ? item.mapeado.id : null,
            sub_composicao_id: !isInsumo ? item.mapeado.id : null,
            coeficiente: item.original ? item.original.coeficiente : item.coeficiente,
            perda_percentual: item.original ? item.original.perda_percentual : item.perda_percentual,
            observacao: item.original ? item.original.observacao : null,
            secao_sicro: item.original ? item.original.secao_sicro : null,
            codigo_auxiliar: item.original ? item.original.codigo_auxiliar : null,
            codigo_ln: item.original ? item.original.codigo_ln : null,
            codigo_rp: item.original ? item.original.codigo_rp : null,
            codigo_p: item.original ? item.original.codigo_p : null,
            preco_unitario: item.original ? item.original.preco_unitario : null,
            preco_unitario_improdutivo: item.original ? item.original.preco_unitario_improdutivo : null
          };
        });

        if (newItens.length > 0) {
          const { error: insertError } = await supabase.schema('engenharia')
            .from('composicao_itens')
            .insert(newItens);

          if (insertError) throw insertError;
        }
      }

      onSuccess(newCompositionId);
      onClose();
    } catch (error: any) {
      alert('Erro ao salvar composição: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const valoresModificados = checkValoresModificados(insumoParaImportar);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            {composicaoToEdit ? 'Editar Composição' : 'Nova Composição'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de cadastro (só no cadastro novo) */}
        {!composicaoToEdit && (
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setAba('manual')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${aba === 'manual' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Plus className="w-4 h-4" />
              Cadastro Direto
            </button>
            <button
              onClick={() => setAba('sistema')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${aba === 'sistema' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Database className="w-4 h-4" />
              Base de Referência
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <form id="composicao-form" onSubmit={handleSubmit}>

            {/* ABA: BASE DE REFERÊNCIA */}
            {aba === 'sistema' && (
              <div className="space-y-6 mb-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-500" />
                    Criar a partir de Composição Existente
                  </h3>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fonte de Referência</label>
                        <select value={fonteSistema} onChange={(e) => { setFonteSistema(e.target.value); setResultadosSistema([]); setComposicaoBaseSelecionada(null); setErrorBusca(null); }}
                          className="w-full px-3 py-2 border border-purple-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-400 outline-none">
                          {fontesSistemaList.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col justify-end">
                        {composicaoBaseSelecionada ? (
                          <div className="flex items-center justify-between bg-white border border-purple-300 rounded-lg px-3 py-2">
                            <span className="text-sm font-medium text-slate-700 truncate max-w-[220px]" title={composicaoBaseSelecionada.descricao}>
                              {composicaoBaseSelecionada.descricao}
                            </span>
                            <button type="button" onClick={() => setComposicaoBaseSelecionada(null)}
                              className="text-xs text-purple-600 hover:underline whitespace-nowrap ml-2">Trocar</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input type="text" value={buscaSistema}
                              onChange={(e) => setBuscaSistema(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleBuscarSistema(buscaSistema, fonteSistema))}
                              placeholder="Buscar por código ou descrição..."
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
                          {resultadosSistema.map((comp: any) => (
                            <li key={comp.id}
                              onClick={() => handleSelecionarComposicaoBase(comp)}
                              className="px-3 py-2.5 hover:bg-purple-50 cursor-pointer flex items-center justify-between gap-4">
                              <div className="truncate">
                                <p className="text-sm font-medium text-slate-800 truncate" title={comp.descricao}>{comp.descricao}</p>
                                <p className="text-xs text-slate-500">{comp.codigo} · {comp.unidade} · {comp.tipo_atividade}</p>
                              </div>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium whitespace-nowrap">{comp.fonte}</span>
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

                    {resultadosSistema.length === 0 && buscaSistema.length > 0 && !composicaoBaseSelecionada && !errorBusca && (
                      <p className="text-sm text-slate-500 text-center py-2">Nenhuma composição encontrada em {fonteSistema}.</p>
                    )}
                  </div>
                </div>

                {composicaoBaseSelecionada && <div className="h-px bg-slate-200" />}
              </div>
            )}

            {/* FORMULÁRIO DE INFORMAÇÕES (apenas se for aba manual ou se já selecionou composição base) */}
            {(aba === 'manual' || composicaoBaseSelecionada) && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">
                  {aba === 'sistema' ? 'Dados da Nova Composição Própria' : 'Informações Básicas'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
                    <input
                      required
                      type="text"
                      name="codigo"
                      value={formData.codigo}
                      onChange={handleChange}
                      readOnly={bancoProprio}
                      disabled={bancoProprio}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 outline-none cursor-not-allowed font-mono font-medium"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descrição *</label>
                    <input
                      required
                      type="text"
                      name="descricao"
                      value={formData.descricao}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidade *</label>
                    <select
                      required
                      name="unidade"
                      value={formData.unidade}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="" disabled hidden>Selecione...</option>
                      {Array.from(new Set([...UNIDADES, formData.unidade ? formData.unidade.toLowerCase().trim() : ''])).filter(Boolean).map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Atividade *</label>
                    <select
                      required
                      name="tipo_atividade"
                      value={formData.tipo_atividade}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="" disabled hidden>Selecione...</option>
                      {ATIVIDADES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado (UF) *</label>
                    <select
                      required
                      name="estado"
                      value={formData.estado || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="" disabled hidden>Selecione...</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Fonte</label>
                    <input
                      required
                      type="text"
                      name="fonte"
                      value={formData.fonte}
                      onChange={handleChange}
                      disabled={bancoProprio}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* ABA SISTEMA - Seção de Mapeamento de Itens */}
                {aba === 'sistema' && composicaoBaseSelecionada && (
                  <div className="space-y-4 border-t border-slate-200 pt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-purple-500" />
                        Mapeamento dos Itens da Composição
                      </h3>
                      {itensMapeamento.length > 0 && (
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                          {itensMapeamento.filter(i => i.mapeado).length} de {itensMapeamento.length} mapeados
                        </span>
                      )}
                    </div>
                    
                    {loadingMapeamento ? (
                      <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm">Buscando subitens e sugerindo correspondências...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                          <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-2.5">Item de Referência</th>
                                <th className="px-4 py-2.5">Unidade/Coef.</th>
                                <th className="px-4 py-2.5">Correspondente Banco Próprio</th>
                                <th className="px-4 py-2.5 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                              {itensMapeamento.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400 font-medium">
                                    Nenhum subitem nesta composição. Clique em "+ Adicionar Item Próprio" se quiser incluir algum.
                                  </td>
                                </tr>
                              ) : (
                                itensMapeamento.map((item) => {
                                  const original = item.original;
                                  
                                  const isOriginalInsumo = original ? !!original.insumo : (item.mapeado ? !!item.mapeado.fonte_preco : true);
                                  const orgTipo = original 
                                    ? (isOriginalInsumo ? original.insumo.tipo : 'Subcomposição')
                                    : (item.mapeado ? (item.mapeado.fonte_preco ? item.mapeado.tipo : 'Subcomposição') : 'Insumo');
                                  const orgDesc = original 
                                    ? (isOriginalInsumo ? original.insumo.descricao : original.sub_composicao.descricao)
                                    : (item.mapeado?.descricao || 'Novo item adicionado');
                                  const orgCod = original 
                                    ? (isOriginalInsumo ? original.insumo.codigo : original.sub_composicao.codigo)
                                    : (item.mapeado?.codigo || '-');
                                  const orgUnd = original 
                                    ? (isOriginalInsumo ? original.insumo.unidade : original.sub_composicao.unidade)
                                    : (item.mapeado?.unidade || '-');
                                  const orgCoef = original ? parseFloat(original.coeficiente || '0') : item.coeficiente;
                                  
                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-4 py-3 max-w-xs">
                                        <div className="flex items-center gap-1 flex-wrap">
                                          <span className={clsx(
                                            'text-[9px] px-1.5 py-0.5 rounded font-bold mr-2 uppercase',
                                            orgTipo === 'Mão de Obra' ? 'bg-amber-100 text-amber-800' :
                                            orgTipo === 'Equipamento' ? 'bg-blue-100 text-blue-800' :
                                            orgTipo === 'Subcomposição' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                                          )}>
                                            {orgTipo}
                                          </span>
                                          <span className="font-mono text-slate-400 mr-2 text-[10px]">{orgCod}</span>
                                        </div>
                                        <div className="font-medium text-slate-700 mt-1.5 text-xs truncate max-w-[240px]" title={orgDesc}>{orgDesc}</div>
                                      </td>
                                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                                        <div>{orgUnd}</div>
                                        <div className="font-mono text-slate-400 text-[10px]">Coef: {orgCoef.toFixed(4)}</div>
                                      </td>
                                      <td className="px-4 py-3 min-w-[240px]">
                                        {item.mapeado ? (
                                          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-emerald-800 gap-2">
                                            <div className="truncate text-xs">
                                              <span className="font-mono font-bold text-[10px] bg-emerald-100 px-1 py-0.2 rounded mr-1.5">{item.mapeado.codigo}</span>
                                              <span className="font-medium">{item.mapeado.descricao}</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => handleDesvincularItem(item.id)}
                                              className="text-[10px] text-emerald-600 hover:text-emerald-800 underline font-semibold shrink-0"
                                            >
                                              Alterar
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="space-y-1.5 relative">
                                            <div className="flex items-center gap-1.5">
                                              <div className="relative flex-1">
                                                <input
                                                  type="text"
                                                  value={rowSearchTerms[item.id] || ''}
                                                  onChange={(e) => handleRowSearchChange(item.id, e.target.value, isOriginalInsumo)}
                                                  placeholder="Buscar item próprio..."
                                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 outline-none"
                                                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                                />
                                                
                                                {rowSearchResults[item.id] && rowSearchResults[item.id].length > 0 && (
                                                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                                    {rowSearchResults[item.id].map(res => (
                                                      <div
                                                        key={res.id}
                                                        onClick={() => handleVincularItem(item.id, res)}
                                                        className="px-2.5 py-1 text-xs hover:bg-purple-50 cursor-pointer flex justify-between border-b border-slate-100 last:border-b-0"
                                                      >
                                                        <span className="font-mono text-purple-700 font-semibold mr-1.5 shrink-0">{res.codigo}</span>
                                                        <span className="truncate flex-1 text-left text-slate-700">{res.descricao}</span>
                                                        <span className="text-[10px] text-slate-400 font-medium ml-2 shrink-0">{res.fonte_preco || 'Própria'}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                              
                                              {isOriginalInsumo && original?.insumo && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleAbrirImportador(item.id, original.insumo)}
                                                  className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-[10px] px-2 py-1.5 rounded font-bold whitespace-nowrap transition-colors"
                                                >
                                                  + Importar
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleExcluirLinhaMapeamento(item.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                          title="Remover este item da composição"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                        
                        <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <span className="text-slate-500 text-xs font-medium">Tem insumos adicionais a incluir?</span>
                          <button
                            type="button"
                            onClick={() => setIsAddNovoItemOpen(true)}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Adicionar Item Próprio
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            form="composicao-form"
            disabled={loading || (aba === 'sistema' && !composicaoBaseSelecionada)}
            className={`px-6 py-2 text-white font-medium rounded-lg shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 ${
              aba === 'sistema' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Composição
          </button>
        </div>
      {/* Mini-modal para confirmar importação de insumo */}
      {insumoParaImportar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-purple-600" />
                Confirmar Importação de Insumo
              </h3>
              <button type="button" onClick={() => setInsumoParaImportar(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-500">Confirme os dados que serão gravados no seu **Banco Próprio** para este insumo:</p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Descrição</label>
                  <input
                    type="text"
                    value={insumoParaImportar.descricao}
                    onChange={(e) => setInsumoParaImportar({ ...insumoParaImportar, descricao: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 outline-none font-medium"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Unidade</label>
                    <select
                      value={insumoParaImportar.unidade}
                      onChange={(e) => setInsumoParaImportar({ ...insumoParaImportar, unidade: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 outline-none bg-white"
                    >
                      {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Tipo de Insumo</label>
                    <select
                      value={insumoParaImportar.tipo}
                      onChange={(e) => setInsumoParaImportar({ ...insumoParaImportar, tipo: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 outline-none bg-white"
                    >
                      <option value="Material">Material</option>
                      <option value="Equipamento">Equipamento</option>
                      <option value="Mão de Obra">Mão de Obra</option>
                      <option value="Transporte e Logística">Transporte e Logística</option>
                      <option value="Taxas">Taxas</option>
                      <option value="Administração">Administração</option>
                      <option value="Aluguel">Aluguel</option>
                      <option value="Verba">Verba</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Estado (UF)</label>
                    <select
                      value={insumoParaImportar.estado}
                      onChange={(e) => setInsumoParaImportar({ ...insumoParaImportar, estado: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 outline-none bg-white"
                    >
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Fonte de Preço</label>
                    <select
                      value={insumoParaImportar.fonte_preco}
                      onChange={(e) => setInsumoParaImportar({ ...insumoParaImportar, fonte_preco: e.target.value })}
                      disabled={!valoresModificados}
                      className={clsx(
                        "w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 outline-none bg-white",
                        !valoresModificados ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "bg-white text-slate-700"
                      )}
                    >
                      {!valoresModificados ? (
                        <option value={fonteSistema}>{fonteSistema}</option>
                      ) : (
                        <>
                          <option value="Cotação">Cotação</option>
                          <option value="Histórico">Histórico</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-200 my-3 pt-3">
                  <h4 className="font-bold text-slate-700 mb-2 uppercase tracking-wide text-[10px]">Valores de Custo do Insumo</h4>
                  
                  {insumoParaImportar.tipo === 'Equipamento' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Valor Padrão (R$)</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={insumoParaImportar.valor}
                            onChange={(e) => handlePriceFieldChange('valor', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Sem Encargos (R$)</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={insumoParaImportar.valor_sem_encargos || 0}
                            onChange={(e) => handlePriceFieldChange('valor_sem_encargos', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-2">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Operativo Não Deson. (R$)</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={insumoParaImportar.valor_nao_desonerado_operativo || 0}
                            onChange={(e) => handlePriceFieldChange('valor_nao_desonerado_operativo', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Operativo Deson. (R$)</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={insumoParaImportar.valor_desonerado_operativo || 0}
                            onChange={(e) => handlePriceFieldChange('valor_desonerado_operativo', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Improdutivo Não Deson. (R$)</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={insumoParaImportar.valor_nao_desonerado_improdutivo || 0}
                            onChange={(e) => handlePriceFieldChange('valor_nao_desonerado_improdutivo', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 font-medium mb-1">Improdutivo Deson. (R$)</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={insumoParaImportar.valor_desonerado_improdutivo || 0}
                            onChange={(e) => handlePriceFieldChange('valor_desonerado_improdutivo', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Valor Sem Deson. (R$)</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={insumoParaImportar.valor}
                          onChange={(e) => handlePriceFieldChange('valor', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Valor Desonerado (R$)</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={insumoParaImportar.valor_desonerado || 0}
                          onChange={(e) => handlePriceFieldChange('valor_desonerado', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Sem Encargos (R$)</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={insumoParaImportar.valor_sem_encargos || 0}
                          onChange={(e) => handlePriceFieldChange('valor_sem_encargos', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setInsumoParaImportar(null)}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-200 rounded font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarImportacao}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium shadow-md transition-colors"
              >
                Confirmar Importação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Adicionar Novo Item próprio ao mapeamento */}
      {isAddNovoItemOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Adicionar Item Adicional</h3>
              <button type="button" onClick={() => { setIsAddNovoItemOpen(false); setBuscaItemNovo(''); setResultadosItemNovo([]); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 text-xs">
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => { setTipoItemNovo('insumo'); setResultadosItemNovo([]); }}
                  className={clsx(
                    'flex-1 py-1.5 font-bold text-center border-b-2 transition-colors',
                    tipoItemNovo === 'insumo' ? 'border-purple-600 text-purple-600 font-bold' : 'border-transparent text-slate-500 font-medium'
                  )}
                >
                  Insumo Banco Próprio
                </button>
                <button
                  type="button"
                  onClick={() => { setTipoItemNovo('subcomposicao'); setResultadosItemNovo([]); }}
                  className={clsx(
                    'flex-1 py-1.5 font-bold text-center border-b-2 transition-colors',
                    tipoItemNovo === 'subcomposicao' ? 'border-purple-600 text-purple-600 font-bold' : 'border-transparent text-slate-500 font-medium'
                  )}
                >
                  Subcomposição Própria
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={buscaItemNovo}
                  onChange={(e) => handleBuscaItemNovo(e.target.value)}
                  placeholder="Digitar código ou descrição..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-purple-400 outline-none"
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                />
                
                {resultadosItemNovo.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                    {resultadosItemNovo.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleAdicionarItemNovoAoMapeamento(item)}
                        className="px-2.5 py-1.5 hover:bg-purple-50 cursor-pointer flex justify-between border-b border-slate-100 last:border-b-0"
                      >
                        <span className="font-mono text-purple-700 font-semibold">{item.codigo}</span>
                        <span className="truncate flex-1 text-left ml-2">{item.descricao}</span>
                        <span className="text-slate-400 text-[10px] ml-2 shrink-0">{item.fonte_preco || 'Própria'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setIsAddNovoItemOpen(false); setBuscaItemNovo(''); setResultadosItemNovo([]); }}
                className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-200 rounded font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
