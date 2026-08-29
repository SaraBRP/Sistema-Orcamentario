import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, FileText, Sparkles, ArrowLeft, Plus, Sliders } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DocumentoMemorialOficial } from '../components/calculos/DocumentoMemorialOficial';
import { GerenciadorFormulas } from '../components/calculos/GerenciadorFormulas';
import { TabelaMemoriaisCalculo, type MemorialCalculoRecord } from '../components/calculos/TabelaMemoriaisCalculo';
import { TabelaParametrosCadastro } from '../components/calculos/TabelaParametrosCadastro';
import type { ItemMemoriaOficial, DadosComplementaresHeader } from '../types/calculos';

const LOCAL_STORAGE_MEMORIAIS_KEY = 'brp_memoriais_list';

export default function CalculosQuantitativosPage() {
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState<'memorial' | 'formulas' | 'parametros'>('memorial');
  
  // Lista de memoriais criados (avulsos + orçamentos da empresa + importações)
  const [memoriaisList, setMemoriaisList] = useState<MemorialCalculoRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_MEMORIAIS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Memorial atualmente selecionado para edição (null = exibindo tabela de memoriais)
  const [activeMemorialId, setActiveMemorialId] = useState<string | null>(null);

  const activeMemorial = memoriaisList.find(m => m.id === activeMemorialId) || null;

  // Busca e consolida memoriais avulsos, orçamentos nativos da empresa e importações
  const fetchTodosMemoriaisEOrcamentos = useCallback(async () => {
    try {
      // 1. Memoriais Avulsos (Locais do localStorage)
      let avulsos: MemorialCalculoRecord[] = [];
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_MEMORIAIS_KEY);
        avulsos = saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error('Erro ao carregar memoriais locais:', e);
      }

      // 2. Orçamentos da Empresa (Supabase + localStorage fallback)
      let dbOrcamentos: any[] = [];
      try {
        const { data } = await supabase
          .schema('engenharia')
          .from('orcamentos')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) dbOrcamentos = data;
      } catch (e) {
        console.error('Erro ao buscar orçamentos no Supabase:', e);
      }

      let localOrcamentos: any[] = [];
      try {
        localOrcamentos = JSON.parse(localStorage.getItem('brp_orcamentos_list') || '[]');
      } catch (e) {}

      // Combina os orçamentos da empresa por ID / Código
      const mapOrcamentos = new Map<string, any>();
      dbOrcamentos.forEach(o => {
        if (o.id) mapOrcamentos.set(String(o.id), o);
      });
      localOrcamentos.forEach(o => {
        if (o.id && !mapOrcamentos.has(String(o.id))) {
          mapOrcamentos.set(String(o.id), o);
        }
      });
      const orcList = Array.from(mapOrcamentos.values());

      // 3. Importações / Clientes
      let dbImportados: any[] = [];
      try {
        const { data } = await supabase
          .schema('engenharia')
          .from('orcamentos_importados')
          .select('*')
          .order('created_at', { ascending: false });
        if (data) dbImportados = data;
      } catch (e) {}

      // 4. Mapeia Orçamentos da Empresa em Registros de Memorial
      const orcMemoriais: MemorialCalculoRecord[] = orcList.map(orc => {
        const cidadeObra = orc.cidade || (orc.local_obra ? (orc.local_obra.split('-')[0] || '').trim() : '');
        const estadoObra = orc.estado || (orc.local_obra ? (orc.local_obra.split('-')[1] || '').trim() : 'GO');
        const nomeFinal = orc.projeto || orc.nome || 'Orçamento Empresa';

        return {
          id: String(orc.id),
          codigoOrcamento: orc.codigo || '',
          nomeProjeto: nomeFinal,
          cliente: orc.cliente || '',
          gestorCliente: orc.gestor_cliente || '',
          responsavel: orc.responsavel || 'Orçamentista BRP',
          cidade: cidadeObra,
          estado: estadoObra || 'GO',
          status: 'Vinculado a Orçamento',
          dataAtualizacao: orc.created_at ? new Date(orc.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
          isOrcamentoNativo: true,
          orcamentoId: String(orc.id),
          header: {
            codigoOrcamento: orc.codigo || '',
            nomeProjeto: nomeFinal,
            cliente: orc.cliente || '',
            gestorCliente: orc.gestor_cliente || '',
            responsavel: orc.responsavel || '',
            cidade: cidadeObra,
            estado: estadoObra || 'GO',
            objeto: '',
            obra: orc.nome || '',
            local: orc.local_obra || '',
            trecho: '',
            extensaoM: 0,
            dadosComplementares: []
          },
          itens: []
        };
      });

      // 5. Mapeia Importações de Clientes
      const setOrcImportadosExistentes = new Set(orcList.map(o => o.orcamento_importado_id).filter(Boolean));
      const impMemoriais: MemorialCalculoRecord[] = dbImportados
        .filter(imp => !setOrcImportadosExistentes.has(imp.id))
        .map(imp => {
          const nomeImp = imp.nome_projeto || imp.nome_arquivo || 'Importação Cliente';
          return {
            id: `imp-${imp.id}`,
            codigoOrcamento: imp.codigo || `IMP-${imp.id.substring(0, 6)}`,
            nomeProjeto: nomeImp,
            cliente: imp.cliente || '',
            gestorCliente: imp.gestor_cliente || '',
            responsavel: imp.criado_por || 'Cliente / Importação',
            cidade: imp.cidade || '',
            estado: imp.estado || 'GO',
            status: 'Vinculado a Orçamento',
            dataAtualizacao: imp.created_at ? new Date(imp.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
            isImportado: true,
            importadoId: String(imp.id),
            header: {
              codigoOrcamento: imp.codigo || '',
              nomeProjeto: nomeImp,
              cliente: imp.cliente || '',
              gestorCliente: imp.gestor_cliente || '',
              responsavel: imp.criado_por || '',
              cidade: imp.cidade || '',
              estado: imp.estado || 'GO',
              objeto: '',
              obra: imp.nome_arquivo || '',
              local: '',
              trecho: '',
              extensaoM: 0,
              dadosComplementares: []
            },
            itens: []
          };
        });

      // 6. Une tudo sem duplicar e filtra rascunhos de teste/exemplos fictícios e memoriais órfãos
      const deduplicatedOrcMemoriais: MemorialCalculoRecord[] = [];
      const seenCodes = new Set<string>();
      const validOrcIds = new Set<string>();

      orcMemoriais.forEach(orc => {
        const code = (orc.codigoOrcamento || '').trim();
        if (orc.orcamentoId) validOrcIds.add(String(orc.orcamentoId));
        if (code) {
          if (!seenCodes.has(code)) {
            seenCodes.add(code);
            deduplicatedOrcMemoriais.push(orc);
          }
        } else {
          deduplicatedOrcMemoriais.push(orc);
        }
      });

      // Busca orçamentos salvos no localStorage para sincronização
      try {
        const localOrcs = JSON.parse(localStorage.getItem('brp_orcamentos_list') || '[]');
        (localOrcs || []).forEach((o: any) => {
          if (o.codigo) seenCodes.add(String(o.codigo).trim());
          if (o.id) validOrcIds.add(String(o.id));
        });
      } catch (e) {}

      const avulsosOrfaosIds: string[] = [];
      const avulsosFiltrados = avulsos.filter(a => {
        const code = (a.codigoOrcamento || '').trim();
        const nome = (a.nomeProjeto || '').trim();

        // Filtra rascunhos genéricos de exemplo e migrações fictícias
        if (
          nome.startsWith('Orçamento Derivado') ||
          nome.startsWith('Orçamento -') ||
          (nome === 'Nova Obra de Engenharia' && (!a.itens || a.itens.length <= 1))
        ) {
          avulsosOrfaosIds.push(a.id);
          return false;
        }

        // Se o memorial avulso consta como vinculado a um orçamento, mas o orçamento foi excluído do sistema -> purge!
        if (a.status === 'Vinculado a Orçamento' || (a.codigoOrcamento && a.codigoOrcamento.trim())) {
          const hasOrcCode = code ? seenCodes.has(code) : false;
          const hasOrcId = a.orcamentoId ? validOrcIds.has(String(a.orcamentoId)) : false;

          if (!hasOrcCode && !hasOrcId) {
            avulsosOrfaosIds.push(a.id);
            return false;
          }
        }

        if (code && seenCodes.has(code)) return false;
        return true;
      });

      // Limpa os memoriais órfãos da memória local
      if (avulsosOrfaosIds.length > 0) {
        const limpos = avulsos.filter(a => !avulsosOrfaosIds.includes(a.id));
        localStorage.setItem(LOCAL_STORAGE_MEMORIAIS_KEY, JSON.stringify(limpos));
      }

      const listaCombinada = [...deduplicatedOrcMemoriais, ...impMemoriais, ...avulsosFiltrados];
      setMemoriaisList(listaCombinada);
    } catch (err) {
      console.error('Erro ao consolidar memoriais:', err);
    }
  }, []);

  useEffect(() => {
    fetchTodosMemoriaisEOrcamentos();
  }, [fetchTodosMemoriaisEOrcamentos]);

  const handleSaveMemoriaisList = (newList: MemorialCalculoRecord[]) => {
    setMemoriaisList(newList);
    localStorage.setItem(LOCAL_STORAGE_MEMORIAIS_KEY, JSON.stringify(newList));
  };

  const generateNextOrcamentoCode = async () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const ddmm = `${dd}${mm}`;
    const year = today.getFullYear();

    try {
      const { data } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('codigo')
        .like('codigo', `${ddmm}.%`);

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

      const seqStr = String(nextSeq).padStart(3, '0');
      return `${ddmm}.${seqStr}.0-${year}`;
    } catch {
      const numComCodigo = memoriaisList.filter(m => m.codigoOrcamento).length + 1;
      return `${ddmm}.${String(numComCodigo).padStart(3, '0')}.0-${year}`;
    }
  };

  const handleCreateNovoMemorial = () => {
    const novoId = `mem-${Date.now()}`;
    const novoMemorial: MemorialCalculoRecord = {
      id: novoId,
      codigoOrcamento: '', // Vazio até ser vinculado a um orçamento
      nomeProjeto: '', // Totalmente limpo sem pré-preenchimento
      cliente: '',
      gestorCliente: '',
      responsavel: '',
      cidade: '',
      estado: 'GO',
      status: 'Em Edição',
      dataAtualizacao: new Date().toLocaleDateString('pt-BR'),
      header: {
        codigoOrcamento: '',
        nomeProjeto: '',
        cliente: '',
        gestorCliente: '',
        responsavel: '',
        cidade: '',
        estado: 'GO',
        objeto: '',
        obra: '',
        local: '',
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
  };

  const handleDeleteMemorial = async (id: string) => {
    const target = memoriaisList.find(m => m.id === id);

    if (target?.status === 'Vinculado a Orçamento' || target?.isOrcamentoNativo || target?.isImportado) {
      alert('Memoriais vinculados a um orçamento não podem ser excluídos por esta aba. Caso queira excluir a proposta inteira, utilize a aba Orçamentos.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este memorial de cálculo avulso?')) return;

    // 1. Atualiza o estado do React imediatamente
    const newList = memoriaisList.filter(m => m.id !== id);
    setMemoriaisList(newList);

    // 2. Remove do localStorage de memoriais avulsos
    try {
      const savedMem = JSON.parse(localStorage.getItem(LOCAL_STORAGE_MEMORIAIS_KEY) || '[]');
      const filteredMem = savedMem.filter((m: any) => m.id !== id && (target?.codigoOrcamento ? m.codigoOrcamento !== target.codigoOrcamento : true));
      localStorage.setItem(LOCAL_STORAGE_MEMORIAIS_KEY, JSON.stringify(filteredMem));
    } catch (e) {}

    // 3. Remove do localStorage de orçamentos da empresa
    try {
      const savedOrc = JSON.parse(localStorage.getItem('brp_orcamentos_list') || '[]');
      const targetOrcId = target?.orcamentoId || (id.startsWith('orc-') ? id.replace('orc-', '') : id);
      const filteredOrc = savedOrc.filter((o: any) => String(o.id) !== String(targetOrcId) && String(o.id) !== String(id) && (target?.codigoOrcamento ? o.codigo !== target.codigoOrcamento : true));
      localStorage.setItem('brp_orcamentos_list', JSON.stringify(filteredOrc));
    } catch (e) {}

    // 4. Se for um orçamento do Supabase, remove do banco
    if (target?.isOrcamentoNativo || target?.orcamentoId) {
      const realId = target.orcamentoId || (id.startsWith('orc-') ? id.replace('orc-', '') : id);
      try {
        await supabase.schema('engenharia').from('orcamento_itens').delete().eq('orcamento_id', realId);
        await supabase.schema('engenharia').from('orcamentos').delete().eq('id', realId);
      } catch (e) {
        console.error('Erro ao remover orçamento do Supabase:', e);
      }
    }

    if (activeMemorialId === id) {
      setActiveMemorialId(null);
    }
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

    // Sincroniza o Nome do Projeto no Orçamento correspondente em brp_orcamentos_list
    if (activeMemorial?.codigoOrcamento) {
      try {
        const savedOrcamentos = JSON.parse(localStorage.getItem('brp_orcamentos_list') || '[]');
        let alterou = false;
        const updatedOrcamentos = savedOrcamentos.map((orc: any) => {
          if (orc.codigo === activeMemorial.codigoOrcamento || orc.memorial_id === activeMemorial.id || orc.id === activeMemorial.id) {
            alterou = true;
            return {
              ...orc,
              nome: novoNomeProjeto ? `Orçamento - ${novoNomeProjeto}` : orc.nome
            };
          }
          return orc;
        });

        if (alterou) {
          localStorage.setItem('brp_orcamentos_list', JSON.stringify(updatedOrcamentos));
        }
      } catch (e) {
        console.error('Erro ao sincronizar nome do projeto com os orçamentos:', e);
      }
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

  const handleGerarOrcamentoAPartirDoCaderno = async () => {
    if (!activeMemorial) return;

    if (!activeMemorial.itens || activeMemorial.itens.length === 0) {
      alert('Adicione ao menos uma linha na memória antes de criar o orçamento.');
      return;
    }

    // Gera o código do orçamento em sequência oficial da empresa (DDMM.SEQ.0-YYYY)
    const codigoOrcamentoGerado = activeMemorial.codigoOrcamento || (await generateNextOrcamentoCode());
    const nomeOrcamento = activeMemorial.nomeProjeto || activeMemorial.header.nomeProjeto || `Orçamento - ${codigoOrcamentoGerado}`;
    let targetOrcId = `orc-${Date.now()}`;

    const parts = codigoOrcamentoGerado.split('.');
    let revisao = '0';
    if (parts.length >= 3) {
      revisao = parts[2].split('-')[0] || '0';
    }

    // Insere o Orçamento no Supabase
    try {
      const cid = activeMemorial.cidade || activeMemorial.header?.cidade || '';
      const est = activeMemorial.estado || activeMemorial.header?.estado || 'GO';
      const localObra = [cid, est].filter(Boolean).join(' - ');

      const { data: newOrcData } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .insert({
          codigo: codigoOrcamentoGerado,
          nome: nomeOrcamento,
          descricao: `Gerado a partir do Memorial de Cálculo ${codigoOrcamentoGerado}`,
          cliente: activeMemorial.cliente || activeMemorial.header?.cliente || '',
          projeto: nomeOrcamento,
          gestor_cliente: activeMemorial.gestorCliente || activeMemorial.header?.gestorCliente || '',
          local_obra: localObra,
          revisao,
          status: 'Em Elaboração',
          dados_complementares: activeMemorial.header?.dadosComplementares || []
        })
        .select('id')
        .single();

      if (newOrcData?.id) {
        targetOrcId = newOrcData.id;
      }
    } catch (err) {
      console.error('Erro ao registrar orçamento no Supabase:', err);
    }

    // Busca preços de composições e insumos no banco de dados para enriquecer os itens
    const codigos = activeMemorial.itens
      .map(i => (i as any).codigo)
      .filter((c): c is string => Boolean(c && c.trim() !== ''));

    const priceMap = new Map<string, { mat: number; mo: number; total: number; id?: string; fonte?: string }>();

    if (codigos.length > 0) {
      try {
        const { data: compData } = await supabase
          .schema('engenharia')
          .from('composicoes')
          .select('id, codigo, fonte, custo_total, custo_material, custo_mao_obra')
          .in('codigo', codigos);

        (compData || []).forEach((c: any) => {
          const mat = parseFloat(c.custo_material || 0);
          const mo = parseFloat(c.custo_mao_obra || 0);
          const tot = parseFloat(c.custo_total || 0) || (mat + mo);
          priceMap.set(c.codigo, { mat, mo, total: tot, id: c.id, fonte: c.fonte });
        });

        const { data: insData } = await supabase
          .schema('engenharia')
          .from('insumos')
          .select('id, codigo, fonte, preco_unitario, valor_nao_desonerado, tipo')
          .in('codigo', codigos);

        (insData || []).forEach((ins: any) => {
          const preco = parseFloat(ins.preco_unitario || ins.valor_nao_desonerado || 0);
          const isMo = (ins.tipo || '').toUpperCase().includes('MÃO DE OBRA') || (ins.tipo || '').toUpperCase().includes('MAO DE OBRA');
          priceMap.set(ins.codigo, {
            mat: isMo ? 0 : preco,
            mo: isMo ? preco : 0,
            total: preco,
            id: ins.id,
            fonte: ins.fonte
          });
        });
      } catch (e) {
        console.error('Erro ao consultar preços de insumos/composições:', e);
      }
    }

    // Constrói a estrutura completa e enriquecida de itens para a Planilha Orçamentária
    const itensEstruturados: any[] = [];

    for (let idx = 0; idx < activeMemorial.itens.length; idx++) {
      const item = activeMemorial.itens[idx];
      const isSecao = Boolean(item.isSecao || (item as any).is_secao);
      const cod = (item as any).codigo || '';
      const desc = item.descricao || '';
      const priceInfo = cod ? priceMap.get(cod) : undefined;

      const valMat = priceInfo?.mat || (item as any).valor_unitario_mat || 0;
      const valMo = priceInfo?.mo || (item as any).valor_unitario_mo || 0;
      const valTot = priceInfo?.total || (item as any).valor_unitario || (valMat + valMo);
      const qtd = isSecao ? 0 : (item.quantidade || 0);

      const parentItem = {
        id: item.id || `item-${Date.now()}-${idx}`,
        orcamento_id: targetOrcId,
        item_eap: item.item_eap,
        descricao: desc,
        unidade: isSecao ? '' : (item.unidade || 'UN'),
        quantidade: qtd,
        isSecao: isSecao,
        is_secao: isSecao,
        level: item.level !== undefined ? item.level : (isSecao ? 0 : 1),
        codigo: cod,
        banco_fonte: (item as any).banco_fonte || priceInfo?.fonte || '',
        composicao_id: (item as any).composicao_id || priceInfo?.id || null,
        equacaoLiteral: item.equacaoLiteral || (item as any).equacao_literal || '',
        substituicaoNumerica: item.substituicaoNumerica || (item as any).substituicao_numerica || '',
        observacaoMemoria: item.observacaoMemoria || (item as any).observacao_memoria || '',
        valor_unitario_mat: valMat,
        valor_unitario_mo: valMo,
        valor_unitario: valTot,
        total_mat: qtd * valMat,
        total_mo: qtd * valMo,
        total: qtd * valTot,
        ordem: itensEstruturados.length + 1
      };

      itensEstruturados.push(parentItem);

      // Se for composição e possuir id no banco, busca seus insumos filhas para incluir no orçamento
      const compId = (item as any).composicao_id || priceInfo?.id;
      if (!isSecao && compId) {
        try {
          const { data: compInsumos } = await supabase
            .schema('engenharia')
            .from('composicao_itens')
            .select(`
              id, quantidade,
              insumo:insumos!insumo_id (id, codigo, descricao, unidade, preco_unitario, valor_nao_desonerado, tipo, fonte)
            `)
            .eq('composicao_id', compId);

          if (compInsumos && compInsumos.length > 0) {
            compInsumos.forEach((ci: any, subIdx: number) => {
              const ins = ci.insumo;
              if (ins) {
                const subQtd = (ci.quantidade || 0) * qtd;
                const insPreco = parseFloat(ins.preco_unitario || ins.valor_nao_desonerado || 0);
                const isMo = (ins.tipo || '').toUpperCase().includes('MÃO DE OBRA') || (ins.tipo || '').toUpperCase().includes('MAO DE OBRA');
                const subMat = isMo ? 0 : insPreco;
                const subMo = isMo ? insPreco : 0;

                itensEstruturados.push({
                  id: `sub-${parentItem.id}-${subIdx}`,
                  orcamento_id: targetOrcId,
                  item_eap: `${parentItem.item_eap}.${subIdx + 1}`,
                  descricao: ins.descricao,
                  unidade: ins.unidade || 'UN',
                  quantidade: ci.quantidade || 0,
                  isSecao: false,
                  is_secao: false,
                  level: (parentItem.level || 1) + 1,
                  codigo: ins.codigo || '',
                  banco_fonte: ins.fonte || '',
                  composicao_id: compId,
                  isChildInsumoOfComposition: true,
                  parentCompositionId: parentItem.id,
                  valor_unitario_mat: subMat,
                  valor_unitario_mo: subMo,
                  valor_unitario: insPreco,
                  total_mat: subQtd * subMat,
                  total_mo: subQtd * subMo,
                  total: subQtd * insPreco,
                  ordem: itensEstruturados.length + 1
                });
              }
            });
          }
        } catch (e) {
          console.error('Erro ao buscar insumos da composição:', e);
        }
      }
    }

    // Persiste os dados localmente no LocalStorage para redundância e sincronização imediata
    try {
      localStorage.setItem(`orcamento_calculos_${targetOrcId}`, JSON.stringify(activeMemorial.itens));
      localStorage.setItem(`orcamento_parametros_${targetOrcId}`, JSON.stringify(activeMemorial.itens));
      localStorage.setItem(`orcamento_header_${targetOrcId}`, JSON.stringify(activeMemorial.header));
      localStorage.setItem(`orcamento_dados_comp_${targetOrcId}`, JSON.stringify(activeMemorial.header?.dadosComplementares || []));
      localStorage.setItem(`brp_orcamento_itens_${targetOrcId}`, JSON.stringify(itensEstruturados));
    } catch (e) {
      console.error('Erro ao salvar parâmetros e itens no localStorage:', e);
    }

    // Insere os itens na tabela orcamento_itens no Supabase
    try {
      const itensParaInserirDb = itensEstruturados.map((item, idx) => ({
        orcamento_id: targetOrcId,
        item_eap: item.item_eap,
        descricao: item.descricao,
        unidade: item.isSecao ? '' : (item.unidade || 'UN'),
        quantidade: item.isSecao ? 0 : (item.quantidade || 0),
        is_secao: Boolean(item.isSecao),
        level: item.level !== undefined ? item.level : (item.isSecao ? 0 : 1),
        codigo: item.codigo || '',
        banco_fonte: item.banco_fonte || '',
        composicao_id: item.composicao_id || null,
        parent_composition_id: item.parentCompositionId || null,
        is_child_insumo: Boolean(item.isChildInsumoOfComposition),
        equacao_literal: item.equacaoLiteral || '',
        substituicao_numerica: item.substituicaoNumerica || '',
        observacao_memoria: item.observacaoMemoria || '',
        valor_unitario_mat: item.valor_unitario_mat || 0,
        valor_unitario_mo: item.valor_unitario_mo || 0,
        valor_unitario: item.valor_unitario || 0,
        total_mat: item.total_mat || 0,
        total_mo: item.total_mo || 0,
        total: item.total || 0,
        ordem: idx + 1
      }));

      if (itensParaInserirDb.length > 0) {
        await supabase
          .schema('engenharia')
          .from('orcamento_itens')
          .insert(itensParaInserirDb);
      }
    } catch (err) {
      console.error('Erro ao registrar itens do orçamento no Supabase:', err);
    }

    // Atualiza o memorial ativo atribuindo o novo código de orçamento e status
    const updatedMemoriais = memoriaisList.map(m => {
      if (m.id === activeMemorial.id) {
        return {
          ...m,
          codigoOrcamento: codigoOrcamentoGerado,
          status: 'Vinculado a Orçamento' as const,
          header: {
            ...m.header,
            codigoOrcamento: codigoOrcamentoGerado
          }
        };
      }
      return m;
    });
    handleSaveMemoriaisList(updatedMemoriais);

    // Fallback/Sincronização em localStorage para o painel de orçamentos
    try {
      const savedOrcamentos = JSON.parse(localStorage.getItem('brp_orcamentos_list') || '[]');
      savedOrcamentos.unshift({
        id: targetOrcId,
        codigo: codigoOrcamentoGerado,
        nome: nomeOrcamento,
        status: 'Em Elaboração',
        dataCriacao: new Date().toISOString()
      });
      localStorage.setItem('brp_orcamentos_list', JSON.stringify(savedOrcamentos));
    } catch {}

    alert(`Orçamento "${codigoOrcamentoGerado} - ${nomeOrcamento}" gerado com sucesso! Redirecionando para a área de orçamentos...`);
    navigate(`/orcamentos/${targetOrcId}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Superior Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Memória de Cálculo & Levantamento Quantitativo
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie cadernos de medição do projeto e cadastre fórmulas para vinculação direta nos serviços.
          </p>
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
                onClick={handleGerarOrcamentoAPartirDoCaderno}
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
              onClick={handleCreateNovoMemorial}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Memorial de Cálculo</span>
            </button>
          )}
        </div>
      </div>

      {/* Navegação de Abas da Tela */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveMainTab('memorial')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'memorial'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Memórias de Cálculo ({memoriaisList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('formulas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'formulas'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-blue-300" />
          <span>2. Central & Cadastro de Fórmulas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('parametros')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeMainTab === 'parametros'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-blue-300" />
          <span>3. Cadastro de Parâmetros</span>
        </button>
      </div>

      {/* Conteúdo da Aba Selecionada */}
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
          />
        )
      ) : activeMainTab === 'formulas' ? (
        <GerenciadorFormulas />
      ) : (
        <TabelaParametrosCadastro />
      )}
    </div>
  );
}


