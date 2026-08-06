import { useState, useRef, useEffect } from 'react';
import { X, FileSpreadsheet, Database, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { parseSpreadsheet, parseSinapiSpreadsheet } from '../lib/composicaoParser';
import type { ParsedComposition, ParsedItem } from '../lib/composicaoParser';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

type ImportadorComposicoesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (banco?: string) => void;
};

export default function ImportadorComposicoesModal({ isOpen, onClose, onSuccess }: ImportadorComposicoesModalProps) {
  const [step, setStep] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configurações
  const [fontesCadastradas, setFontesCadastradas] = useState<string[]>(['SINAPI', 'SICRO 3', 'GOINFRA']);
  const [isNovaFonte, setIsNovaFonte] = useState(false);
  const [fonteSelect, setFonteSelect] = useState('SINAPI');
  const [novaFonteText, setNovaFonteText] = useState('');
  
  const [estado, setEstado] = useState('GO');
  const [colunaCusto, setColunaCusto] = useState('');
  const [sinapiAbaSemDeson, setSinapiAbaSemDeson] = useState('CSD');
  const [sinapiAbaComDeson, setSinapiAbaComDeson] = useState('CCD');
  const [sinapiAbaSemEncargos, setSinapiAbaSemEncargos] = useState('CSE');
  const [sinapiLinhaInicio, setSinapiLinhaInicio] = useState<number>(11);
  const [dataBase, setDataBase] = useState('');
  const [layout, setLayout] = useState<'SINAPI' | 'SICRO' | 'GOINFRA'>('SINAPI');
  const [tipoPreco, setTipoPreco] = useState<'sem_desoneracao' | 'com_desoneracao' | 'sem_encargos'>('sem_desoneracao');

  // Arquivo e Abas
  const [_file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Dados Parsados
  const [parsedData, setParsedData] = useState<{ composicoes: ParsedComposition[]; itens: ParsedItem[] } | null>(null);

  // Processamento
  const [progresso, setProgresso] = useState(0);
  const [etapaTexto, setEtapaTexto] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [itemsProcessados, setItemsProcessados] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchFontes = async () => {
        const { data } = await supabase.schema('engenharia').from('composicoes').select('fonte').limit(5000);
        if (data) {
          const unicas = Array.from(new Set(data.map(i => i.fonte).filter(Boolean)));
          const final = Array.from(new Set([...fontesCadastradas, ...unicas])).sort();
          setFontesCadastradas(final as string[]);
        }
      };
      fetchFontes();
    }
  }, [isOpen]);

  // Auto-selecionar o Layout com base na Fonte selecionada
  useEffect(() => {
    const fUpper = fonteSelect.toUpperCase();
    if (fUpper.includes('SINAPI')) {
      setLayout('SINAPI');
    } else if (fUpper.includes('SICRO')) {
      setLayout('SICRO');
    } else if (fUpper.includes('GOINFRA')) {
      setLayout('GOINFRA');
    }
  }, [fonteSelect]);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen]);

  const autoDetectColumnForState = (wb: XLSX.WorkBook, uf: string) => {
    const sheets = wb.SheetNames;
    const csdName = sheets.find(s => s.toUpperCase() === 'CSD');
    if (!csdName) return;

    const ws = wb.Sheets[csdName];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    let stateRowIdx = -1;
    const ufsSet = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);
    for (let r = 0; r < Math.min(20, rows.length); r++) {
      const row = rows[r];
      if (!row) continue;
      const count = row.filter(cell => cell && ufsSet.has(String(cell).trim().toUpperCase())).length;
      if (count >= 3) {
        stateRowIdx = r;
        break;
      }
    }
    if (stateRowIdx === -1) stateRowIdx = 8;

    const row9 = rows[stateRowIdx];
    if (row9) {
      for (let c = 0; c < row9.length; c++) {
        if (String(row9[c]).trim().toUpperCase() === uf.toUpperCase()) {
          let temp = c;
          let letter = '';
          while (temp >= 0) {
            letter = String.fromCharCode((temp % 26) + 65) + letter;
            temp = Math.floor(temp / 26) - 1;
          }
          setColunaCusto(letter);
          return;
        }
      }
    }
    setColunaCusto('');
  };

  useEffect(() => {
    if (layout === 'SINAPI' && workbook && isOpen) {
      try {
        const data = parseSinapiSpreadsheet(
          workbook, 
          estado, 
          colunaCusto || undefined, 
          getFonteFinal(),
          sinapiAbaSemDeson,
          sinapiAbaComDeson,
          sinapiAbaSemEncargos,
          sinapiLinhaInicio
        );
        setParsedData(data);
        setErrorMsg(null);
      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Erro ao processar a coluna selecionada.');
        setParsedData(null);
      }
    }
  }, [estado, colunaCusto, layout, workbook, isOpen, sinapiAbaSemDeson, sinapiAbaComDeson, sinapiAbaSemEncargos, sinapiLinhaInicio]);

  useEffect(() => {
    if (isNovaFonte) {
      const fUpper = novaFonteText.toUpperCase();
      if (fUpper.includes('SINAPI')) {
        setLayout('SINAPI');
      } else if (fUpper.includes('SICRO')) {
        setLayout('SICRO');
      } else if (fUpper.includes('GOINFRA')) {
        setLayout('GOINFRA');
      }
    }
  }, [novaFonteText, isNovaFonte]);

  if (!isOpen) return null;

  const getFonteFinal = () => isNovaFonte ? novaFonteText.toUpperCase().trim() : fonteSelect;

  const resetState = () => {
    setStep(1);
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setParsedData(null);
    setProgresso(0);
    setTotalItems(0);
    setItemsProcessados(0);
    setErrorMsg(null);
    setDataBase('');
    setEstado('GO');
    setColunaCusto('');
    setSinapiAbaSemDeson('CSD');
    setSinapiAbaComDeson('CCD');
    setSinapiAbaSemEncargos('CSE');
    setSinapiLinhaInicio(11);
    setTipoPreco('sem_desoneracao');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Passo 1: Leitura do Arquivo e Descoberta de Abas
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!dataBase) {
      setErrorMsg('Por favor, preencha a Data do Arquivo antes de enviar a planilha.');
      if (e.target) e.target.value = '';
      return;
    }

    if (isNovaFonte && !novaFonteText.trim()) {
      setErrorMsg('Digite o nome da nova base orçamentária.');
      if (e.target) e.target.value = '';
      return;
    }

    setFile(selectedFile);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        
        if (layout === 'SINAPI') {
          processarSinapiWorkbook(wb);
        } else if (wb.SheetNames.length === 1) {
          setSelectedSheet(wb.SheetNames[0]);
          processarPlanilha(wb, wb.SheetNames[0]);
        } else {
          setStep(2);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Erro ao processar o arquivo. Verifique se é um arquivo Excel ou CSV válido.');
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleSelecionarAba = () => {
    if (!selectedSheet || !workbook) return;
    processarPlanilha(workbook, selectedSheet);
  };

  const processarPlanilha = (wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const ws = wb.Sheets[sheetName];
      if (!ws) {
        setErrorMsg('Aba não encontrada.');
        return;
      }

      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
      const data = parseSpreadsheet(rows, layout, getFonteFinal());
      
      if (data.composicoes.length === 0) {
        setErrorMsg('Nenhuma composição detectada com o layout escolhido. Verifique o arquivo e o layout selecionado.');
        setStep(1);
        setFile(null);
        return;
      }

      setParsedData(data);
      setStep(3);
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao ler os dados da aba selecionada.');
    }
  };

  const processarSinapiWorkbook = (wb: XLSX.WorkBook) => {
    try {
      const data = parseSinapiSpreadsheet(wb, estado, undefined, getFonteFinal());
      
      if (data.composicoes.length === 0) {
        setErrorMsg('Nenhuma composição detectada com o layout escolhido. Verifique o arquivo e o layout selecionado.');
        setStep(1);
        setFile(null);
        return;
      }

      setParsedData(data);
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao processar as abas do SINAPI.');
      setStep(1);
      setFile(null);
    }
  };

  // Passo 4: Executar Importação em Lotes
  const iniciarImportacao = async () => {
    if (!parsedData) return;
    setStep(4);
    setErrorMsg(null);

    const fonteFinal = getFonteFinal();
    const { composicoes, itens } = parsedData;

    try {
      // ----------------------------------------------------
      // PASSO 1: IMPORTAR TODOS OS CABEÇALHOS DE COMPOSIÇÕES
      // ----------------------------------------------------
      setEtapaTexto('Etapa 1/5: Importando cabeçalhos de composições...');
      setProgresso(5);

      const compBatchSize = 200;
      const compCodesToIdMap = new Map<string, string>();

      for (let i = 0; i < composicoes.length; i += compBatchSize) {
        const batch = composicoes.slice(i, i + compBatchSize).map(c => ({
          codigo: c.codigo,
          descricao: c.descricao,
          unidade: c.unidade,
          tipo_atividade: c.tipo_atividade,
          fonte: c.fonte,
          regra_medicao: c.regra_medicao,
          producao_equipe: c.producao_equipe ?? 1,
          fic_factor: c.fic_factor ?? 0,
          custo_tempo_fixo: c.custo_tempo_fixo ?? 0,
          custo_atividades_auxiliares: c.custo_atividades_auxiliares ?? 0,
          custo_transporte: c.custo_transporte ?? 0,
          custo_sem_desoneracao: c.custo_sem_desoneracao ?? null,
          custo_desonerado: c.custo_desonerado ?? null,
          custo_sem_encargos: c.custo_sem_encargos ?? null,
          data_base: dataBase ? dataBase : null
        }));

        const { data, error } = await supabase.schema('engenharia')
          .from('composicoes')
          .upsert(batch, { onConflict: 'codigo, fonte' })
          .select('id, codigo');

        if (error) throw error;
        
        if (data) {
          data.forEach((r: any) => compCodesToIdMap.set(r.codigo, r.id));
        }

        const compProg = Math.min(40, Math.round(((i + batch.length) / composicoes.length) * 40));
        setProgresso(compProg);
      }

      // ----------------------------------------------------
      // PASSO 2: CARREGAR OS INSUMOS EXISTENTES DO BANCO (TODAS AS COLUNAS)
      // ----------------------------------------------------
      setEtapaTexto('Etapa 2/5: Carregando banco de insumos para correspondência...');
      setProgresso(45);

      const { data: insumosDb, error: insError } = await supabase.schema('engenharia')
        .from('insumos')
        .select('*')
        .eq('fonte_preco', fonteFinal)
        .eq('estado', estado);

      if (insError) throw insError;

      const insumoCodesToIdMap = new Map<string, string>((insumosDb || []).map(x => [x.codigo, x.id]));
      const insumosDbMap = new Map<string, any>((insumosDb || []).map(x => [x.codigo, x]));

      // ----------------------------------------------------
      // PASSO 3: CRIAR ESQUELETOS PARA INSUMOS NÃO CADASTRADOS (COM VALORES DO EXCEL)
      // ----------------------------------------------------
      setEtapaTexto('Etapa 3/5: Criando insumos não cadastrados...');
      setProgresso(55);

      const insumosNaoExistentes = new Map<string, ParsedItem>();
      itens.forEach(item => {
        if (item.tipo_item === 'INSUMO' && !insumoCodesToIdMap.has(item.child_codigo)) {
          if (item.secao_sicro === 'E' || item.secao_sicro === 'F') return;
          insumosNaoExistentes.set(item.child_codigo, item);
        }
      });

      if (insumosNaoExistentes.size > 0) {
        const isSicro = fonteFinal.startsWith('SICRO');
        const skeletonMap = new Map<string, any>();
        const skeletonList = Array.from(insumosNaoExistentes.values()).map(x => {
          const precoUnit = x.preco_unitario || 0;
          const precoUnitImprod = x.preco_unitario_improdutivo || 0;

          const obj = {
            codigo: x.child_codigo,
            descricao: x.descricao_sugestao || `Insumo ${x.child_codigo} (Criado na Importação)`,
            unidade: x.unidade_sugestao || 'UN',
            tipo: x.tipo_sugestao || 'Material',
            fonte_preco: fonteFinal,
            valor: precoUnit,
            valor_nao_desonerado: isSicro ? precoUnit : (tipoPreco === 'sem_desoneracao' ? precoUnit : 0),
            valor_desonerado: isSicro ? precoUnit : (tipoPreco === 'com_desoneracao' ? precoUnit : 0),
            valor_sem_encargos: isSicro ? precoUnit : (tipoPreco === 'sem_encargos' ? precoUnit : 0),
            valor_nao_desonerado_operativo: isSicro ? precoUnit : ((tipoPreco === 'sem_desoneracao' && precoUnitImprod) ? precoUnit : 0),
            valor_desonerado_operativo: isSicro ? precoUnit : ((tipoPreco === 'com_desoneracao' && precoUnitImprod) ? precoUnit : 0),
            valor_nao_desonerado_improdutivo: isSicro ? precoUnitImprod : ((tipoPreco === 'sem_desoneracao' && precoUnitImprod) ? precoUnitImprod : 0),
            valor_desonerado_improdutivo: isSicro ? precoUnitImprod : ((tipoPreco === 'com_desoneracao' && precoUnitImprod) ? precoUnitImprod : 0),
            estado: estado,
            data_base: dataBase ? dataBase : null
          };
          skeletonMap.set(x.child_codigo, obj);
          return obj;
        });

        for (let i = 0; i < skeletonList.length; i += compBatchSize) {
          const batch = skeletonList.slice(i, i + compBatchSize);
          const { data, error } = await supabase.schema('engenharia')
            .from('insumos')
            .upsert(batch, { onConflict: 'codigo, fonte_preco, estado' })
            .select('id, codigo');

          if (error) throw error;
          if (data) {
            data.forEach((r: any) => {
              insumoCodesToIdMap.set(r.codigo, r.id);
              const skelObj = skeletonMap.get(r.codigo);
              if (skelObj) {
                insumosDbMap.set(r.codigo, {
                  ...skelObj,
                  id: r.id
                });
              }
            });
          }
        }
      }

      // ----------------------------------------------------
      // PASSO 4: ATUALIZAR PREÇOS DE INSUMOS EXISTENTES COM BASE NO TIPO DE PREÇO
      // ----------------------------------------------------
      setEtapaTexto('Etapa 4/5: Atualizando custos de insumos na base...');
      setProgresso(70);

      const uniqueInsumosUpdateMap = new Map<string, any>();

      itens.forEach(item => {
        if (item.secao_sicro === 'E' || item.secao_sicro === 'F') return;
        if (item.tipo_item === 'INSUMO' && item.preco_unitario && item.preco_unitario > 0) {
          const exInsumo = insumosDbMap.get(item.child_codigo);
          if (exInsumo) {
            const precoUnit = item.preco_unitario;
            const precoUnitImprod = item.preco_unitario_improdutivo || 0;

            const isSicro = fonteFinal.startsWith('SICRO');
            const updated = {
              ...exInsumo,
              valor: precoUnit,
              valor_nao_desonerado: isSicro ? precoUnit : (tipoPreco === 'sem_desoneracao' ? precoUnit : exInsumo.valor_nao_desonerado),
              valor_desonerado: isSicro ? precoUnit : (tipoPreco === 'com_desoneracao' ? precoUnit : exInsumo.valor_desonerado),
              valor_sem_encargos: isSicro ? precoUnit : (tipoPreco === 'sem_encargos' ? precoUnit : exInsumo.valor_sem_encargos),
              valor_nao_desonerado_operativo: isSicro ? (precoUnitImprod ? precoUnit : exInsumo.valor_nao_desonerado_operativo) : (tipoPreco === 'sem_desoneracao' ? (precoUnitImprod ? precoUnit : exInsumo.valor_nao_desonerado_operativo) : exInsumo.valor_nao_desonerado_operativo),
              valor_desonerado_operativo: isSicro ? (precoUnitImprod ? precoUnit : exInsumo.valor_desonerado_operativo) : (tipoPreco === 'com_desoneracao' ? (precoUnitImprod ? precoUnit : exInsumo.valor_desonerado_operativo) : exInsumo.valor_desonerado_operativo),
              valor_nao_desonerado_improdutivo: isSicro ? (precoUnitImprod || exInsumo.valor_nao_desonerado_improdutivo) : (tipoPreco === 'sem_desoneracao' ? (precoUnitImprod || exInsumo.valor_nao_desonerado_improdutivo) : exInsumo.valor_nao_desonerado_improdutivo),
              valor_desonerado_improdutivo: isSicro ? (precoUnitImprod || exInsumo.valor_desonerado_improdutivo) : (tipoPreco === 'com_desoneracao' ? (precoUnitImprod || exInsumo.valor_desonerado_improdutivo) : exInsumo.valor_desonerado_improdutivo)
            };
            uniqueInsumosUpdateMap.set(item.child_codigo, updated);
          }
        }
      });

      const insumosToUpdate = Array.from(uniqueInsumosUpdateMap.values());
      
      if (insumosToUpdate.length > 0) {
        for (let i = 0; i < insumosToUpdate.length; i += compBatchSize) {
          const batch = insumosToUpdate.slice(i, i + compBatchSize);
          const { error: updateError } = await supabase.schema('engenharia')
            .from('insumos')
            .upsert(batch, { onConflict: 'codigo, fonte_preco, estado' });
          
          if (updateError) throw updateError;
        }
      }

      // ----------------------------------------------------
      // PASSO 5: VINCULAR FILHOS/ITENS ÀS COMPOSIÇÕES
      // ----------------------------------------------------
      setEtapaTexto('Etapa 5/5: Cadastrando itens de composição...');
      
      const compIdsArray = Array.from(compCodesToIdMap.values());
      const deleteBatchSize = 100;
      for (let i = 0; i < compIdsArray.length; i += deleteBatchSize) {
        const subList = compIdsArray.slice(i, i + deleteBatchSize);
        const { error: delError } = await supabase.schema('engenharia')
          .from('composicao_itens')
          .delete()
          .in('composicao_id', subList);
        
        if (delError) throw delError;
      }

      const insertItens: any[] = [];
      itens.forEach(item => {
        const compId = compCodesToIdMap.get(item.parent_codigo);
        if (!compId) return;

        let insumoId: string | null = null;
        let subCompId: string | null = null;

        if (item.tipo_item === 'INSUMO') {
          insumoId = insumoCodesToIdMap.get(item.child_codigo) || null;
        } else {
          subCompId = compCodesToIdMap.get(item.child_codigo) || null;
        }

        if (insumoId || subCompId) {
          insertItens.push({
            composicao_id: compId,
            insumo_id: insumoId,
            sub_composicao_id: subCompId,
            coeficiente: item.coeficiente,
            perda_percentual: item.perda_percentual,
            secao_sicro: item.secao_sicro,
            codigo_auxiliar: item.codigo_auxiliar,
            codigo_ln: item.codigo_ln,
            codigo_rp: item.codigo_rp,
            codigo_p: item.codigo_p,
            preco_unitario: item.preco_unitario || 0,
            preco_unitario_improdutivo: item.preco_unitario_improdutivo || 0
          });
        }
      });

      setTotalItems(insertItens.length);

      const itemBatchSize = 500;
      let processados = 0;
      for (let i = 0; i < insertItens.length; i += itemBatchSize) {
        const batch = insertItens.slice(i, i + itemBatchSize);
        const { error: insertError } = await supabase.schema('engenharia')
          .from('composicao_itens')
          .insert(batch);

        if (insertError) throw insertError;

        processados += batch.length;
        setItemsProcessados(processados);
        const itemProg = 70 + Math.round((processados / insertItens.length) * 30);
        setProgresso(itemProg);
      }

      setStep(5);
      onSuccess(getFonteFinal());
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Falha na importação: ${err.message}`);
      setStep(3);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Importação de Composições</h2>
          </div>
          {step !== 4 && (
            <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-start gap-3 border border-red-200">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Passo 1: Configuração e Upload */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">1. Configurações da Base</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                  
                  {/* Seleção de Banco */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fonte (Base de Dados)</label>
                    {isNovaFonte ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="EX: ORSE" 
                          value={novaFonteText}
                          onChange={(e) => setNovaFonteText(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase" 
                        />
                        <button onClick={() => setIsNovaFonte(false)} className="text-xs text-blue-600 font-medium whitespace-nowrap hover:underline">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <select 
                          value={fonteSelect} 
                          onChange={(e) => setFonteSelect(e.target.value)} 
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          {fontesCadastradas.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button onClick={() => setIsNovaFonte(true)} className="text-xs text-blue-600 font-medium whitespace-nowrap hover:underline">
                          + Nova
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Seleção de Estado (UF) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Estado (UF)</label>
                    <select 
                      value={estado} 
                      onChange={(e) => {
                        const uf = e.target.value;
                        setEstado(uf);
                        if (layout === 'SINAPI' && workbook) {
                          autoDetectColumnForState(workbook, uf);
                        }
                      }} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Layout / Layout do Arquivo</label>
                    <select value={layout} onChange={(e) => setLayout(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="SINAPI">SINAPI (Analítico)</option>
                      <option value="SICRO">SICRO (Analítico de Custos)</option>
                      <option value="GOINFRA">GOINFRA (Composição de Serviço)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Data do Arquivo</label>
                    <input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>

                  {layout !== 'SICRO' && layout !== 'SINAPI' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Preço (Desoneração)</label>
                      <select value={tipoPreco} onChange={(e) => setTipoPreco(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="sem_desoneracao">Sem Desoneração (Não Desonerado)</option>
                        <option value="com_desoneracao">Com Desoneração (Desonerado)</option>
                        <option value="sem_encargos">Sem Encargos</option>
                      </select>
                    </div>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">2. Enviar Planilha</h3>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:bg-slate-50 hover:border-blue-500 transition-colors cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-1">Clique para enviar a planilha de composições</h4>
                  <p className="text-slate-500 text-sm">Suporta arquivos .xls, .xlsx e .csv</p>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Passo 2: Seleção de Abas */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <Database className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Múltiplas Abas Detectadas</h3>
                <p className="text-slate-500">Selecione qual aba da planilha contém os dados de composição analíticos.</p>
              </div>

              <div className="max-w-sm mx-auto">
                <label className="block text-sm font-medium text-slate-700 mb-2">Aba da Planilha</label>
                <select 
                  value={selectedSheet} 
                  onChange={(e) => setSelectedSheet(e.target.value)} 
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                >
                  <option value="" disabled>-- Selecione --</option>
                  {sheetNames.map(sheet => (
                    <option key={sheet} value={sheet}>{sheet}</option>
                  ))}
                </select>

                <button 
                  onClick={handleSelecionarAba}
                  disabled={!selectedSheet}
                  className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  Confirmar e Analisar
                </button>
              </div>
            </div>
          )}

          {/* Passo 3: Confirmação e Visualização de Resumo */}
          {step === 3 && parsedData && (
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-emerald-950 mb-2">Resumo da Planilha Analisada</h3>
                <p className="text-emerald-800 text-sm mb-4">
                  O arquivo foi analisado com sucesso conforme as diretrizes do layout <strong>{layout}</strong>.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-emerald-100">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Composições Detectadas</p>
                    <p className="text-3xl font-extrabold text-slate-800 mt-1">{parsedData.composicoes.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-emerald-100">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Itens de Composição</p>
                    <p className="text-3xl font-extrabold text-slate-800 mt-1">{parsedData.itens.length}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Parâmetros de Importação</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block">Fonte destino:</span>
                    <strong className="text-slate-800 text-base">{getFonteFinal()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Data do arquivo:</span>
                    <strong className="text-slate-800 text-base">{dataBase.split('-').reverse().join('/')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tipo de Preço:</span>
                    <strong className="text-slate-800 text-base">
                      {layout === 'SINAPI' ? 'Todas as Modalidades' : (tipoPreco === 'sem_desoneracao' ? 'Sem Desoneração' : tipoPreco === 'com_desoneracao' ? 'Com Desoneração' : 'Sem Encargos')}
                    </strong>
                  </div>
                </div>
              </div>

              {layout === 'SINAPI' && (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Configuração de Custos (SINAPI Multi-Abas)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Aba Sem Desoneração (CSD)
                      </label>
                      <select 
                        value={sinapiAbaSemDeson} 
                        onChange={(e) => setSinapiAbaSemDeson(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      >
                        {sheetNames.map(sheet => <option key={sheet} value={sheet}>{sheet}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Aba Com Desoneração (CCD)
                      </label>
                      <select 
                        value={sinapiAbaComDeson} 
                        onChange={(e) => setSinapiAbaComDeson(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      >
                        {sheetNames.map(sheet => <option key={sheet} value={sheet}>{sheet}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Aba Sem Encargos (CSE)
                      </label>
                      <select 
                        value={sinapiAbaSemEncargos} 
                        onChange={(e) => setSinapiAbaSemEncargos(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      >
                        {sheetNames.map(sheet => <option key={sheet} value={sheet}>{sheet}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="flex flex-col justify-center">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Letra da Coluna de Custo (Estado: {estado})
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={colunaCusto} 
                          onChange={(e) => setColunaCusto(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                          placeholder="Ex: Y"
                          maxLength={3}
                          className="w-full max-w-[120px] px-3 py-2 border border-slate-300 rounded-lg text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                        />
                        <span className="text-xs text-slate-400">
                          (Detectada para {estado})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Linha de Início dos Valores
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          value={sinapiLinhaInicio} 
                          onChange={(e) => setSinapiLinhaInicio(parseInt(e.target.value) || 11)}
                          min={1}
                          className="w-full max-w-[120px] px-3 py-2 border border-slate-300 rounded-lg text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                        />
                        <span className="text-xs text-slate-400">
                          (Padrão: Linha 11)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button onClick={resetState} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">
                  Voltar / Reiniciar
                </button>
                <button onClick={iniciarImportacao} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-2">
                  Confirmar e Salvar no Banco
                </button>
              </div>
            </div>
          )}

          {/* Passo 4: Processando */}
          {step === 4 && (
            <div className="space-y-6 text-center py-8">
              <RefreshCw className="w-12 h-12 text-blue-600 mx-auto animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800">{etapaTexto}</h3>
              
              <div className="w-full max-w-md mx-auto bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 mt-4">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full" 
                  style={{ width: `${progresso}%` }}
                />
              </div>
              
              <p className="text-sm text-slate-500 mt-2">
                Progresso: <strong>{progresso}%</strong> 
                {totalItems > 0 && ` | ${itemsProcessados} de ${totalItems} itens processados`}
              </p>
            </div>
          )}

          {/* Passo 5: Sucesso */}
          {step === 5 && parsedData && (
            <div className="space-y-6 text-center py-10">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Importação Concluída!</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {layout === 'SINAPI' ? (
                  <>
                    Foram salvas com sucesso no banco de dados <strong>{parsedData.composicoes.length}</strong> composições do SINAPI, e seus custos de referência para o estado de <strong>{estado}</strong> foram importados para todas as modalidades (Sem Desoneração, Com Desoneração e Sem Encargos)!
                  </>
                ) : (
                  <>
                    Foram salvas com sucesso no banco de dados <strong>{parsedData.composicoes.length}</strong> composições e os custos unitários foram atribuídos corretamente à coluna <strong>{tipoPreco === 'sem_desoneracao' ? 'valor_nao_desonerado' : tipoPreco === 'com_desoneracao' ? 'valor_desonerado' : 'valor_sem_encargos'}</strong> na tabela de insumos!
                  </>
                )}
              </p>

              <button 
                onClick={handleClose}
                className="mt-6 px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl shadow-md transition-colors"
              >
                Voltar para Composições
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
