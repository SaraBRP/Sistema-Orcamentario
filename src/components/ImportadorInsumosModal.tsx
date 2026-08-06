import { useState, useRef, useEffect } from 'react';
import { X, FileSpreadsheet, Database, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

type ImportadorInsumosModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (banco?: string) => void;
};

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const TIPOS_PADRAO = [
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

export default function ImportadorInsumosModal({ isOpen, onClose, onSuccess }: ImportadorInsumosModalProps) {
  const [step, setStep] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configurações
  const [fontesCadastradas, setFontesCadastradas] = useState<string[]>(['SINAPI', 'SICRO 3']);
  const [isNovaFonte, setIsNovaFonte] = useState(false);
  const [fonteSelect, setFonteSelect] = useState('');
  const [novaFonteText, setNovaFonteText] = useState('');
  
  const [estado, setEstado] = useState('');
  const [dataBase, setDataBase] = useState('');
  const [tipoPreco, setTipoPreco] = useState<'sem_desoneracao' | 'com_desoneracao' | 'sem_encargos'>('sem_desoneracao');
  const [linhaInicioDadosText, setLinhaInicioDadosText] = useState<string>('');
  const [classificacaoPlanilha, setClassificacaoPlanilha] = useState<'misto' | 'equipamento' | 'material' | 'mao_de_obra'>('misto');

  const getFonteFinal = () => isNovaFonte ? novaFonteText.toUpperCase().trim() : fonteSelect;

  useEffect(() => {
    if (getFonteFinal() === 'SINAPI') {
      setClassificacaoPlanilha('misto');
    }
  }, [fonteSelect, isNovaFonte, novaFonteText]);

  const linhaInicioDados = parseInt(linhaInicioDadosText) || 2;

  // Arquivo e Abas
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');

  // Colunas Excel e Mapeamento
  const [colunasExcel, setColunasExcel] = useState<{ letter: string; label: string; index: number }[]>([]);
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({});

  // Classificações customizadas da planilha (Misto)
  const [classificacoesExcel, setClassificacoesExcel] = useState<string[]>([]);
  const [mapeamentoTipos, setMapeamentoTipos] = useState<Record<string, string>>({});

  // Processamento
  const [progresso, setProgresso] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsProcessados, setItemsProcessados] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      resetState();
      // Busca fontes únicas já cadastradas para preencher o select
      const fetchFontes = async () => {
        const { data } = await supabase.schema('engenharia').from('insumos').select('fonte_preco').limit(50000);
        if (data) {
          const unicas = Array.from(new Set(data.map(i => i.fonte_preco).filter(Boolean)));
          // Junta com as padrão e remove duplicatas
          const final = Array.from(new Set([...fontesCadastradas, ...unicas])).sort();
          setFontesCadastradas(final as string[]);
        }
      };
      fetchFontes();
    }
  }, [isOpen]);

  // Detector de colunas e auto-mapeamento reativo
  useEffect(() => {
    if (step === 3 && workbook && selectedSheet) {
      detectarColunas();
    }
  }, [step, selectedSheet, workbook, tipoPreco, linhaInicioDados, classificacaoPlanilha]);

  const detectarColunas = () => {
    try {
      const ws = workbook?.Sheets[selectedSheet];
      if (!ws) return;

      const ref = ws['!ref'];
      if (!ref) return;

      const range = XLSX.utils.decode_range(ref);
      const headerRowIdx = Math.max(0, linhaInicioDados - 2);

      const colList: { letter: string; label: string; index: number }[] = [];
      
      function getColLetter(colIndex: number): string {
        let letter = '';
        let temp = colIndex;
        while (temp >= 0) {
          letter = String.fromCharCode((temp % 26) + 65) + letter;
          temp = Math.floor(temp / 26) - 1;
        }
        return letter;
      }

      for (let c = range.s.c; c <= range.e.c; c++) {
        const letter = getColLetter(c);
        const cellAddr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
        const cellVal = ws[cellAddr]?.v;
        const label = cellVal ? `${letter} (${String(cellVal).trim()})` : letter;
        colList.push({ letter, label, index: c });
      }

      setColunasExcel(colList);

      // Auto-mapeamento inteligente com base na linha de cabeçalho
      const autoMap: Record<string, string> = {};
      colList.forEach(col => {
        const cellAddr = XLSX.utils.encode_cell({ r: headerRowIdx, c: col.index });
        const valStr = String(ws[cellAddr]?.v || '').toLowerCase();

        if (valStr.includes('codigo') || valStr.includes('código')) autoMap.codigo = col.letter;
        if (valStr.includes('descri') || valStr.includes('nome')) autoMap.descricao = col.letter;
        if (valStr.includes('unidade') || valStr === 'und' || valStr === 'un') autoMap.unidade = col.letter;

        // Auto-mapeamento de tipo/classificação
        if (valStr.includes('classificacao') || valStr.includes('classificação') || valStr.includes('tipo')) {
          autoMap.tipo_col = col.letter;
        }

        // Auto-mapeamento de preço de equipamentos
        if (valStr.includes('produtivo') || valStr.includes('operativo') || valStr === 'custo produtivo' || valStr.includes('produt')) {
          autoMap.valor_produtivo = col.letter;
        }
        if (valStr.includes('improdutivo') || valStr === 'custo improdutivo' || valStr.includes('improdut')) {
          autoMap.valor_improdutivo = col.letter;
        }

        // Auto-mapeamento de preço dinâmico de acordo com o tipo
        if (tipoPreco === 'sem_desoneracao') {
          if (valStr.includes('nao desonerado') || valStr.includes('não desonerado') || valStr.includes('sem desoneracao') || valStr.includes('sem desoneração')) {
            autoMap.valor = col.letter;
          }
        } else if (tipoPreco === 'com_desoneracao') {
          if (valStr.includes('desonerado') && !valStr.includes('nao') && !valStr.includes('não')) {
            autoMap.valor = col.letter;
          }
        } else if (tipoPreco === 'sem_encargos') {
          if (valStr.includes('sem encargos') || valStr.includes('sem encargo') || valStr.includes('encargo')) {
            autoMap.valor = col.letter;
          }
        }

        // Fallback genérico para coluna de preço se não foi mapeada especificamente
        if (!autoMap.valor) {
          if (valStr.includes('custo') || valStr.includes('valor') || valStr.includes('preço') || valStr.includes('preco') || valStr.includes('unitário') || valStr.includes('unitario')) {
            autoMap.valor = col.letter;
          }
        }
      });

      setMapeamento(autoMap);
    } catch (err) {
      console.error('Erro ao detectar colunas:', err);
    }
  };

  if (!isOpen) return null;

  const resetState = () => {
    setStep(1);
    setFile(null);
    setWorkbook(null);
    setSheetNames([]);
    setSelectedSheet('');
    setColunasExcel([]);
    setMapeamento({});
    setClassificacoesExcel([]);
    setMapeamentoTipos({});
    setProgresso(0);
    setTotalItems(0);
    setItemsProcessados(0);
    setErrorMsg(null);
    setDataBase('');
    setFonteSelect('');
    setEstado('');
  };


  const handleClose = () => {
    resetState();
    onClose();
  };

  const carregarClassificacoesExcel = () => {
    try {
      const ws = workbook?.Sheets[selectedSheet];
      if (!ws) return;
      const ref = ws['!ref'];
      if (!ref) return;
      const range = XLSX.utils.decode_range(ref);
      const dataStartRowIdx = Math.max(1, linhaInicioDados - 1);
      const endRowIdx = range.e.r;

      const getCellValue = (colLetter: string, r: number) => {
        if (!colLetter) return '';
        const cellAddress = colLetter + (r + 1);
        return ws[cellAddress]?.v;
      };

      const distinct = new Set<string>();
      for (let r = dataStartRowIdx; r <= endRowIdx; r++) {
        const val = getCellValue(mapeamento.tipo_col, r);
        if (val !== undefined && val !== null) {
          const valStr = String(val).trim();
          if (valStr) distinct.add(valStr);
        }
      }

      const uniqueList = Array.from(distinct).sort();
      setClassificacoesExcel(uniqueList);

      // Auto-mapeamento inteligente das classificações do Excel para os tipos padrão do sistema
      const autoMap: Record<string, string> = {};
      uniqueList.forEach(val => {
        const upper = val.toUpperCase();
        if ((upper.includes('EQUIP') || upper.includes('MÁQUINA') || upper.includes('MAQUINA')) && (upper.includes('AQUISIÇÃO') || upper.includes('AQUISICAO') || upper.includes('AQUIS'))) {
          autoMap[val] = 'Equipamento para Aquisição Permanente';
        } else if (upper.includes('EQUIP') || upper.includes('MÁQUINA') || upper.includes('MAQUINA') || upper.includes('LOCAÇÃO') || upper.includes('LOCACAO') || upper.includes('ALOCAÇÃO') || upper.includes('ALOCACAO')) {
          autoMap[val] = 'Equipamento';
        } else if (upper.includes('MÃO') || upper.includes('MAO') || upper.includes('OBRA') || upper.includes('HORISTA') || upper.includes('MENSALISTA') || upper.includes('MÃO DE OBRA')) {
          autoMap[val] = 'Mão de Obra';
        } else if (upper.includes('SERV') || upper.includes('TERCEIR') || upper.includes('TERCEIROS')) {
          autoMap[val] = 'Outros';
        } else if (upper.includes('ESPECIAIS') || upper.includes('ENCARGOS') || upper.includes('COMPLEMENTARES')) {
          autoMap[val] = 'Outros';
        } else if (upper.includes('MATER') || upper.includes('MATERIAL')) {
          autoMap[val] = 'Material';
        } else {
          autoMap[val] = 'Material';
        }
      });

      setMapeamentoTipos(autoMap);
    } catch (err) {
      console.error('Erro ao carregar classificações:', err);
    }
  };

  const handleAvancarDePasso3 = () => {
    if (classificacaoPlanilha === 'misto') {
      carregarClassificacoesExcel();
      setStep(35);
    } else {
      iniciarImportacao();
    }
  };

  // Passo 1: Leitura do Arquivo e Descoberta de Abas
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!getFonteFinal()) {
      setErrorMsg('Por favor, selecione a Fonte (Base de Dados) antes de enviar a planilha.');
      if (e.target) {
        e.target.value = '';
      }
      return;
    }

    if (!estado) {
      setErrorMsg('Por favor, selecione o Estado (UF) antes de enviar a planilha.');
      if (e.target) {
        e.target.value = '';
      }
      return;
    }

    if (!dataBase) {
      setErrorMsg('Por favor, preencha a Data do Arquivo antes de enviar a planilha.');
      if (e.target) {
        e.target.value = '';
      }
      return;
    }

    if (isNovaFonte && !novaFonteText.trim()) {
      setErrorMsg('Digite o nome da nova base orçamentária.');
      if (e.target) {
        e.target.value = '';
      }
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
        
        if (wb.SheetNames.length === 1) {
          // Se só tem uma aba, pula para o Step 3 (o useEffect detecta colunas)
          setSelectedSheet(wb.SheetNames[0]);
          setStep(3);
        } else {
          // Vai para o Step 2 (Selecionar Aba)
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
    setStep(3);
  };

  // Passo 4: Processamento
  const iniciarImportacao = async () => {
    if (!dataBase) {
      setErrorMsg('Por favor, preencha a Data do Arquivo.');
      setStep(1);
      return;
    }
    const fonteFinal = getFonteFinal();
    setStep(4);
    setErrorMsg(null);

    const ws = workbook?.Sheets[selectedSheet];
    if (!ws) {
      setErrorMsg('Aba não encontrada.');
      setStep(3);
      return;
    }

    const ref = ws['!ref'];
    if (!ref) {
      setErrorMsg('Planilha vazia.');
      setStep(3);
      return;
    }

    const range = XLSX.utils.decode_range(ref);
    const dataStartRowIdx = Math.max(1, linhaInicioDados - 1);
    const endRowIdx = range.e.r;

    const parseValor = (val: any) => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return val;
      let str = String(val).replace('R$', '').trim();
      str = str.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(str);
      return isNaN(parsed) ? 0 : parsed;
    };

    const getCellValue = (colLetter: string, r: number) => {
      if (!colLetter) return '';
      const cellAddress = colLetter + (r + 1);
      return ws[cellAddress]?.v;
    };

    const itensValidos = [];

    for (let r = dataStartRowIdx; r <= endRowIdx; r++) {
      const codigoRaw = getCellValue(mapeamento.codigo, r);
      const descRaw = getCellValue(mapeamento.descricao, r);
      
      if (!codigoRaw || !descRaw) continue;

      let codigo = String(codigoRaw).trim();
      const descricao = String(descRaw).trim();

      // Pular linhas de cabeçalho secundárias ou auxiliares na planilha
      const codeLower = codigo.toLowerCase();
      if (
        codeLower === 'código' || 
        codeLower === 'codigo' || 
        codeLower === 'código auxiliar' || 
        codeLower === 'codigo auxiliar' || 
        codeLower === 'cód. auxiliar' || 
        codeLower === 'cod. auxiliar'
      ) {
        continue;
      }

      // Se a fonte for GOINFRA e o código for numérico puro, padroniza com zeros à esquerda (4 dígitos)
      if (getFonteFinal() === 'GOINFRA' && /^\d+$/.test(codigo)) {
        codigo = codigo.padStart(4, '0');
      }

      // Determinar o tipo de insumo
      let tipoItem = 'Material';
      if (classificacaoPlanilha === 'equipamento') {
        tipoItem = 'Equipamento';
      } else if (classificacaoPlanilha === 'mao_de_obra') {
        tipoItem = 'Mão de Obra';
      } else if (classificacaoPlanilha === 'material') {
        tipoItem = 'Material';
      } else if (classificacaoPlanilha === 'misto') {
        const tipoColVal = String(getCellValue(mapeamento.tipo_col, r) || '').trim();
        tipoItem = mapeamentoTipos[tipoColVal] || 'Material';
      }

      let fallbackUnidade = 'un';
      if (tipoItem === 'Equipamento' || tipoItem === 'Mão de Obra') {
        fallbackUnidade = 'h';
      }

      let unidade = fallbackUnidade;
      if (classificacaoPlanilha === 'equipamento' || tipoItem === 'Equipamento') {
        unidade = 'h';
      } else if (classificacaoPlanilha === 'mao_de_obra' || tipoItem === 'Mão de Obra') {
        unidade = 'h';
      } else if (mapeamento.unidade) {
        unidade = String(getCellValue(mapeamento.unidade, r) || fallbackUnidade).trim().toLowerCase().substring(0, 5);
      }
      unidade = unidade.toLowerCase();

      let valor_nao_desonerado = 0;
      let valor_desonerado = 0;
      let valor_sem_encargos = 0;
      let valor_nao_desonerado_operativo = 0;
      let valor_desonerado_operativo = 0;
      let valor_nao_desonerado_improdutivo = 0;
      let valor_desonerado_improdutivo = 0;
      let valorPrincipal = 0;

      const isSicro = getFonteFinal().startsWith('SICRO');
      const isSicroMaterial = isSicro && classificacaoPlanilha === 'material';

      if (tipoItem === 'Equipamento' && classificacaoPlanilha === 'equipamento') {
        const prodVal = parseValor(getCellValue(mapeamento.valor_produtivo, r));
        const improdVal = parseValor(getCellValue(mapeamento.valor_improdutivo, r));
        valorPrincipal = prodVal;

        if (isSicroMaterial) {
          valor_nao_desonerado_operativo = prodVal;
          valor_nao_desonerado_improdutivo = improdVal;
          valor_desonerado_operativo = prodVal;
          valor_desonerado_improdutivo = improdVal;
        } else {
          if (tipoPreco === 'sem_desoneracao') {
            valor_nao_desonerado_operativo = prodVal;
            valor_nao_desonerado_improdutivo = improdVal;
          } else if (tipoPreco === 'com_desoneracao') {
            valor_desonerado_operativo = prodVal;
            valor_desonerado_improdutivo = improdVal;
          } else if (tipoPreco === 'sem_encargos') {
            valor_desonerado_operativo = prodVal;
            valor_desonerado_improdutivo = improdVal;
          }
        }
      } else {
        const priceVal = parseValor(getCellValue(mapeamento.valor, r));
        valorPrincipal = priceVal;

        if (tipoItem === 'Equipamento') {
          if (isSicroMaterial) {
            valor_nao_desonerado_operativo = priceVal;
            valor_desonerado_operativo = priceVal;
          } else {
            if (tipoPreco === 'sem_desoneracao') {
              valor_nao_desonerado_operativo = priceVal;
            } else if (tipoPreco === 'com_desoneracao') {
              valor_desonerado_operativo = priceVal;
            } else if (tipoPreco === 'sem_encargos') {
              valor_desonerado_operativo = priceVal;
            }
          }
        } else {
          if (isSicroMaterial) {
            valor_nao_desonerado = priceVal;
            valor_desonerado = priceVal;
          } else {
            if (tipoPreco === 'sem_desoneracao') {
              valor_nao_desonerado = priceVal;
            } else if (tipoPreco === 'com_desoneracao') {
              valor_desonerado = priceVal;
            } else if (tipoPreco === 'sem_encargos') {
              valor_sem_encargos = priceVal;
            }
          }
        }
      }

      itensValidos.push({
        tipo: tipoItem,
        codigo,
        descricao,
        unidade,
        estado,
        fonte_preco: fonteFinal,
        data_base: dataBase,
        estado_registro: 'ativo',
        
        valor_nao_desonerado,
        valor_desonerado,
        valor_sem_encargos,
        
        valor_nao_desonerado_operativo,
        valor_desonerado_operativo,
        valor_nao_desonerado_improdutivo,
        valor_desonerado_improdutivo,
        
        valor: valorPrincipal
      });
    }

    // Remover duplicatas de código dentro da própria planilha para evitar erros de restrição no lote
    const uniqueItensMap = new Map<string, any>();
    itensValidos.forEach(item => {
      uniqueItensMap.set(item.codigo, item);
    });
    const itensValidosDeduplicados = Array.from(uniqueItensMap.values());

    setTotalItems(itensValidosDeduplicados.length);

    if (itensValidosDeduplicados.length === 0) {
      setErrorMsg('Nenhum dado válido encontrado para importar com o mapeamento atual.');
      setStep(3);
      return;
    }

    const BATCH_SIZE = 200;
    let processados = 0;

    for (let i = 0; i < itensValidosDeduplicados.length; i += BATCH_SIZE) {
      const batch = itensValidosDeduplicados.slice(i, i + BATCH_SIZE);
      
      try {
        const codigos = batch.map(b => b.codigo);
        const { data: existentes } = await supabase.schema('engenharia').from('insumos')
          .select('id, codigo, valor_nao_desonerado, valor_desonerado, valor_sem_encargos, valor_nao_desonerado_operativo, valor_desonerado_operativo, valor_nao_desonerado_improdutivo, valor_desonerado_improdutivo')
          .eq('fonte_preco', fonteFinal)
          .eq('estado', estado)
          .in('codigo', codigos);

        const mapExistentes = new Map((existentes || []).map(e => [e.codigo, e]));

        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        batch.forEach(item => {
          const exItem = mapExistentes.get(item.codigo);
          if (exItem) {
            toUpdate.push({
              id: exItem.id,
              codigo: item.codigo,
              descricao: item.descricao,
              unidade: item.unidade,
              estado: item.estado,
              fonte_preco: item.fonte_preco,
              data_base: item.data_base,
              estado_registro: item.estado_registro,
              tipo: item.tipo,
              
              valor_nao_desonerado: (item.fonte_preco.startsWith('SICRO') && classificacaoPlanilha === 'material') ? item.valor : (tipoPreco === 'sem_desoneracao' ? item.valor_nao_desonerado : exItem.valor_nao_desonerado),
              valor_desonerado: (item.fonte_preco.startsWith('SICRO') && classificacaoPlanilha === 'material') ? item.valor : (tipoPreco === 'com_desoneracao' ? item.valor_desonerado : exItem.valor_desonerado),
              valor_sem_encargos: (item.fonte_preco.startsWith('SICRO') && classificacaoPlanilha === 'material') ? item.valor_sem_encargos : (tipoPreco === 'sem_encargos' ? item.valor_sem_encargos : exItem.valor_sem_encargos),
              
              valor_nao_desonerado_operativo: (item.fonte_preco.startsWith('SICRO') && classificacaoPlanilha === 'material') ? item.valor_nao_desonerado_operativo : (tipoPreco === 'sem_desoneracao' ? item.valor_nao_desonerado_operativo : exItem.valor_nao_desonerado_operativo),
              valor_desonerado_operativo: (item.fonte_preco.startsWith('SICRO') && classificacaoPlanilha === 'material') ? item.valor_desonerado_operativo : (tipoPreco === 'com_desoneracao' ? item.valor_desonerado_operativo : exItem.valor_desonerado_operativo),
              valor_nao_desonerado_improdutivo: (item.fonte_preco.startsWith('SICRO') && classificacaoPlanilha === 'material') ? item.valor_nao_desonerado_improdutivo : (tipoPreco === 'sem_desoneracao' ? item.valor_nao_desonerado_improdutivo : exItem.valor_nao_desonerado_improdutivo),
              valor_desonerado_improdutivo: (item.fonte_preco.startsWith('SICRO') && classificacaoPlanilha === 'material') ? item.valor_desonerado_improdutivo : (tipoPreco === 'com_desoneracao' ? item.valor_desonerado_improdutivo : exItem.valor_desonerado_improdutivo),
              
              valor: item.valor
            });
          } else {
            toInsert.push(item);
          }
        });

        if (toInsert.length > 0) {
          const { error: errInsert } = await supabase.schema('engenharia').from('insumos').insert(toInsert);
          if (errInsert) throw errInsert;
        }

        if (toUpdate.length > 0) {
          const { error: errUpdate } = await supabase.schema('engenharia').from('insumos').upsert(toUpdate);
          if (errUpdate) throw errUpdate;
        }

        processados += batch.length;
        setItemsProcessados(processados);
        setProgresso(Math.round((processados / itensValidos.length) * 100));

      } catch (err: any) {
        console.error('Erro no lote', i, err);
        setErrorMsg(`A importação falhou no lote ${Math.floor(i/BATCH_SIZE) + 1}. Erro: ${err.message}`);
        setStep(3);
        return;
      }
    }

    setStep(5);
    onSuccess(fonteFinal);
  };

  const getCamposSistema = () => {
    const labelPreco = tipoPreco === 'sem_desoneracao' ? 'Preço Sem Desoneração (R$)' :
                       tipoPreco === 'com_desoneracao' ? 'Preço Com Desoneração (R$)' :
                       'Preço Sem Encargos (R$)';

    const camposBase = [
      { key: 'codigo', label: 'Código do Insumo *', required: true },
      { key: 'descricao', label: 'Descrição *', required: true },
      { key: 'unidade', label: `Unidade (Opcional - Padrão: ${classificacaoPlanilha === 'equipamento' || classificacaoPlanilha === 'mao_de_obra' ? 'h' : 'un'})`, required: false }
    ];

    if (classificacaoPlanilha === 'equipamento') {
      const labelProd = tipoPreco === 'sem_desoneracao' ? 'Custo Produtivo Sem Desoneração (R$/h)' :
                        tipoPreco === 'com_desoneracao' ? 'Custo Produtivo Com Desoneração (R$/h)' :
                        'Custo Produtivo Sem Encargos (R$/h)';
      const labelImprod = tipoPreco === 'sem_desoneracao' ? 'Custo Improdutivo Sem Desoneração (R$/h)' :
                          tipoPreco === 'com_desoneracao' ? 'Custo Improdutivo Com Desoneração (R$/h)' :
                          'Custo Improdutivo Sem Encargos (R$/h)';
      return [
        ...camposBase,
        { key: 'valor_produtivo', label: `${labelProd} *`, required: true },
        { key: 'valor_improdutivo', label: `${labelImprod} *`, required: true }
      ];
    }

    if (classificacaoPlanilha === 'misto') {
      return [
        ...camposBase,
        { key: 'tipo_col', label: 'Coluna do Tipo/Classificação *', required: true },
        { key: 'valor', label: `${labelPreco} *`, required: true }
      ];
    }

    return [
      ...camposBase,
      { key: 'valor', label: `${labelPreco} *`, required: true }
    ];
  };

  const isMapeamentoInvalido = () => {
    if (!mapeamento.codigo || !mapeamento.descricao) return true;
    if (classificacaoPlanilha === 'equipamento') {
      return !mapeamento.valor_produtivo || !mapeamento.valor_improdutivo;
    }
    if (classificacaoPlanilha === 'misto') {
      return !mapeamento.tipo_col || !mapeamento.valor;
    }
    return !mapeamento.valor;
  };

  const getMapeamentoWarningText = () => {
    if (!mapeamento.codigo || !mapeamento.descricao) {
      return 'Você precisa mapear o Código e a Descrição para importar.';
    }
    if (classificacaoPlanilha === 'equipamento') {
      if (!mapeamento.valor_produtivo || !mapeamento.valor_improdutivo) {
        return 'Você precisa mapear o Custo Produtivo e o Custo Improdutivo para importar equipamentos.';
      }
    }
    if (classificacaoPlanilha === 'misto') {
      if (!mapeamento.tipo_col || !mapeamento.valor) {
        return 'Você precisa mapear a Coluna do Tipo/Classificação e o Preço para importar.';
      }
    }
    if (!mapeamento.valor) {
      return 'Você precisa mapear a coluna de Preço para importar.';
    }
    return '';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Importação de Banco Orçamentário</h2>
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

          {/* STEP 1: Configuração e Upload */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">1. Configurações da Base</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Seleção de Banco */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Fonte (Base de Dados)</label>
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
                          <option value="" disabled>Selecione a Fonte...</option>
                          {fontesCadastradas.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <button onClick={() => setIsNovaFonte(true)} className="text-xs text-blue-600 font-medium whitespace-nowrap hover:underline">
                          + Nova
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Estado (UF)</label>
                    <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="" disabled>Selecione o Estado...</option>
                      {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Data do Arquivo</label>
                    <input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>

                  {getFonteFinal() !== 'SINAPI' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Classificação dos Itens</label>
                      <select value={classificacaoPlanilha} onChange={(e) => setClassificacaoPlanilha(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="misto">Misto (Definido por coluna - ex: SINAPI)</option>
                        <option value="equipamento">Dedicado: Todos são Equipamentos</option>
                        <option value="material">Dedicado: Todos são Materiais</option>
                        <option value="mao_de_obra">Dedicado: Todos são Mão de Obra</option>
                      </select>
                    </div>
                  )}

                  {(!getFonteFinal().startsWith('SICRO') || classificacaoPlanilha !== 'material') ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Preço da Planilha</label>
                      <select value={tipoPreco} onChange={(e) => setTipoPreco(e.target.value as any)} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="sem_desoneracao">Sem Desoneração</option>
                        <option value="com_desoneracao">Com Desoneração</option>
                        <option value="sem_encargos">Sem Encargos</option>
                      </select>
                    </div>
                  ) : (
                    <div className="hidden sm:block" />
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Linha de Início dos Dados</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 2"
                      value={linhaInicioDadosText} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d+$/.test(val)) {
                          setLinhaInicioDadosText(val);
                        }
                      }} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                </div>
                
                <p className="mt-3 text-xs text-slate-500">
                  <span className="font-bold">Nota:</span> Ao importar novos dados para uma mesma Fonte e Estado, os insumos já existentes terão os preços atualizados, e insumos inéditos serão criados automaticamente.
                </p>
              </div>

              <div className="h-px bg-slate-200" />

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">2. Enviar Arquivo</h3>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center hover:bg-slate-50 hover:border-blue-500 transition-colors cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-1">Clique para enviar a planilha</h4>
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

          {/* STEP 2: Seleção de Aba (Só aparece se o excel tiver +1 aba) */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <Database className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-800 mb-2">Múltiplas Abas Detectadas</h3>
                <p className="text-slate-500">O arquivo enviado possui várias abas. Selecione de qual delas você deseja importar os insumos.</p>
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
              </div>
            </div>
          )}

          {/* STEP 3: Mapeamento de Colunas */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-4">
                <FileSpreadsheet className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-blue-900">{file?.name} <span className="text-blue-500 font-normal">({selectedSheet})</span></h3>
                  <p className="text-blue-700 text-sm">
                    {(() => {
                      const ws = workbook?.Sheets[selectedSheet];
                      const range = ws?.['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { e: { r: 0 } };
                      return Math.max(0, range.e.r - (linhaInicioDados - 1) + 1);
                    })()} linhas de dados detectadas.
                  </p>
                </div>
              </div>

              {/* Ajustes Rápidos no Mapeamento */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ajustes Rápidos da Planilha</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Custo (Preço)</label>
                    <select 
                      value={tipoPreco} 
                      onChange={(e) => setTipoPreco(e.target.value as any)} 
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                      <option value="sem_desoneracao">Sem Desoneração</option>
                      <option value="com_desoneracao">Com Desoneração</option>
                      <option value="sem_encargos">Sem Encargos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Linha de Início dos Dados (Cabeçalho na anterior)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 2"
                      value={linhaInicioDadosText} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d+$/.test(val)) {
                          setLinhaInicioDadosText(val);
                        }
                      }} 
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex justify-between items-center">
                  <span>3. Mapear Colunas</span>
                  <span className="text-xs font-normal text-slate-500 normal-case">Vincule as colunas do seu Excel com os campos do sistema.</span>
                </h3>

                <div className="space-y-3">
                  {getCamposSistema().map((campo) => (
                    <div key={campo.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="w-full sm:w-1/3">
                        <label className="font-medium text-slate-700 text-sm">
                          {campo.label}
                        </label>
                      </div>
                      <div className="flex-1">
                        <select 
                          value={mapeamento[campo.key] || ''}
                          onChange={(e) => setMapeamento(prev => ({ ...prev, [campo.key]: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        >
                          <option value="">-- Ignorar ou Não Encontrado --</option>
                          {colunasExcel.map(col => (
                            <option key={col.letter} value={col.letter}>{col.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
                
                {getMapeamentoWarningText() && (
                  <p className="text-amber-600 text-xs mt-3 font-medium flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {getMapeamentoWarningText()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3.5: Confirmação e Mapeamento de Classificações */}
          {step === 35 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-4">
                <Database className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-blue-900">Confirmação de Classificação dos Tipos</h3>
                  <p className="text-blue-700 text-sm">
                    Detectamos <strong>{classificacoesExcel.length}</strong> classificações diferentes no seu Excel. Confirme como deseja mapeá-las para os tipos padrão do sistema.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex font-semibold text-xs text-slate-500 uppercase tracking-wider px-3">
                  <div className="w-1/2">Classificação no Excel</div>
                  <div className="w-1/2">Tipo no Sistema</div>
                </div>
                
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[350px] overflow-y-auto">
                  {classificacoesExcel.map((val) => (
                    <div key={val} className="flex items-center gap-4 p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="w-1/2 font-medium text-slate-700 text-sm truncate" title={val}>
                        {val}
                      </div>
                      <div className="w-1/2">
                        <select
                          value={mapeamentoTipos[val] || 'Material'}
                          onChange={(e) => setMapeamentoTipos(prev => ({ ...prev, [val]: e.target.value }))}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                        >
                          {TIPOS_PADRAO.map(tipo => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Processamento */}
          {step === 4 && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="relative w-24 h-24 mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="45" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100" />
                  <circle cx="48" cy="48" r="45" stroke="currentColor" strokeWidth="6" fill="transparent"
                    strokeDasharray={2 * Math.PI * 45} strokeDashoffset={2 * Math.PI * 45 * (1 - progresso / 100)}
                    className="text-blue-600 transition-all duration-300 ease-out" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-slate-800">{progresso}%</span>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">Importando Dados...</h3>
              <p className="text-slate-500 mb-6">
                Processando {itemsProcessados} de {totalItems} itens da base {getFonteFinal()} ({estado})
              </p>
              
              <p className="text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-lg font-medium border border-amber-200">
                ⚠️ Não feche esta janela ou recarregue a página até a conclusão.
              </p>
            </div>
          )}

          {/* STEP 5: Concluído */}
          {step === 5 && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Importação Concluída!</h3>
              <p className="text-slate-600 mb-8 max-w-sm">
                Foram processados e salvos com sucesso <strong>{itemsProcessados}</strong> insumos na base de dados <strong>{getFonteFinal()} - {estado}</strong>.
              </p>
              <button 
                onClick={handleClose}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-colors shadow-lg"
              >
                Ver Insumos
              </button>
            </div>
          )}

        </div>

        {/* Footer com Botões (Exceto Step 4 e 5) */}
        {(step === 1 || step === 2 || step === 3 || step === 35) && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            
            {(step === 2 || step === 3 || step === 35) ? (
              <button 
                onClick={() => setStep(step === 35 ? 3 : (step - 1))} 
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Voltar
              </button>
            ) : <div></div>}

            {step === 2 && (
              <button 
                onClick={handleSelecionarAba}
                disabled={!selectedSheet}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors disabled:opacity-50"
              >
                Avançar
              </button>
            )}

            {step === 3 && (
              <button 
                onClick={handleAvancarDePasso3}
                disabled={isMapeamentoInvalido()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {classificacaoPlanilha === 'misto' ? 'Avançar para Confirmar Tipos' : 'Iniciar Importação'}
              </button>
            )}

            {step === 35 && (
              <button 
                onClick={iniciarImportacao}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Confirmar e Importar
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
