import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, FileText, Sparkles, ArrowLeft, Plus, Sliders, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DocumentoMemorialOficial } from '../components/calculos/DocumentoMemorialOficial';
import { GerenciadorFormulas } from '../components/calculos/GerenciadorFormulas';
import { TabelaMemoriaisCalculo, type MemorialCalculoRecord } from '../components/calculos/TabelaMemoriaisCalculo';
import { TabelaParametrosCadastro } from '../components/calculos/TabelaParametrosCadastro';
import type { ItemMemoriaOficial, DadosComplementaresHeader } from '../types/calculos';

const LOCAL_STORAGE_MEMORIAIS_KEY = 'brp_memoriais_list';

const ESTADOS_BRASIL_LIST = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
];

const formatCidadeUpperNoAccents = (text: string) => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
};

export default function CalculosQuantitativosPage() {
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState<'memorial' | 'formulas' | 'parametros'>('memorial');
  
  const [memoriaisList, setMemoriaisList] = useState<MemorialCalculoRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_MEMORIAIS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeMemorialId, setActiveMemorialId] = useState<string | null>(null);
  const activeMemorial = memoriaisList.find(m => m.id === activeMemorialId) || null;

  const [usuariosCadastrados, setUsuariosCadastrados] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [createModalMode, setCreateModalMode] = useState<'memorial' | 'orcamento'>('memorial');
  const [targetMemorialForOrcamento, setTargetMemorialForOrcamento] = useState<MemorialCalculoRecord | null>(null);
  const [newOrcamentoData, setNewOrcamentoData] = useState({
    codigo: '',
    projeto: '',
    cliente: '',
    gestor_cliente: '',
    responsavel: '',
    cidade: '',
    estado: 'GO'
  });

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const { data: engData } = await supabase
          .schema('engenharia')
          .from('usuarios')
          .select('id, nome, email, status')
          .order('nome', { ascending: true });

        if (engData && engData.length > 0) {
          const valid = engData.filter((u: any) => u.nome && u.nome !== 'Time Comercial' && u.status !== 'excluido');
          setUsuariosCadastrados(valid);
          return;
        }

        const { data: pubData } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .order('nome', { ascending: true });
        if (pubData) setUsuariosCadastrados(pubData);
      } catch (e) {
        console.error('Erro ao buscar usuários:', e);
      }
    };
    fetchUsuarios();
  }, []);

  const fetchTodosMemoriaisEOrcamentos = useCallback(async () => {
    try {
      let avulsos: MemorialCalculoRecord[] = [];
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_MEMORIAIS_KEY);
        avulsos = saved ? JSON.parse(saved) : [];
      } catch (e) {}

      let dbOrcamentos: any[] = [];
      try {
        const { data } = await supabase
          .schema('engenharia')
          .from('orcamentos')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) dbOrcamentos = data;
      } catch (e) {}

      let dbImportados: any[] = [];
      try {
        const { data } = await supabase
          .schema('engenharia')
          .from('orcamentos_importados')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) dbImportados = data;
      } catch (e) {}

      let localOrcamentos: any[] = [];
      try {
        const rawLocal = JSON.parse(localStorage.getItem('brp_orcamentos_list') || '[]');
        localOrcamentos = Array.isArray(rawLocal) ? rawLocal : [];
      } catch (e) {}

      const mapOrcamentos = new Map<string, any>();
      dbOrcamentos.forEach(o => {
        if (o.id) mapOrcamentos.set(String(o.id), o);
        if (o.codigo) mapOrcamentos.set(String(o.codigo).trim(), o);
      });
      localOrcamentos.forEach(o => {
        if (o.id && !mapOrcamentos.has(String(o.id))) mapOrcamentos.set(String(o.id), o);
        if (o.codigo && !mapOrcamentos.has(String(o.codigo).trim())) mapOrcamentos.set(String(o.codigo).trim(), o);
      });

      const orcamentosConvertidos: MemorialCalculoRecord[] = Array.from(mapOrcamentos.values()).map((orc: any) => {
        let itensMemoria: ItemMemoriaOficial[] = [];
        try {
          const raw = localStorage.getItem(`orcamento_calculos_${orc.id}`);
          if (raw) itensMemoria = JSON.parse(raw);
        } catch (e) {}

        let headerData: DadosComplementaresHeader = {
          codigoOrcamento: orc.codigo || '',
          nomeProjeto: orc.projeto || orc.nome || '',
          cliente: orc.cliente || '',
          gestorCliente: orc.gestor_cliente || '',
          responsavel: orc.responsavel || '',
          cidade: orc.cidade || '',
          estado: orc.estado || 'GO',
          objeto: '',
          obra: orc.nome || '',
          local: orc.local_obra || '',
          trecho: '',
          extensaoM: 0,
          dadosComplementares: []
        };

        try {
          const savedHeader = localStorage.getItem(`orcamento_header_${orc.id}`);
          if (savedHeader) {
            headerData = { ...headerData, ...JSON.parse(savedHeader) };
          }
        } catch (e) {}

        const rawLoc = (orc.local_obra || '').split('-');
        const cid = (orc.cidade || (rawLoc.length > 0 ? rawLoc[0].trim() : '') || '').toUpperCase();
        const est = (orc.estado || (rawLoc.length > 1 ? rawLoc[1].trim() : '') || 'GO').toUpperCase();

        return {
          id: `orc-${orc.id}`,
          codigoOrcamento: orc.codigo || `ORC-${orc.id}`,
          nomeProjeto: (orc.projeto || orc.nome || '').replace(/^Orçamento\s*-\s*/i, ''),
          cliente: orc.cliente || '',
          gestorCliente: orc.gestor_cliente || '',
          responsavel: orc.responsavel || '',
          cidade: cid,
          estado: est,
          status: 'Vinculado a Orçamento' as const,
          dataAtualizacao: orc.created_at ? new Date(orc.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
          header: headerData,
          itens: itensMemoria,
          isOrcamentoNativo: true,
          orcamentoId: String(orc.id)
        };
      });

      const importadosConvertidos: MemorialCalculoRecord[] = dbImportados.map((imp: any) => {
        let itensMemoria: ItemMemoriaOficial[] = [];
        try {
          const raw = localStorage.getItem(`importado_calculos_${imp.id}`);
          if (raw) itensMemoria = JSON.parse(raw);
        } catch (e) {}

        return {
          id: `imp-${imp.id}`,
          codigoOrcamento: imp.codigo || `IMP-${imp.id}`,
          nomeProjeto: imp.nome || imp.arquivo_nome || 'Planilha Importada',
          cliente: imp.cliente || '',
          gestorCliente: imp.gestor_cliente || '',
          responsavel: imp.responsavel || '',
          cidade: (imp.cidade || '').toUpperCase(),
          estado: (imp.estado || 'GO').toUpperCase(),
          status: 'Vinculado a Orçamento' as const,
          dataAtualizacao: imp.created_at ? new Date(imp.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
          header: {
            codigoOrcamento: imp.codigo || '',
            nomeProjeto: imp.nome || '',
            cliente: imp.cliente || '',
            gestorCliente: imp.gestor_cliente || '',
            responsavel: imp.responsavel || '',
            cidade: imp.cidade || '',
            estado: imp.estado || 'GO',
            objeto: '',
            obra: imp.nome || '',
            local: '',
            trecho: '',
            extensaoM: 0,
            dadosComplementares: []
          },
          itens: itensMemoria,
          isImportado: true,
          importadoId: String(imp.id)
        };
      });

      const combinedMap = new Map<string, MemorialCalculoRecord>();
      avulsos.forEach(item => {
        const key = item.codigoOrcamento ? item.codigoOrcamento.trim() : item.id;
        combinedMap.set(key, item);
      });
      orcamentosConvertidos.forEach(item => {
        const key = item.codigoOrcamento ? item.codigoOrcamento.trim() : item.id;
        combinedMap.set(key, item);
      });
      importadosConvertidos.forEach(item => {
        const key = item.codigoOrcamento ? item.codigoOrcamento.trim() : item.id;
        if (!combinedMap.has(key)) combinedMap.set(key, item);
      });

      setMemoriaisList(Array.from(combinedMap.values()));
    } catch (e) {
      console.error('Erro ao consolidar memoriais e orçamentos:', e);
    }
  }, []);

  useEffect(() => {
    fetchTodosMemoriaisEOrcamentos();
  }, [fetchTodosMemoriaisEOrcamentos]);

  const handleSaveMemoriaisList = (newList: MemorialCalculoRecord[]) => {
    setMemoriaisList(newList);
    try {
      const avulsos = newList.filter(m => !m.isOrcamentoNativo && !m.isImportado);
      localStorage.setItem(LOCAL_STORAGE_MEMORIAIS_KEY, JSON.stringify(avulsos));
    } catch (e) {
      console.error('Erro ao salvar memoriais no localStorage:', e);
    }
  };

  const generateNextOrcamentoCode = async (): Promise<string> => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const ddmm = `${day}${month}`;
    const year = now.getFullYear();

    try {
      const { data } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('codigo');

      let nextSeq = 1;
      if (data && data.length > 0) {
        const seqs = data.map((o: any) => {
          const parts = (o.codigo || '').split('.');
          if (parts.length >= 2) {
            const num = parseInt(parts[1], 10);
            return isNaN(num) ? 0 : num;
          }
          return 0;
        });
        const maxSeq = Math.max(...seqs);
        nextSeq = maxSeq + 1;
      }
      return `${ddmm}.${String(nextSeq).padStart(3, '0')}.0-${year}`;
    } catch {
      const numComCodigo = memoriaisList.filter(m => m.codigoOrcamento).length + 1;
      return `${ddmm}.${String(numComCodigo).padStart(3, '0')}.0-${year}`;
    }
  };

  const handleOpenCreateMemorialModal = async () => {
    const nextCode = await generateNextOrcamentoCode();
    const defaultResp = usuariosCadastrados.length > 0 ? usuariosCadastrados[0].nome : '';
    setNewOrcamentoData({
      codigo: nextCode,
      projeto: '',
      cliente: '',
      gestor_cliente: '',
      responsavel: defaultResp,
      cidade: '',
      estado: 'GO'
    });
    setCreateModalMode('memorial');
    setIsCreateModalOpen(true);
  };

  const handleOpenGerarOrcamentoModal = async (targetMem?: MemorialCalculoRecord) => {
    const mem = targetMem || activeMemorial;
    if (!mem) return;

    if (!mem.itens || mem.itens.length === 0) {
      alert('Adicione ao menos uma linha na memória antes de criar o orçamento.');
      return;
    }

    const nextCode = mem.codigoOrcamento || (await generateNextOrcamentoCode());
    const defaultResp = mem.responsavel || mem.header?.responsavel || (usuariosCadastrados.length > 0 ? usuariosCadastrados[0].nome : '');

    setTargetMemorialForOrcamento(mem);
    setNewOrcamentoData({
      codigo: nextCode,
      projeto: mem.nomeProjeto || mem.header?.nomeProjeto || '',
      cliente: mem.cliente || mem.header?.cliente || '',
      gestor_cliente: mem.gestorCliente || mem.header?.gestorCliente || '',
      responsavel: defaultResp,
      cidade: mem.cidade || mem.header?.cidade || '',
      estado: mem.estado || mem.header?.estado || 'GO'
    });
    setCreateModalMode('orcamento');
    setIsCreateModalOpen(true);
  };

  const handleDeleteMemorial = async (id: string) => {
    const target = memoriaisList.find(m => m.id === id);
    if (!target) return;

    if (!confirm(`Tem certeza que deseja excluir permanentemente a memória de cálculo "${target.codigoOrcamento || target.nomeProjeto || 'Selecionada'}"?`)) return;

    const newList = memoriaisList.filter(m => m.id !== id);
    setMemoriaisList(newList);

    try {
      const savedMem = JSON.parse(localStorage.getItem(LOCAL_STORAGE_MEMORIAIS_KEY) || '[]');
      const filteredMem = savedMem.filter((m: any) => 
        m.id !== id && 
        (target.codigoOrcamento ? m.codigoOrcamento !== target.codigoOrcamento : true) &&
        (target.orcamentoId ? m.orcamentoId !== target.orcamentoId : true)
      );
      localStorage.setItem(LOCAL_STORAGE_MEMORIAIS_KEY, JSON.stringify(filteredMem));
    } catch (e) {}

    try {
      const savedOrc = JSON.parse(localStorage.getItem('brp_orcamentos_list') || '[]');
      const targetOrcId = target.orcamentoId || (id.startsWith('orc-') ? id.replace('orc-', '') : id);
      const filteredOrc = savedOrc.filter((o: any) => 
        String(o.id) !== String(targetOrcId) && 
        String(o.id) !== String(id) && 
        (target.codigoOrcamento ? o.codigo !== target.codigoOrcamento : true)
      );
      localStorage.setItem('brp_orcamentos_list', JSON.stringify(filteredOrc));
    } catch (e) {}

    if (target.isOrcamentoNativo || target.orcamentoId) {
      const realId = target.orcamentoId || (id.startsWith('orc-') ? id.replace('orc-', '') : id);
      try {
        await supabase.schema('engenharia').from('orcamento_itens').delete().eq('orcamento_id', realId);
        await supabase.schema('engenharia').from('orcamentos').delete().eq('id', realId);
      } catch (e) {
        console.error('Erro ao remover orçamento do Supabase:', e);
      }
    }

    if (activeMemorialId === id) setActiveMemorialId(null);
  };

  const handleUpdateActiveHeader = (newHeader: DadosComplementaresHeader) => {
    if (!activeMemorialId) return;
    const novoNomeProjeto = newHeader.nomeProjeto || newHeader.obra || '';
    const newList = memoriaisList.map(m => {
      if (m.id === activeMemorialId) {
        return {
          ...m,
          codigoOrcamento: newHeader.codigoOrcamento || m.codigoOrcamento,
          nomeProjeto: novoNomeProjeto,
          cliente: newHeader.cliente || m.cliente,
          gestorCliente: newHeader.gestorCliente || m.gestorCliente,
          responsavel: newHeader.responsavel || m.responsavel,
          cidade: newHeader.cidade || m.cidade,
          estado: newHeader.estado || m.estado,
          dataAtualizacao: new Date().toLocaleDateString('pt-BR'),
          header: newHeader
        };
      }
      return m;
    });
    handleSaveMemoriaisList(newList);
    if (activeMemorial?.codigoOrcamento) {
      try {
        const savedOrcamentos = JSON.parse(localStorage.getItem('brp_orcamentos_list') || '[]');
        let alterou = false;
        const updatedOrcamentos = savedOrcamentos.map((orc: any) => {
          if (orc.codigo === activeMemorial.codigoOrcamento || orc.memorial_id === activeMemorial.id || orc.id === activeMemorial.id) {
            alterou = true;
            return {
              ...orc,
              nome: novoNomeProjeto ? `Orçamento - ${novoNomeProjeto}` : orc.nome,
              projeto: novoNomeProjeto || orc.projeto,
              cliente: newHeader.cliente || orc.cliente,
              gestor_cliente: newHeader.gestorCliente || orc.gestor_cliente,
              responsavel: newHeader.responsavel || orc.responsavel
            };
          }
          return orc;
        });
        if (alterou) localStorage.setItem('brp_orcamentos_list', JSON.stringify(updatedOrcamentos));
      } catch (e) {}
    }
  };

  const handleUpdateActiveItens = (newItens: ItemMemoriaOficial[]) => {
    if (!activeMemorialId) return;
    const newList = memoriaisList.map(m => {
      if (m.id === activeMemorialId) {
        return {
          ...m,
          dataAtualizacao: new Date().toLocaleDateString('pt-BR'),
          itens: newItens
        };
      }
      return m;
    });
    handleSaveMemoriaisList(newList);
  };

  const handleConfirmCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingModal(true);
    try {
      const cid = newOrcamentoData.cidade ? formatCidadeUpperNoAccents(newOrcamentoData.cidade).trim() : '';
      const est = newOrcamentoData.estado || 'GO';
      const localObra = [cid, est].filter(Boolean).join(' - ');

      if (createModalMode === 'memorial') {
        const novoId = `mem-${Date.now()}`;
        const novoMemorial: MemorialCalculoRecord = {
          id: novoId,
          codigoOrcamento: newOrcamentoData.codigo,
          nomeProjeto: newOrcamentoData.projeto,
          cliente: newOrcamentoData.cliente,
          gestorCliente: newOrcamentoData.gestor_cliente,
          responsavel: newOrcamentoData.responsavel,
          cidade: cid,
          estado: est,
          status: 'Em Edição',
          dataAtualizacao: new Date().toLocaleDateString('pt-BR'),
          header: {
            codigoOrcamento: newOrcamentoData.codigo,
            nomeProjeto: newOrcamentoData.projeto,
            cliente: newOrcamentoData.cliente,
            gestorCliente: newOrcamentoData.gestor_cliente,
            responsavel: newOrcamentoData.responsavel,
            cidade: cid,
            estado: est,
            objeto: '',
            obra: newOrcamentoData.projeto,
            local: localObra,
            trecho: '',
            extensaoM: 0,
            dadosComplementares: []
          },
          itens: [
            {
              id: `item-${Date.now()}-1`,
              item_eap: '1.0',
              descricao: '',
              unidade: '',
              quantidade: 0,
              isSecao: true,
              level: 0
            }
          ]
        };
        const newList = [novoMemorial, ...memoriaisList];
        handleSaveMemoriaisList(newList);
        setActiveMemorialId(novoId);
        setIsCreateModalOpen(false);
      } else {
        const mem = targetMemorialForOrcamento || activeMemorial;
        if (!mem) return;
        await executeGerarOrcamento(mem, newOrcamentoData);
        setIsCreateModalOpen(false);
      }
    } catch (err) {
      console.error('Erro ao processar criação:', err);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const executeGerarOrcamento = async (mem: MemorialCalculoRecord, formData: typeof newOrcamentoData) => {
    const codigoOrcamentoGerado = formData.codigo || mem.codigoOrcamento || (await generateNextOrcamentoCode());
    const nomeOrcamento = formData.projeto || mem.nomeProjeto || `Orçamento - ${codigoOrcamentoGerado}`;
    let targetOrcId = `orc-${Date.now()}`;
    const cid = formData.cidade ? formatCidadeUpperNoAccents(formData.cidade).trim() : '';
    const est = formData.estado || 'GO';
    const localObra = [cid, est].filter(Boolean).join(' - ');
    const parts = codigoOrcamentoGerado.split('.');
    let revisao = '0';
    if (parts.length >= 3) revisao = parts[2].split('-')[0] || '0';

    try {
      const { data: newOrcData } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .insert({
          codigo: codigoOrcamentoGerado,
          nome: nomeOrcamento,
          descricao: `Gerado a partir do Memorial de Cálculo ${codigoOrcamentoGerado}`,
          cliente: formData.cliente || '',
          projeto: formData.projeto || '',
          gestor_cliente: formData.gestor_cliente || '',
          responsavel: formData.responsavel || '',
          local_obra: localObra,
          revisao,
          status: 'Em Elaboração',
          dados_complementares: mem.header?.dadosComplementares || []
        })
        .select('id')
        .single();
      if (newOrcData?.id) targetOrcId = newOrcData.id;
    } catch (err) { console.error(err); }

    const codigos = mem.itens.map(i => (i as any).codigo).filter((c): c is string => Boolean(c && c.trim() !== ''));
    const priceMap = new Map<string, { mat: number; mo: number; total: number; id?: string; fonte?: string }>();
    if (codigos.length > 0) {
      try {
        const { data: compData } = await supabase.schema('engenharia').from('composicoes').select('id, codigo, fonte, custo_total, custo_material, custo_mao_obra').in('codigo', codigos);
        (compData || []).forEach((c: any) => priceMap.set(c.codigo, { mat: parseFloat(c.custo_material), mo: parseFloat(c.custo_mao_obra), total: parseFloat(c.custo_total), id: c.id, fonte: c.fonte }));
        const { data: insData } = await supabase.schema('engenharia').from('insumos').select('id, codigo, fonte, preco_unitario, valor_nao_desonerado, tipo').in('codigo', codigos);
        (insData || []).forEach((ins: any) => {
          const preco = parseFloat(ins.preco_unitario || ins.valor_nao_desonerado || 0);
          const isMo = (ins.tipo || '').toUpperCase().includes('MÃO DE OBRA');
          priceMap.set(ins.codigo, { mat: isMo ? 0 : preco, mo: isMo ? preco : 0, total: preco, id: ins.id, fonte: ins.fonte });
        });
      } catch (e) { console.error(e); }
    }

    const itensEstruturados: any[] = [];
    for (let idx = 0; idx < mem.itens.length; idx++) {
      const item = mem.itens[idx];
      const isSecao = Boolean(item.isSecao || (item as any).is_secao);
      const cod = (item as any).codigo || '';
      const priceInfo = cod ? priceMap.get(cod) : undefined;
      const qtd = isSecao ? 0 : (item.quantidade || 0);
      const valMat = priceInfo?.mat || (item as any).valor_unitario_mat || 0;
      const valMo = priceInfo?.mo || (item as any).valor_unitario_mo || 0;
      const valTot = priceInfo?.total || (item as any).valor_unitario || (valMat + valMo);

      const parentItem = {
        id: item.id || `item-${Date.now()}-${idx}`,
        orcamento_id: targetOrcId,
        item_eap: item.item_eap,
        descricao: item.descricao,
        unidade: isSecao ? '' : (item.unidade || 'UN'),
        quantidade: qtd,
        isSecao: isSecao,
        level: item.level ?? (isSecao ? 0 : 1),
        codigo: cod,
        banco_fonte: (item as any).banco_fonte || priceInfo?.fonte || '',
        composicao_id: (item as any).composicao_id || priceInfo?.id || null,
        valor_unitario_mat: valMat,
        valor_unitario_mo: valMo,
        valor_unitario: valTot,
        total_mat: qtd * valMat,
        total_mo: qtd * valMo,
        total: qtd * valTot,
        ordem: itensEstruturados.length + 1
      };
      itensEstruturados.push(parentItem);
    }

    try {
      localStorage.setItem(`orcamento_calculos_${targetOrcId}`, JSON.stringify(mem.itens));
      localStorage.setItem(`orcamento_header_${targetOrcId}`, JSON.stringify({
        ...mem.header,
        codigoOrcamento: codigoOrcamentoGerado,
        nomeProjeto: formData.projeto,
        cliente: formData.cliente,
        gestorCliente: formData.gestor_cliente,
        responsavel: formData.responsavel,
        cidade: cid,
        estado: est
      }));
      localStorage.setItem(`brp_orcamento_itens_${targetOrcId}`, JSON.stringify(itensEstruturados));
    } catch (e) { console.error(e); }

    try {
      const itensParaInserirDb = itensEstruturados.map((item, idx) => ({
        orcamento_id: targetOrcId,
        item_eap: item.item_eap,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        is_secao: Boolean(item.isSecao),
        level: item.level,
        codigo: item.codigo,
        valor_unitario: item.valor_unitario,
        total: item.total,
        ordem: idx + 1
      }));
      if (itensParaInserirDb.length > 0) await supabase.schema('engenharia').from('orcamento_itens').insert(itensParaInserirDb);
    } catch (err) { console.error(err); }

    const updatedMemoriais = memoriaisList.map(m => {
      if (m.id === mem.id) {
        return {
          ...m,
          codigoOrcamento: codigoOrcamentoGerado,
          nomeProjeto: formData.projeto || m.nomeProjeto,
          cliente: formData.cliente || m.cliente,
          gestorCliente: formData.gestor_cliente || m.gestorCliente,
          responsavel: formData.responsavel || m.responsavel,
          cidade: cid || m.cidade,
          estado: est || m.estado,
          status: 'Vinculado a Orçamento' as const
        };
      }
      return m;
    });
    handleSaveMemoriaisList(updatedMemoriais);
    try {
      const savedOrcamentos = JSON.parse(localStorage.getItem('brp_orcamentos_list') || '[]');
      const newEntry = {
        id: targetOrcId,
        codigo: codigoOrcamentoGerado,
        nome: nomeOrcamento,
        projeto: formData.projeto,
        cliente: formData.cliente,
        gestor_cliente: formData.gestor_cliente,
        responsavel: formData.responsavel,
        cidade: cid,
        estado: est,
        local_obra: localObra,
        status: 'Em Elaboração',
        dataCriacao: new Date().toISOString()
      };
      localStorage.setItem('brp_orcamentos_list', JSON.stringify([newEntry, ...savedOrcamentos.filter((o: any) => o.id !== targetOrcId && o.codigo !== codigoOrcamentoGerado)]));
    } catch {}
    alert(`Orçamento "${codigoOrcamentoGerado} - ${nomeOrcamento}" gerado com sucesso!`);
    navigate(`/orcamentos/${targetOrcId}`);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Memória de Cálculo & Levantamento Quantitativo
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Gerencie cadernos de medição do projeto e cadastre fórmulas para vinculação direta nos serviços.</p>
        </div>

        <div className="flex items-center gap-2">
          {activeMemorialId && activeMainTab === 'memorial' && (
            <>
              <button
                type="button"
                onClick={() => setActiveMemorialId(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para Lista de Memoriais</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenGerarOrcamentoModal(activeMemorial || undefined)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Rocket className="w-4 h-4" />
                <span>Gerar Orçamento a partir deste Memorial</span>
              </button>
            </>
          )}

          {!activeMemorialId && activeMainTab === 'memorial' && (
            <button
              type="button"
              onClick={handleOpenCreateMemorialModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Memorial de Cálculo</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button type="button" onClick={() => setActiveMainTab('memorial')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${activeMainTab === 'memorial' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
          <FileText className="w-4 h-4" />
          <span>1. Memórias de Cálculo ({memoriaisList.length})</span>
        </button>
        <button type="button" onClick={() => setActiveMainTab('formulas')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${activeMainTab === 'formulas' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
          <Sparkles className="w-4 h-4 text-blue-300" />
          <span>2. Central & Cadastro de Fórmulas</span>
        </button>
        <button type="button" onClick={() => setActiveMainTab('parametros')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${activeMainTab === 'parametros' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
          <Sliders className="w-4 h-4 text-blue-300" />
          <span>3. Cadastro de Parâmetros</span>
        </button>
      </div>

      {activeMainTab === 'memorial' ? (
        activeMemorialId && activeMemorial ? (
          <DocumentoMemorialOficial
            header={activeMemorial.header}
            onChangeHeader={handleUpdateActiveHeader}
            itens={activeMemorial.itens}
            onChangeItens={handleUpdateActiveItens}
            onVoltar={() => setActiveMemorialId(null)}
          />
        ) : (
          <TabelaMemoriaisCalculo
            memoriais={memoriaisList}
            onSelectMemorial={(m) => {
              if (m.isOrcamentoNativo && m.orcamentoId) {
                navigate(`/orcamentos/${m.orcamentoId}?aba=memoria_calculo`);
                return;
              }
              if (m.isImportado) {
                navigate('/orcamentos?tab=importados');
                return;
              }
              setActiveMemorialId(m.id);
            }}
            onDeleteMemorial={handleDeleteMemorial}
            onGerarOrcamento={handleOpenGerarOrcamentoModal}
          />
        )
      ) : activeMainTab === 'formulas' ? (
        <GerenciadorFormulas />
      ) : (
        <TabelaParametrosCadastro />
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">{createModalMode === 'memorial' ? 'Novo Memorial de Cálculo' : 'Novo Orçamento da Empresa'}</h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleConfirmCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{createModalMode === 'memorial' ? 'Código da Memória de Cálculo' : 'Código do Orçamento'}</label>
                <input type="text" required value={newOrcamentoData.codigo} onChange={(e) => setNewOrcamentoData({...newOrcamentoData, codigo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-blue-600 outline-none focus:border-blue-500 bg-slate-50" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Projeto / Obra</label>
                <input type="text" required value={newOrcamentoData.projeto} onChange={(e) => setNewOrcamentoData({...newOrcamentoData, projeto: e.target.value})} placeholder="Ex: Construção de Galpão Industrial" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 focus:bg-white bg-white" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cliente</label>
                <input type="text" value={newOrcamentoData.cliente} onChange={(e) => setNewOrcamentoData({...newOrcamentoData, cliente: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 bg-white" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gestor do Cliente</label>
                <input type="text" value={newOrcamentoData.gestor_cliente} onChange={(e) => setNewOrcamentoData({...newOrcamentoData, gestor_cliente: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 bg-white" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Responsável Técnico / Orçamentista</label>
                <select value={newOrcamentoData.responsavel} onChange={(e) => setNewOrcamentoData({...newOrcamentoData, responsavel: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 bg-white cursor-pointer">
                  <option value="">Selecione o Responsável...</option>
                  {usuariosCadastrados.map((u: any) => <option key={u.id} value={u.nome}>{u.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Cidade da Obra</label>
                  <input type="text" value={newOrcamentoData.cidade} onChange={(e) => setNewOrcamentoData({...newOrcamentoData, cidade: formatCidadeUpperNoAccents(e.target.value)})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold outline-none focus:border-blue-500 bg-white uppercase" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">UF</label>
                  <select value={newOrcamentoData.estado} onChange={(e) => setNewOrcamentoData({...newOrcamentoData, estado: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-bold outline-none focus:border-blue-500 bg-white cursor-pointer">
                    {ESTADOS_BRASIL_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 cursor-pointer">Cancelar</button>
                <button type="submit" disabled={isSubmittingModal} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 cursor-pointer">{isSubmittingModal ? 'Salvando...' : 'Confirmar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
