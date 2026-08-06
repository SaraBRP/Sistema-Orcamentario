import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  FileText, Upload, Plus, Search, Trash2, Download, CheckCircle2, 
  X, Paperclip, Building2, HardDrive, Info, Folder, FolderPlus, 
  ArrowUpDown, ArrowUp, ArrowDown, Check, ChevronRight, ChevronLeft,
  FolderOpen, TrendingDown, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';

interface CotacaoAnexo {
  id: string;
  orcamentoId: string;
  baseCode: string; // Vínculo global ao projeto/obra (ex: "2907.001")
  fornecedorNome: string;
  cnpj?: string;
  contatoVendedor?: string;
  telefone?: string;
  email?: string;
  categoriaInsumo: string;
  valorTotalR$: number;
  prazoEntregaDias?: number;
  condicoesPagamento?: string;
  status: 'Em Análise' | 'Aprovada' | 'Recusada' | 'Vencedora';
  dataCotacao: string;
  observacoes?: string;
  pastaId?: string; // ID da pasta onde o anexo está organizado
  
  // Dados do Arquivo Anexo
  nomeArquivo?: string;
  tamanhoKb?: number;
  tipoArquivo?: string;
  urlDownload?: string;
  storagePath?: string;
}

interface Pasta {
  id: string;
  nome: string;
  cor?: string;
}

type SortField = 'fornecedorNome' | 'valorTotalR$' | 'pastaId' | 'categoriaInsumo' | 'dataCotacao' | 'status';

// Helper para formatar data em DD-MM-AAAA
const formatDateBR = (dateStr?: string) => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-AAAA
  }
  return dateStr;
};

export default function Cotacoes() {
  const [orcamentosList, setOrcamentosList] = useState<any[]>([]);
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string>('');
  const [loadingOrcamentos, setLoadingOrcamentos] = useState<boolean>(true);
  const [searchOrcamento, setSearchOrcamento] = useState<string>('');

  // Estado para Minimizar/Expandir Painel Lateral de Orçamentos
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const [cotacoes, setCotacoes] = useState<CotacaoAnexo[]>([]);
  const [searchCotacao, setSearchCotacao] = useState<string>('');
  const [filterPasta, setFilterPasta] = useState<string>('todas');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Duas Abas Principais: 'anexos' | 'pastas'
  const [activeMainTab, setActiveMainTab] = useState<'anexos' | 'pastas'>('anexos');

  // Sistema de Pastas
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null = lista de pastas, ou ID da pasta aberta
  const [isFolderModalOpen, setIsFolderModalOpen] = useState<boolean>(false);
  const [novaPastaNome, setNovaPastaNome] = useState<string>('');

  // Ordenação de Colunas na Tabela
  const [sortField, setSortField] = useState<SortField>('fornecedorNome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Hover Popover State
  const [hoveredCotacao, setHoveredCotacao] = useState<CotacaoAnexo | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modal de Nova Cotação / Upload
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  // Form State
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [contatoVendedor, setContatoVendedor] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [categoriaInsumo, setCategoriaInsumo] = useState('Aço Estrutural');
  const [valorTotalR$, setValorTotalR$] = useState('');
  const [prazoEntregaDias, setPrazoEntregaDias] = useState('');
  const [condicoesPagamento, setCondicoesPagamento] = useState('30 DD / 60 DD');
  const [status, setStatus] = useState<'Em Análise' | 'Aprovada' | 'Recusada' | 'Vencedora'>('Em Análise');
  const [observacoes, setObservacoes] = useState('');
  const [targetPastaId, setTargetPastaId] = useState<string>('sem_pasta');

  // Arquivo Selecionado
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 1. Carregar Orçamentos do Banco de Dados (AGRUPADOS POR CÓDIGO BASE - APENAS ÚLTIMA REVISÃO)
  const fetchOrcamentos = useCallback(async () => {
    setLoadingOrcamentos(true);
    try {
      const { data, error } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('id, codigo, cliente, projeto, nome, created_at, status, revisao')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar orçamentos:', error);
      } else if (data && data.length > 0) {
        const latestByProjectMap = new Map<string, any>();

        data.forEach((orc) => {
          const parts = (orc.codigo || '').split('.');
          const baseCode = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : (orc.projeto || orc.nome || orc.id);

          const existing = latestByProjectMap.get(baseCode);
          if (!existing) {
            latestByProjectMap.set(baseCode, { ...orc, baseCode });
          } else {
            const revExisting = parseInt(existing.revisao || '0', 10);
            const revCurrent = parseInt(orc.revisao || '0', 10);
            if (revCurrent > revExisting || new Date(orc.created_at) > new Date(existing.created_at)) {
              latestByProjectMap.set(baseCode, { ...orc, baseCode });
            }
          }
        });

        const uniqueLatestOrcamentos = Array.from(latestByProjectMap.values());
        setOrcamentosList(uniqueLatestOrcamentos);

        if (!selectedOrcamentoId && uniqueLatestOrcamentos.length > 0) {
          setSelectedOrcamentoId(uniqueLatestOrcamentos[0].id);
        }
      }
    } catch (err) {
      console.error('Falha ao conectar com banco:', err);
    } finally {
      setLoadingOrcamentos(false);
    }
  }, [selectedOrcamentoId]);

  useEffect(() => {
    fetchOrcamentos();
  }, [fetchOrcamentos]);

  const selectedOrcamentoObj = orcamentosList.find(o => o.id === selectedOrcamentoId);
  const currentBaseCode = selectedOrcamentoObj?.baseCode || selectedOrcamentoId;

  // 2. Carregar Cotações e Pastas para o Projeto Selecionado
  const fetchCotacoesForOrcamento = useCallback(() => {
    if (!currentBaseCode) return;

    try {
      const cotacoesKey = `cotacoes_projeto_${currentBaseCode}`;
      const pastasKey = `pastas_projeto_${currentBaseCode}`;

      const savedCotacoes = localStorage.getItem(cotacoesKey);
      const savedPastas = localStorage.getItem(pastasKey);

      if (savedCotacoes) {
        setCotacoes(JSON.parse(savedCotacoes));
      } else {
        setCotacoes([]);
      }

      if (savedPastas) {
        setPastas(JSON.parse(savedPastas));
      } else {
        setPastas([]);
      }
    } catch (err) {
      console.error('Erro ao ler cotações arquivadas:', err);
    }
  }, [currentBaseCode]);

  useEffect(() => {
    fetchCotacoesForOrcamento();
  }, [currentBaseCode, fetchCotacoesForOrcamento]);

  const saveCotacoesList = (newList: CotacaoAnexo[]) => {
    setCotacoes(newList);
    if (currentBaseCode) {
      localStorage.setItem(`cotacoes_projeto_${currentBaseCode}`, JSON.stringify(newList));
    }
  };

  const savePastas = (newPastas: Pasta[]) => {
    setPastas(newPastas);
    if (currentBaseCode) {
      localStorage.setItem(`pastas_projeto_${currentBaseCode}`, JSON.stringify(newPastas));
    }
  };

  // Criar Nova Pasta
  const handleCriarPasta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaPastaNome.trim()) return;

    const newFolder: Pasta = {
      id: `pasta-${Date.now()}`,
      nome: novaPastaNome.trim()
    };

    const updatedPastas = [...pastas, newFolder];
    savePastas(updatedPastas);
    setNovaPastaNome('');
    setIsFolderModalOpen(false);
    setSelectedFolderId(newFolder.id);
  };

  const handleExcluirPasta = (pastaId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta pasta? Os anexos contidos nela retornarão para "Sem Pasta".')) {
      const updatedPastas = pastas.filter(p => p.id !== pastaId);
      savePastas(updatedPastas);

      const updatedCotacoes = cotacoes.map(c => c.pastaId === pastaId ? { ...c, pastaId: 'sem_pasta' } : c);
      saveCotacoesList(updatedCotacoes);

      if (selectedFolderId === pastaId) {
        setSelectedFolderId(null);
      }
    }
  };

  // Mover Cotação para Pasta
  const handleMoverParaPasta = (cotacaoId: string, targetFolderId: string) => {
    const updated = cotacoes.map(c => c.id === cotacaoId ? { ...c, pastaId: targetFolderId } : c);
    saveCotacoesList(updated);
  };

  // Handler de Seleção de Arquivo Anexo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Submeter Nova Cotação com Anexo
  const handleSubmitCotacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fornecedorNome || !valorTotalR$ || !currentBaseCode) {
      alert('Por favor, preencha o Nome do Fornecedor e o Valor Total da Cotação.');
      return;
    }

    setUploadingFile(true);

    try {
      let fileUrl = '';
      let fileName = selectedFile ? selectedFile.name : undefined;
      let fileSize = selectedFile ? Math.round(selectedFile.size / 1024) : undefined;
      let fileType = selectedFile ? selectedFile.type : undefined;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePathInStorage = `projeto_${currentBaseCode}/${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;

        try {
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('cotacoes_anexos')
            .upload(filePathInStorage, selectedFile, { upsert: true });

          if (!uploadErr && uploadData) {
            const { data: publicUrlData } = supabase.storage.from('cotacoes_anexos').getPublicUrl(filePathInStorage);
            fileUrl = publicUrlData.publicUrl;
          }
        } catch (storageErr) {
          console.warn('Supabase storage fallback:', storageErr);
        }

        if (!fileUrl && selectedFile) {
          fileUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(selectedFile);
          });
        }
      }

      const newCotacao: CotacaoAnexo = {
        id: `cot-${Date.now()}`,
        orcamentoId: selectedOrcamentoId,
        baseCode: currentBaseCode,
        fornecedorNome,
        cnpj,
        contatoVendedor,
        telefone,
        email,
        categoriaInsumo,
        valorTotalR$: parseFloat(valorTotalR$.replace(',', '.')) || 0,
        prazoEntregaDias: prazoEntregaDias ? parseInt(prazoEntregaDias, 10) : undefined,
        condicoesPagamento,
        status,
        dataCotacao: new Date().toISOString().split('T')[0],
        observacoes,
        pastaId: targetPastaId,
        nomeArquivo: fileName,
        tamanhoKb: fileSize,
        tipoArquivo: fileType,
        urlDownload: fileUrl
      };

      const updated = [newCotacao, ...cotacoes];
      saveCotacoesList(updated);

      setIsModalOpen(false);
      setFornecedorNome('');
      setCnpj('');
      setContatoVendedor('');
      setTelefone('');
      setEmail('');
      setValorTotalR$('');
      setPrazoEntregaDias('');
      setObservacoes('');
      setSelectedFile(null);
    } catch (err) {
      console.error('Erro ao submeter cotação:', err);
      alert('Erro ao anexar cotação.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteCotacao = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta cotação arquivada?')) {
      const updated = cotacoes.filter(c => c.id !== id);
      saveCotacoesList(updated);
    }
  };

  const handleToggleVencedora = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated: CotacaoAnexo[] = cotacoes.map(c => {
      if (c.id === id) {
        const newStatus: 'Em Análise' | 'Vencedora' = c.status === 'Vencedora' ? 'Em Análise' : 'Vencedora';
        return { ...c, status: newStatus };
      }
      return c;
    });
    saveCotacoesList(updated);
  };

  // Alternar Ordenação de Colunas
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Helper para obter nome da pasta
  const getFolderName = (pastaId?: string) => {
    if (!pastaId || pastaId === 'sem_pasta') return 'Sem Pasta';
    return pastas.find(p => p.id === pastaId)?.nome || 'Sem Pasta';
  };

  // Cotações Processadas (Filtradas por Busca, Pasta, Categoria, Status e Ordenadas)
  const cotacoesProcessadas = useMemo(() => {
    let result = cotacoes.filter(c => {
      const query = searchCotacao.toLowerCase();
      const matchSearch = c.fornecedorNome.toLowerCase().includes(query) ||
                          (c.categoriaInsumo || '').toLowerCase().includes(query) ||
                          (c.nomeArquivo || '').toLowerCase().includes(query);
      const matchCat = filterCategoria === 'todas' || c.categoriaInsumo === filterCategoria;
      const matchStatus = filterStatus === 'todos' || c.status === filterStatus;
      
      let matchFolder = true;
      if (filterPasta !== 'todas') {
        if (filterPasta === 'sem_pasta') {
          matchFolder = !c.pastaId || c.pastaId === 'sem_pasta';
        } else {
          matchFolder = c.pastaId === filterPasta;
        }
      } else if (activeMainTab === 'pastas' && selectedFolderId !== null) {
        if (selectedFolderId === 'sem_pasta') {
          matchFolder = !c.pastaId || c.pastaId === 'sem_pasta';
        } else {
          matchFolder = c.pastaId === selectedFolderId;
        }
      }

      return matchSearch && matchCat && matchStatus && matchFolder;
    });

    result.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'fornecedorNome') {
        valA = a.fornecedorNome.toLowerCase();
        valB = b.fornecedorNome.toLowerCase();
      } else if (sortField === 'valorTotalR$') {
        valA = a.valorTotalR$;
        valB = b.valorTotalR$;
      } else if (sortField === 'pastaId') {
        valA = getFolderName(a.pastaId).toLowerCase();
        valB = getFolderName(b.pastaId).toLowerCase();
      } else if (sortField === 'categoriaInsumo') {
        valA = (a.categoriaInsumo || '').toLowerCase();
        valB = (b.categoriaInsumo || '').toLowerCase();
      } else if (sortField === 'dataCotacao') {
        valA = a.dataCotacao;
        valB = b.dataCotacao;
      } else if (sortField === 'status') {
        valA = a.status;
        valB = b.status;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [cotacoes, searchCotacao, filterPasta, filterCategoria, filterStatus, activeMainTab, selectedFolderId, sortField, sortDirection, pastas]);

  // Lista de Orçamentos Filtrada
  const orcamentosFiltrados = orcamentosList.filter(o => {
    const query = searchOrcamento.toLowerCase();
    const codigo = (o.codigo || '').toLowerCase();
    const cliente = (o.cliente || '').toLowerCase();
    const projeto = (o.projeto || o.nome || '').toLowerCase();
    return codigo.includes(query) || cliente.includes(query) || projeto.includes(query);
  });

  // Estatísticas DINÂMICAS & REATIVAS aos Filtros e Pastas Selecionadas
  const totalAnexosFiltrados = cotacoesProcessadas.length;
  const menorCotacaoFiltrada = cotacoesProcessadas.length > 0 ? Math.min(...cotacoesProcessadas.map(c => c.valorTotalR$)) : 0;
  const maiorCotacaoFiltrada = cotacoesProcessadas.length > 0 ? Math.max(...cotacoesProcessadas.map(c => c.valorTotalR$)) : 0;

  // Cálculo da Porcentagem de Economia entre o menor e o maior valor cotado
  const diferencaEconomiaR$ = maiorCotacaoFiltrada - menorCotacaoFiltrada;
  const percentualEconomia = maiorCotacaoFiltrada > 0 && diferencaEconomiaR$ > 0
    ? Math.round((diferencaEconomiaR$ / maiorCotacaoFiltrada) * 1000) / 10
    : 0;

  // Handlers para Hover Popover
  const handleMouseEnterRow = (e: React.MouseEvent, cot: CotacaoAnexo) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopoverPos({
      x: rect.left + rect.width / 3,
      y: rect.top - 10
    });
    setHoveredCotacao(cot);
  };

  const handleMouseLeaveRow = () => {
    setHoveredCotacao(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER DE COTAÇÕES */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              Gestão de Cotações & Suprimentos por Obra
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Anexos & Propostas Comerciais de Fornecedores
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-blue-600 inline" />
            <span>
              Arquivado em <strong>Supabase Cloud Storage & Servidor BRP Engenharia</strong> com navegação em Abas de Anexos e Pastas.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs border border-slate-300"
            title={isSidebarCollapsed ? 'Expandir Lista de Orçamentos' : 'Minimizar Lista de Orçamentos'}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4 text-blue-600" /> : <PanelLeftClose className="w-4 h-4 text-slate-600" />}
            <span className="hidden sm:inline">{isSidebarCollapsed ? 'Expandir Orçamentos' : 'Minimizar Lista'}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!selectedOrcamentoId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Anexar Nova Cotação</span>
          </button>
        </div>
      </div>

      {/* LAYOUT PRINCIPAL RECONFIGURADO: PAINEL ESQUERDO RECOLHÍVEL + ÁREA DE ANEXOS EXPANDIDA */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* PAINEL ESQUERDO: LISTA DE ORÇAMENTOS (RECOLHÍVEL A APENAS ÍCONES CLEAN) */}
        <div 
          className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs transition-all duration-300 flex flex-col shrink-0 ${
            isSidebarCollapsed ? 'w-full lg:w-14 h-[780px]' : 'w-full lg:w-72 h-[780px]'
          }`}
        >
          {/* MODO RECOLHIDO (APENAS ÍCONE DO PRÉDIO CLEAN E SETA) */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center h-full py-3 px-1 space-y-3 bg-slate-50 border-r border-slate-200">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors cursor-pointer"
                title="Expandir Lista de Orçamentos"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="w-8 h-px bg-slate-200" />

              <div className="flex-1 overflow-y-auto w-full space-y-2 flex flex-col items-center">
                {orcamentosFiltrados.map((orc) => {
                  const isSelected = orc.id === selectedOrcamentoId;
                  return (
                    <button
                      key={orc.id}
                      onClick={() => {
                        setSelectedOrcamentoId(orc.id);
                        setSelectedFolderId(null);
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                      title={`${orc.codigo || 'S/ Cód.'} - ${orc.projeto || orc.nome}`}
                    >
                      <Building2 className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* MODO EXPANDIDO (LARGURA PADRÃO OTIMIZADA) */
            <>
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-700" />
                      Orçamentos ({orcamentosFiltrados.length})
                    </h3>
                    <span className="text-[10px] text-slate-500 block font-medium">Última revisão por obra</span>
                  </div>

                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1.5 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Minimizar Painel Lateral"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por código, cliente..."
                    value={searchOrcamento}
                    onChange={(e) => setSearchOrcamento(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
                {loadingOrcamentos ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium">Carregando orçamentos da empresa...</div>
                ) : orcamentosFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">Nenhum orçamento encontrado.</div>
                ) : (
                  orcamentosFiltrados.map((orc) => {
                    const isSelected = orc.id === selectedOrcamentoId;
                    return (
                      <div
                        key={orc.id}
                        onClick={() => {
                          setSelectedOrcamentoId(orc.id);
                          setSelectedFolderId(null);
                        }}
                        className={`p-3 rounded-xl transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 shadow-2xs'
                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-extrabold text-[11px] text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                            {orc.codigo || 'S/ Cód.'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            Rev. {orc.revisao || '00'}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {orc.projeto || orc.nome || 'Orçamento sem nome'}
                        </h4>

                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                          <span className="truncate">Cliente: {orc.cliente || 'Não informado'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* ÁREA DIREITA PRINCIPAL: PAINEL DE COTAÇÕES (OCUPA TODO O ESPAÇO RESTANTE FLUIDO FLEX-1) */}
        <div className="flex-1 min-w-0 space-y-5 w-full">
          {selectedOrcamentoObj ? (
            <>
              {/* 1. CARTÃO SUPERIOR ESCURO - EXCLUSIVO PARA INFORMAÇÕES DO ORÇAMENTO E CARDS DE MÉTRICAS DINÂMICAS */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4 border border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded uppercase">
                        {selectedOrcamentoObj.codigo}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        Última Revisão (Rev. {selectedOrcamentoObj.revisao || '00'})
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white mt-1">
                      {selectedOrcamentoObj.projeto || selectedOrcamentoObj.nome}
                    </h2>
                    <p className="text-xs text-slate-400">Cliente: {selectedOrcamentoObj.cliente || 'Não informado'}</p>
                  </div>

                  {/* CARDS DE MÉTRICAS DINÂMICAS & REATIVAS AOS FILTROS COM SETINHA DE ECONOMIA % */}
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-right min-w-[190px]">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Menor Valor Cotado</span>
                      <span className="text-sm font-mono font-extrabold text-emerald-400">
                        {menorCotacaoFiltrada > 0 ? `R$ ${menorCotacaoFiltrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/A'}
                      </span>

                      {/* INDICADOR DE ECONOMIA COM SETA PARA BAIXO ↓ */}
                      {percentualEconomia > 0 && (
                        <div className="text-[10px] font-extrabold text-emerald-400 flex items-center justify-end gap-1 mt-0.5 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/80">
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                          <span>↓ {percentualEconomia}% mais econômico</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 text-right">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Total de Anexos</span>
                      <span className="text-sm font-mono font-extrabold text-white">
                        {totalAnexosFiltrados} {totalAnexosFiltrados === 1 ? 'anexo' : 'anexos'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. PAINEL INTEGRADO DE ABAS E FILTROS COM FUNDO BRANCO CLEAN */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-4">
                {/* ABAS COM FUNDO BRANCO CLEAN */}
                <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
                  {/* ABA 1: ANEXOS */}
                  <button
                    onClick={() => {
                      setActiveMainTab('anexos');
                      setSelectedFolderId(null);
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-t border-x ${
                      activeMainTab === 'anexos'
                        ? 'bg-white text-blue-700 border-slate-300 border-b-white font-extrabold shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>📄 Anexos ({totalAnexosFiltrados})</span>
                  </button>

                  {/* ABA 2: PASTAS */}
                  <button
                    onClick={() => {
                      setActiveMainTab('pastas');
                      setSelectedFolderId(null);
                    }}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-xs font-bold transition-all cursor-pointer border-t border-x ${
                      activeMainTab === 'pastas'
                        ? 'bg-white text-amber-700 border-slate-300 border-b-white font-extrabold shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Folder className="w-4 h-4 text-amber-500" />
                    <span>📁 Pastas ({pastas.length + 1})</span>
                  </button>
                </div>

                {/* BARRA DE FILTROS COM ESPAÇAMENTO OTIMIZADO E SEM TEXTO CORTADO */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs pt-1">
                  {/* FILTRO 1: PESQUISA TEXTUAL */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar fornecedor ou arquivo..."
                      value={searchCotacao}
                      onChange={(e) => setSearchCotacao(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-xs font-medium"
                    />
                  </div>

                  {/* FILTRO 2: SELETOR DE PASTA */}
                  <div>
                    <select
                      value={filterPasta}
                      onChange={(e) => setFilterPasta(e.target.value)}
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-xs cursor-pointer truncate"
                    >
                      <option value="todas">📁 Todas as Pastas</option>
                      <option value="sem_pasta">📁 Sem Pasta (Geral)</option>
                      {pastas.map(p => (
                        <option key={p.id} value={p.id}>📁 {p.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* FILTRO 3: SELETOR DE DISCIPLINA */}
                  <div>
                    <select
                      value={filterCategoria}
                      onChange={(e) => setFilterCategoria(e.target.value)}
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-xs cursor-pointer truncate"
                    >
                      <option value="todas">Todas as Disciplinas</option>
                      <option value="Aço Estrutural">Aço Estrutural</option>
                      <option value="Concreto">Concreto</option>
                      <option value="Fôrmas">Fôrmas</option>
                      <option value="Impermeabilização">Impermeabilização</option>
                      <option value="Elétrica">Elétrica</option>
                      <option value="Hidráulica">Hidráulica</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Esquadrias">Esquadrias</option>
                      <option value="Geral">Outros / Geral</option>
                    </select>
                  </div>

                  {/* FILTRO 4: SELETOR DE STATUS */}
                  <div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full py-2 px-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-xs cursor-pointer truncate"
                    >
                      <option value="todos">Todos os Status</option>
                      <option value="Em Análise">Em Análise</option>
                      <option value="Vencedora">Vencedoras (Escolhidas)</option>
                      <option value="Aprovada">Aprovadas</option>
                      <option value="Recusada">Recusadas</option>
                    </select>
                  </div>
                </div>

                {/* ABA 1: ANEXOS (TABELA MESCLADA DIRETAMENTE SEM TÍTULO E SEM CARD INTERMEDIÁRIO) */}
                {activeMainTab === 'anexos' && (
                  <div className="pt-2">
                    <TabelaCotacoesOrdenavel
                      cotacoes={cotacoesProcessadas}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      onToggleVencedora={handleToggleVencedora}
                      onDelete={handleDeleteCotacao}
                      onMoverPasta={handleMoverParaPasta}
                      pastas={pastas}
                      onMouseEnterRow={handleMouseEnterRow}
                      onMouseLeaveRow={handleMouseLeaveRow}
                    />
                  </div>
                )}

                {/* ABA 2: PASTAS (LISTAGEM DE PASTAS DA OBRA OU ANEXOS DA PASTA ABERTA) */}
                {activeMainTab === 'pastas' && (
                  <div className="pt-2 space-y-4">
                    {selectedFolderId === null ? (
                      /* LISTAGEM DE PASTAS */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                              <Folder className="w-4 h-4 text-amber-500" />
                              Pastas do Orçamento (Clique para abrir os anexos)
                            </h3>
                            <p className="text-xs text-slate-500">Pastas criadas para categorizar cotações do projeto</p>
                          </div>

                          <button
                            onClick={() => setIsFolderModalOpen(true)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <FolderPlus className="w-4 h-4" />
                            <span>+ Criar Nova Pasta</span>
                          </button>
                        </div>

                        {/* LISTA DE PASTAS FORMATADA EM LINHAS CLEAN */}
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                          {/* PASTA 1: SEM PASTA */}
                          <div
                            onClick={() => setSelectedFolderId('sem_pasta')}
                            className="p-3.5 hover:bg-amber-50/50 transition-colors cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                                <Folder className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-xs text-slate-900 group-hover:text-amber-700 transition-colors">
                                  📁 Sem Pasta (Geral)
                                </h4>
                                <span className="text-[11px] text-slate-500">Cotações não vinculadas a pastas específicas</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                                {cotacoes.filter(c => !c.pastaId || c.pastaId === 'sem_pasta').length} anexos
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                            </div>
                          </div>

                          {/* PASTAS PERSONALIZADAS */}
                          {pastas.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400 italic">
                              Nenhuma pasta personalizada criada ainda. Clique no botão "+ Criar Nova Pasta".
                            </div>
                          ) : (
                            pastas.map((p) => {
                              const countInFolder = cotacoes.filter(c => c.pastaId === p.id).length;
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => setSelectedFolderId(p.id)}
                                  className="p-3.5 hover:bg-blue-50/50 transition-colors cursor-pointer flex items-center justify-between group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                      <Folder className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-700 transition-colors">
                                        📁 {p.nome}
                                      </h4>
                                      <span className="text-[11px] text-slate-500">Pasta de cotações organizada</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                      {countInFolder} {countInFolder === 1 ? 'anexo' : 'anexos'}
                                    </span>

                                    <button
                                      onClick={(e) => handleExcluirPasta(p.id, e)}
                                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                                      title="Excluir Pasta"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    ) : (
                      /* CONTEÚDO DE UMA PASTA ABERTA */
                      <div className="space-y-4">
                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedFolderId(null)}
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            >
                              ← Voltar para Lista de Pastas
                            </button>
                            <span className="text-slate-300">/</span>
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <FolderOpen className="w-4 h-4 text-blue-600" />
                              Pasta: {selectedFolderId === 'sem_pasta' ? 'Sem Pasta' : pastas.find(p => p.id === selectedFolderId)?.nome || 'Pasta'}
                            </span>
                          </div>

                          <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">
                            {cotacoesProcessadas.length} {cotacoesProcessadas.length === 1 ? 'anexo' : 'anexos'}
                          </span>
                        </div>

                        <TabelaCotacoesOrdenavel
                          cotacoes={cotacoesProcessadas}
                          sortField={sortField}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                          onToggleVencedora={handleToggleVencedora}
                          onDelete={handleDeleteCotacao}
                          onMoverPasta={handleMoverParaPasta}
                          pastas={pastas}
                          onMouseEnterRow={handleMouseEnterRow}
                          onMouseLeaveRow={handleMouseLeaveRow}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-700">Selecione um orçamento na lista à esquerda.</p>
              <p className="text-xs">Escolha a obra para visualizar e anexar as cotações de fornecedores.</p>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING HOVER PREVIEW CARD (PASSAR O MOUSE POR CIMA DA LINHA DA TABELA COM DATA DD-MM-AAAA) */}
      {hoveredCotacao && (
        <div
          className="fixed z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 w-80 pointer-events-none transition-opacity duration-200 space-y-2 animate-fade-in"
          style={{ top: `${Math.max(10, popoverPos.y - 180)}px`, left: `${Math.min(window.innerWidth - 340, popoverPos.x)}px` }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900 text-blue-300 uppercase">
              {hoveredCotacao.categoriaInsumo}
            </span>
            <span className="text-[10px] font-mono text-slate-400">{formatDateBR(hoveredCotacao.dataCotacao)}</span>
          </div>

          <h4 className="font-bold text-xs text-white">{hoveredCotacao.fornecedorNome}</h4>
          {hoveredCotacao.cnpj && <p className="text-[10px] text-slate-400 font-mono">CNPJ: {hoveredCotacao.cnpj}</p>}

          <div className="text-xs font-mono font-extrabold text-emerald-400 pt-1">
            Valor: R$ {hoveredCotacao.valorTotalR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>

          <div className="text-[11px] text-slate-300 space-y-0.5 pt-1 border-t border-slate-800">
            <div><strong>Contato:</strong> {hoveredCotacao.contatoVendedor || 'S/ Contato'}</div>
            <div><strong>Tel / E-mail:</strong> {hoveredCotacao.telefone || hoveredCotacao.email || 'N/A'}</div>
            <div><strong>Prazo:</strong> {hoveredCotacao.prazoEntregaDias ? `${hoveredCotacao.prazoEntregaDias} dias` : 'A combinar'}</div>
            <div><strong>Pgto:</strong> {hoveredCotacao.condicoesPagamento || 'Faturado'}</div>
          </div>

          {hoveredCotacao.observacoes && (
            <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800">
              "{hoveredCotacao.observacoes}"
            </p>
          )}
        </div>
      )}

      {/* MODAL DE CRIAR NOVA PASTA DE ORGANIZAÇÃO */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-blue-400" />
                <h4 className="font-bold text-sm">Criar Nova Pasta de Anexos</h4>
              </div>
              <button
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarPasta} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome da Pasta *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aço Estrutural, Fundações, Propostas Finais..."
                  value={novaPastaNome}
                  onChange={(e) => setNovaPastaNome(e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900 outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Criar Pasta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ANEXAR NOVA COTAÇÃO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <h4 className="font-bold text-sm">Anexar Nova Cotação de Fornecedor</h4>
                <p className="text-xs text-slate-400">Vincular proposta comercial ao orçamento selecionado</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCotacao} className="p-5 space-y-4 text-xs">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-blue-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Arquivamento Seguro:</strong> O arquivo da proposta (PDF/Excel) será armazenado no Supabase Cloud Storage.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Fornecedor / Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gerdau Aços, Engemix, Tigre..."
                  value={fornecedorNome}
                  onChange={(e) => setFornecedorNome(e.target.value)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNPJ do Fornecedor</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-slate-900 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Disciplina / Categoria Insumo</label>
                  <select
                    value={categoriaInsumo}
                    onChange={(e) => setCategoriaInsumo(e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Aço Estrutural">Aço Estrutural</option>
                    <option value="Concreto">Concreto</option>
                    <option value="Fôrmas">Fôrmas</option>
                    <option value="Impermeabilização">Impermeabilização</option>
                    <option value="Elétrica">Elétrica</option>
                    <option value="Hidráulica">Hidráulica</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Esquadrias">Esquadrias</option>
                    <option value="Geral">Outros / Geral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Total da Cotação (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={valorTotalR$}
                    onChange={(e) => setValorTotalR$(e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-emerald-600 font-extrabold text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pasta de Destino</label>
                  <select
                    value={targetPastaId}
                    onChange={(e) => setTargetPastaId(e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="sem_pasta">📁 Sem Pasta</option>
                    {pastas.map(p => (
                      <option key={p.id} value={p.id}>📁 {p.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contato Vendedor / E-mail</label>
                  <input
                    type="text"
                    placeholder="Nome do representante"
                    value={contatoVendedor}
                    onChange={(e) => setContatoVendedor(e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Condições de Pagamento</label>
                  <input
                    type="text"
                    placeholder="Ex: 30 / 60 dias"
                    value={condicoesPagamento}
                    onChange={(e) => setCondicoesPagamento(e.target.value)}
                    className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Inicial da Cotação</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full h-9 px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Em Análise">Em Análise</option>
                  <option value="Aprovada">Aprovada</option>
                  <option value="Vencedora">Vencedora (Selecionada)</option>
                  <option value="Recusada">Recusada</option>
                </select>
              </div>

              {/* SELEÇÃO DO ARQUIVO ANEXO */}
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 p-4 rounded-xl text-center bg-slate-50 transition-colors">
                <Upload className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                <label className="block font-bold text-slate-800 cursor-pointer mb-0.5">
                  Clique para selecionar o arquivo da proposta (PDF, Excel, Imagem)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  id="cotacao-file-input"
                />
                <label
                  htmlFor="cotacao-file-input"
                  className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs mt-1 cursor-pointer transition-colors"
                >
                  Selecionar Arquivo
                </label>

                {selectedFile && (
                  <div className="mt-2 text-xs font-semibold text-emerald-700 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Arquivo selecionado: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações Gerais</label>
                <textarea
                  rows={2}
                  placeholder="Inclusão de frete, impostos, validade da proposta..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-xl font-bold text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {uploadingFile ? 'Arquivando...' : 'Salvar & Arquivar Cotação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPONENTE TABELA ORDENÁVEL COM BOTÃO CHECK DE VENCEDORA
interface TabelaProps {
  cotacoes: CotacaoAnexo[];
  sortField: SortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  onToggleVencedora: (id: string, e?: React.MouseEvent) => void;
  onDelete: (id: string, e?: React.MouseEvent) => void;
  onMoverPasta: (cotacaoId: string, targetFolderId: string) => void;
  pastas: Pasta[];
  onMouseEnterRow: (e: React.MouseEvent, cot: CotacaoAnexo) => void;
  onMouseLeaveRow: () => void;
}

const TabelaCotacoesOrdenavel: React.FC<TabelaProps> = ({
  cotacoes,
  sortField,
  sortDirection,
  onSort,
  onToggleVencedora,
  onDelete,
  onMoverPasta,
  pastas,
  onMouseEnterRow,
  onMouseLeaveRow
}) => {
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40 inline ml-1" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600 inline ml-1" /> : <ArrowDown className="w-3 h-3 text-blue-600 inline ml-1" />;
  };

  if (cotacoes.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400">
        <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-semibold text-sm text-slate-700">Nenhum anexo encontrado para os filtros ou pasta selecionada.</p>
        <p className="text-xs mt-1">Clique no botão "+ Anexar Nova Cotação" para adicionar propostas comerciais.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3 w-12 text-center">Vencedora</th>
              <th 
                onClick={() => onSort('fornecedorNome')}
                className="py-3 px-3 cursor-pointer hover:bg-slate-200/60 transition-colors select-none min-w-[160px]"
              >
                Fornecedor / Razão Social {getSortIcon('fornecedorNome')}
              </th>
              <th 
                onClick={() => onSort('pastaId')}
                className="py-3 px-3 w-36 cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
              >
                Pasta {getSortIcon('pastaId')}
              </th>
              <th 
                onClick={() => onSort('categoriaInsumo')}
                className="py-3 px-3 w-32 cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
              >
                Disciplina {getSortIcon('categoriaInsumo')}
              </th>
              <th 
                onClick={() => onSort('valorTotalR$')}
                className="py-3 px-3 w-32 text-right cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
              >
                Valor Proposta {getSortIcon('valorTotalR$')}
              </th>
              <th className="py-3 px-3 w-20 text-center">Prazo</th>
              <th 
                onClick={() => onSort('dataCotacao')}
                className="py-3 px-3 w-28 cursor-pointer hover:bg-slate-200/60 transition-colors select-none"
              >
                Data {getSortIcon('dataCotacao')}
              </th>
              <th className="py-3 px-3 w-28 text-center">Anexo</th>
              <th className="py-3 px-3 w-12 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cotacoes.map((cot) => {
              const isVencedora = cot.status === 'Vencedora';
              return (
                <tr
                  key={cot.id}
                  onMouseEnter={(e) => onMouseEnterRow(e, cot)}
                  onMouseLeave={onMouseLeaveRow}
                  className={`transition-colors relative group ${
                    isVencedora ? 'bg-emerald-50/70 font-semibold' : 'hover:bg-blue-50/40'
                  }`}
                >
                  {/* BOTÃO CHECK VENCEDORA */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={(e) => onToggleVencedora(cot.id, e)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer border mx-auto ${
                        isVencedora
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white text-slate-300 hover:text-emerald-600 hover:border-emerald-400 border-slate-300'
                      }`}
                      title={isVencedora ? 'Cotação Vencedora (Clique para desmarcar)' : 'Marcar como Vencedora'}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                  </td>

                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{cot.fornecedorNome}</span>
                      {isVencedora && (
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                          ★ Vencedora
                        </span>
                      )}
                    </div>
                    {cot.cnpj && <span className="text-[10px] text-slate-400 font-mono block">CNPJ: {cot.cnpj}</span>}
                  </td>

                  <td className="py-2.5 px-3">
                    <select
                      value={cot.pastaId || 'sem_pasta'}
                      onChange={(e) => onMoverPasta(cot.id, e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer truncate"
                    >
                      <option value="sem_pasta">📁 Sem Pasta</option>
                      {pastas.map(p => (
                        <option key={p.id} value={p.id}>📁 {p.nome}</option>
                      ))}
                    </select>
                  </td>

                  <td className="py-2.5 px-3 font-medium text-slate-700">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold inline-block truncate max-w-full">
                      {cot.categoriaInsumo}
                    </span>
                  </td>

                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                    R$ {cot.valorTotalR$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>

                  <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                    {cot.prazoEntregaDias ? `${cot.prazoEntregaDias}d` : '-'}
                  </td>

                  {/* DATA FORMATADA EM DD-MM-AAAA */}
                  <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                    {formatDateBR(cot.dataCotacao)}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    {cot.urlDownload ? (
                      <a
                        href={cot.urlDownload}
                        download={cot.nomeArquivo}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Baixar</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">S/ Anexo</span>
                    )}
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={(e) => onDelete(cot.id, e)}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                      title="Excluir Cotação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
