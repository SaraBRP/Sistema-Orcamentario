import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, Check, ArrowRight, AlertCircle, Eye, EyeOff, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';

type ModalImportarExcelProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedId: string) => void;
};

export function ModalImportarExcel({ isOpen, onClose, onSuccess }: ModalImportarExcelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do Wizard
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState<string>('');

  // Configurações do Mapeamento (SEM PRÉ-PREENCHIMENTO VAZIOS POR PADRÃO)
  const [startRow, setStartRow] = useState<string>(''); // Não vem pré-preenchido!
  const [nomePlanilha, setNomePlanilha] = useState<string>('');
  const [cliente, setCliente] = useState<string>('');

  // Mapeamento de Colunas Obrigatórias (Vazias por padrão)
  const [colItem, setColItem] = useState<string>('');
  const [colDesc, setColDesc] = useState<string>('');
  const [colUnd, setColUnd] = useState<string>('');
  const [colQtd, setColQtd] = useState<string>('');

  // Mapeamento de Colunas Opcionais (6 campos completos)
  const [colUnit, setColUnit] = useState<string>('');
  const [colMatUnit, setColMatUnit] = useState<string>('');
  const [colMoUnit, setColMoUnit] = useState<string>('');
  const [colTotal, setColTotal] = useState<string>('');
  const [colMatTotal, setColMatTotal] = useState<string>('');
  const [colMoTotal, setColMoTotal] = useState<string>('');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRawViewer, setShowRawViewer] = useState(true);

  if (!isOpen) return null;

  // Converte Letra de Coluna (A, B, C... Z, AA) em índice (0, 1, 2...)
  const colLetterToIdx = (letter: string): number => {
    if (!letter || letter.trim() === '') return -1;
    let col = 0;
    const str = letter.trim().toUpperCase();
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      if (charCode < 65 || charCode > 90) return -1;
      col = col * 26 + (charCode - 64);
    }
    return col - 1;
  };

  // Converte índice (0, 1, 2) para letra (A, B, C...)
  const idxToColLetter = (idx: number): string => {
    let temp = '';
    let n = idx;
    while (n >= 0) {
      temp = String.fromCharCode((n % 26) + 65) + temp;
      n = Math.floor(n / 26) - 1;
    }
    return temp;
  };

  // Gerar lista de letras de colunas (A a Z, AA a AZ)
  const availableColLetters: string[] = [];
  for (let i = 65; i <= 90; i++) {
    availableColLetters.push(String.fromCharCode(i));
  }
  for (let i = 65; i <= 70; i++) {
    for (let j = 65; j <= 90; j++) {
      availableColLetters.push(String.fromCharCode(i) + String.fromCharCode(j));
    }
  }

  // Processar arquivo Excel carregado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setNomePlanilha(selectedFile.name.replace(/\.[^/.]+$/, ''));
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true, cellFormula: true });
        setWorkbook(wb);

        setSheetNames(wb.SheetNames);
        
        // Tenta auto-detectar a aba que contém "orcamento", "planilha", "quantidades" ou "proposta"
        const suggestedSheet = wb.SheetNames.find(name => {
          const lower = name.toLowerCase();
          return lower.includes('orçamento') || lower.includes('orcamento') || lower.includes('planilha') || lower.includes('quantidades') || lower.includes('proposta');
        });

        const activeSheet = suggestedSheet || wb.SheetNames[0] || '';
        setSheetName(activeSheet);

        setStep(2);
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Erro ao ler o arquivo Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Extração Direta de Células por Posição (r, c) com suporte a Mesclagens (!merges)
  const getDirectCellValue = (r: number, c: number): string => {
    if (!workbook || !sheetName) return '';
    const ws = workbook.Sheets[sheetName];
    if (!ws) return '';

    // 1. Endereço direto da célula (ex: A1, B6, C7)
    const cellAddress = XLSX.utils.encode_cell({ r, c });
    let cell = ws[cellAddress];

    // 2. Se a célula direta for undefined, verifica se está dentro de um bloco mesclado (!merges)
    if (!cell && ws['!merges']) {
      const merge = ws['!merges'].find(m => r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c);
      if (merge) {
        // O valor da célula mesclada reside no canto superior esquerdo (merge.s.r, merge.s.c)
        const topAddress = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
        cell = ws[topAddress];
      }
    }

    if (!cell) return '';
    if (cell.w !== undefined && cell.w !== null) return String(cell.w).trim();
    if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
    return '';
  };

  // Parse numérico seguro
  const parseNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(/R\$\s?/gi, '').replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Gerar itens mapeados da planilha
  const getParsedItems = () => {
    if (!workbook || !sheetName) return [];
    const ws = workbook.Sheets[sheetName];
    if (!ws) return [];

    const startRowNum = parseInt(startRow, 10);
    if (isNaN(startRowNum) || startRowNum < 1) return [];

    const rawRef = ws['!ref'] || 'A1:Z500';
    const range = XLSX.utils.decode_range(rawRef);
    const maxRow = range.e.r;

    const items: any[] = [];
    const startIndex = startRowNum - 1;

    for (let r = startIndex; r <= maxRow; r++) {
      const item_eap = getDirectCellValue(r, colLetterToIdx(colItem));
      const descricao = getDirectCellValue(r, colLetterToIdx(colDesc));
      const unidade = getDirectCellValue(r, colLetterToIdx(colUnd));
      const quantidade = parseNum(getDirectCellValue(r, colLetterToIdx(colQtd)));

      if (!item_eap && !descricao) continue; // Pula linhas totalmente em branco

      const combinedText = `${item_eap} ${descricao}`.trim();
      const combinedLower = combinedText.toLowerCase();

      // 1. Condição de Parada Inteligente: Interrompe a leitura ao atingir "TOTAL GERAL", "TOTAL DO ORÇAMENTO", "TOTAL C/ IMPOSTOS" em qualquer coluna
      if (
        combinedLower.includes('total geral') || 
        combinedLower.includes('total do orçamento') || 
        combinedLower.includes('total c/ impostos') || 
        combinedLower.includes('total da proposta') ||
        item_eap.toLowerCase().startsWith('total')
      ) {
        break; // Interrompe a leitura completamente! Nada abaixo do Total Geral é lido.
      }

      // 2. Condição de Descarte de Notas/Observações/Avisos de Rodapé
      if (
        item_eap.startsWith('*') || 
        item_eap.startsWith('#') || 
        item_eap.startsWith('@') ||
        descricao.startsWith('*') || 
        descricao.startsWith('#') || 
        descricao.startsWith('@') ||
        combinedLower.startsWith('obs:') || 
        combinedLower.startsWith('nota:') ||
        combinedLower.startsWith('legenda:') ||
        combinedLower.startsWith('importante:') ||
        (item_eap.length > 20 && !/^\d+(\.\d+)*$/.test(item_eap.trim()))
      ) {
        continue; // Ignora notas e avisos de rodapé!
      }

      const matUnit = parseNum(getDirectCellValue(r, colLetterToIdx(colMatUnit)));
      const moUnit = parseNum(getDirectCellValue(r, colLetterToIdx(colMoUnit)));
      let unit = parseNum(getDirectCellValue(r, colLetterToIdx(colUnit)));
      if (unit === 0 && (matUnit > 0 || moUnit > 0)) unit = matUnit + moUnit;

      const matTotal = parseNum(getDirectCellValue(r, colLetterToIdx(colMatTotal)));
      const moTotal = parseNum(getDirectCellValue(r, colLetterToIdx(colMoTotal)));
      let total = parseNum(getDirectCellValue(r, colLetterToIdx(colTotal)));
      if (total === 0 && unit > 0 && quantidade > 0) total = unit * quantidade;
      if (total === 0 && (matTotal > 0 || moTotal > 0)) total = matTotal + moTotal;

      // 3. Detecção de Título/Agrupador de Seção (Sem quantidade ou nível EAP pai como "1", "2")
      const isSummary = (quantidade === 0 && matUnit === 0 && moUnit === 0 && unit === 0 && total === 0) ||
                        (!item_eap.includes('.') && quantidade === 0);

      items.push({
        item_eap: item_eap || `${items.length + 1}`,
        descricao: descricao || 'Item Importado',
        unidade: isSummary ? '' : (unidade || 'un'),
        quantidade: isSummary ? 0 : quantidade,
        valor_unitario_mat_orig: matUnit,
        valor_unitario_mo_orig: moUnit,
        valor_unitario_orig: unit,
        total_mat_orig: matTotal,
        total_mo_orig: moTotal,
        total_orig: total,
        is_summary: isSummary
      });
    }
    return items;
  };

  // Renderização de Célula no Visualizador com suporte a Mesclagem Real (colSpan e rowSpan)
  const renderRawViewerCell = (r: number, c: number) => {
    if (!workbook || !sheetName) return null;
    const ws = workbook.Sheets[sheetName];
    if (!ws) return null;

    if (ws['!merges']) {
      const merge = ws['!merges'].find(m => r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c);
      if (merge) {
        const isTopLeft = r === merge.s.r && c === merge.s.c;
        if (!isTopLeft) {
          // Célula interna da mesclagem: oculta no HTML para dar espaço ao colSpan/rowSpan
          return null;
        }
        const rowSpan = merge.e.r - merge.s.r + 1;
        const colSpan = merge.e.c - merge.s.c + 1;
        const val = getDirectCellValue(r, c);

        return (
          <td
            key={c}
            rowSpan={rowSpan}
            colSpan={colSpan}
            className="p-1.5 border border-slate-300 bg-blue-50/60 text-center font-bold text-slate-800 text-[11px] align-middle shadow-2xs"
          >
            {val}
          </td>
        );
      }
    }

    const val = getDirectCellValue(r, c);
    return (
      <td key={c} className="p-1.5 border border-slate-200 truncate max-w-36 text-slate-700 align-middle">
        {val}
      </td>
    );
  };

  // Validação ao tentar avançar para a pré-visualização (Passo 3)
  const handleAdvanceToPreview = () => {
    setErrorMsg(null);

    const startRowNum = parseInt(startRow, 10);
    if (!startRow || isNaN(startRowNum) || startRowNum < 1) {
      setErrorMsg('⚠️ O campo "Linha Onde Iniciam os Dados" é obrigatório. Por favor, informe o número da linha.');
      return;
    }

    if (!colItem || !colDesc || !colUnd || !colQtd) {
      setErrorMsg('⚠️ Por favor, selecione todas as colunas obrigatórias: Item / EAP, Descrição, Unidade e Quantidade.');
      return;
    }

    const parsed = getParsedItems();
    if (parsed.length === 0) {
      setErrorMsg(`⚠️ Nenhum item foi encontrado a partir da linha ${startRowNum} na aba "${sheetName}". Verifique a linha inicial e as letras das colunas.`);
      return;
    }

    setStep(3);
  };

  const handleSaveImport = async () => {
    const itemsToSave = getParsedItems();
    if (itemsToSave.length === 0) {
      alert('Nenhum item válido foi encontrado com o mapeamento selecionado.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      // 1. Inserir Orçamento Importado
      const { data: impData, error: impError } = await supabase
        .schema('engenharia')
        .from('orcamentos_importados')
        .insert({
          nome_arquivo: file?.name || nomePlanilha || 'Planilha_Importada.xlsx',
          cliente: cliente || 'Não informado',
          projeto: nomePlanilha || 'Projeto Importado',
          status: 'Aguardando De-Para',
          config_mapeamento: {
            sheetName,
            startRow,
            colItem,
            colDesc,
            colUnd,
            colQtd,
            colMatUnit,
            colMoUnit,
            colUnit,
            colMatTotal,
            colMoTotal,
            colTotal
          }
        })
        .select('id')
        .single();

      if (impError) throw impError;

      // 2. Inserir Linhas do Orçamento Importado (removendo is_summary do payload para garantir compatibilidade)
      const rowsPayload = itemsToSave.map(item => {
        const { is_summary, ...rest } = item;
        return {
          orcamento_importado_id: impData.id,
          ...rest
        };
      });

      const { error: rowsError } = await supabase
        .schema('engenharia')
        .from('orcamento_importado_itens')
        .insert(rowsPayload);

      if (rowsError) throw rowsError;

      onSuccess(impData.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao salvar orçamento importado: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const parsedPreview = step === 3 ? getParsedItems() : [];

  // Quantidade de colunas para exibir na tabela de preview bruto (A a L = 12 colunas)
  const maxViewerCols = 12;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Importar Planilha de Orçamento (Excel)</h3>
              <p className="text-xs text-slate-500">Etapa {step} de 3: {step === 1 ? 'Upload do Arquivo' : step === 2 ? 'Mapeamento de Colunas' : 'Pré-visualização & Confirmação'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* PASSO 1: UPLOAD DO ARQUIVO */}
          {step === 1 && (
            <div className="space-y-6 text-center py-8">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 p-10 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="p-4 bg-white text-blue-600 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">Clique para selecionar ou arraste sua planilha Excel aqui</p>
                  <p className="text-xs text-slate-400 mt-1">Formatos suportados: .xlsx, .xls, .csv</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
              </div>
            </div>
          )}

          {/* PASSO 2: MAPEAMENTO DE COLUNAS */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Visualizador da Planilha Original (Com Suporte a Mesclagens Reais e Troca de Abas) */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRawViewer(!showRawViewer)}
                      className="font-bold text-slate-700 hover:text-blue-600 flex items-center gap-2 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      {showRawViewer ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4 text-blue-600" />}
                      <span>{showRawViewer ? 'Ocultar Visualização da Planilha' : 'Mostrar Visualização da Planilha'}</span>
                    </button>

                    {sheetNames.length > 1 && (
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-500 font-medium">Aba:</span>
                        <select 
                          value={sheetName} 
                          onChange={e => setSheetName(e.target.value)}
                          className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                        >
                          {sheetNames.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px]">Consulte as letras das colunas e os números exatos das linhas</span>
                </div>

                {showRawViewer && (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60 bg-slate-50 shadow-xs animate-in fade-in duration-200">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-200/80 text-slate-700 font-mono font-bold sticky top-0">
                        <tr>
                          <th className="p-1.5 border border-slate-300 w-12 text-center bg-slate-300/80">#</th>
                          {Array.from({ length: maxViewerCols }).map((_, cIdx) => (
                            <th key={cIdx} className="p-1.5 border border-slate-300 min-w-24 text-center">
                              Coluna {idxToColLetter(cIdx)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {Array.from({ length: 20 }).map((_, rIdx) => {
                          const lineNum = rIdx + 1;
                          const isStartLine = startRow && parseInt(startRow, 10) === lineNum;

                          return (
                            <tr key={rIdx} className={clsx(isStartLine ? "bg-blue-100/90 font-bold" : "hover:bg-slate-100/60")}>
                              <td className={clsx("p-1.5 border border-slate-300 text-center font-mono font-bold select-none", isStartLine ? "bg-blue-600 text-white" : "bg-slate-200/50 text-slate-600")}>
                                Linha {lineNum}
                              </td>
                              {Array.from({ length: maxViewerCols }).map((_, cIdx) => renderRawViewerCell(rIdx, cIdx))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Informações Básicas (4 Colunas) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Planilha / Projeto</label>
                  <input 
                    type="text" 
                    value={nomePlanilha} 
                    onChange={e => setNomePlanilha(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                    placeholder="Ex: Reforma Pavilhão A"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cliente</label>
                  <input 
                    type="text" 
                    value={cliente} 
                    onChange={e => setCliente(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 font-medium"
                    placeholder="Ex: Construtora BRP"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Aba / Guia do Excel *
                  </label>
                  <select 
                    value={sheetName} 
                    onChange={e => setSheetName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-800 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {sheetNames.map(name => (
                      <option key={name} value={name}>
                        Aba: {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1">
                    Linha Onde Iniciam os Dados <span className="text-rose-600">*</span>
                  </label>
                  <input 
                    type="number" 
                    min={1}
                    value={startRow} 
                    onChange={e => setStartRow(e.target.value)}
                    placeholder="Informe a linha (ex: 7 ou 8)"
                    className={clsx(
                      "w-full px-3 py-1.5 bg-white border rounded-lg text-xs font-bold outline-none transition-all",
                      !startRow ? "border-rose-400 bg-rose-50/30 text-rose-700 focus:border-rose-600" : "border-blue-500 text-blue-700"
                    )}
                  />
                </div>
              </div>

              {/* Mapeamento Obrigatório */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 inline-block"></span>
                  Colunas Obrigatórias (Selecione a Letra Correspondente)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Item / EAP *</label>
                    <select 
                      value={colItem} 
                      onChange={e => setColItem(e.target.value)}
                      className={clsx(
                        "w-full px-3 py-2 bg-white border rounded-lg text-xs font-bold font-mono outline-none",
                        !colItem ? "border-rose-300 text-slate-400" : "border-blue-500 text-slate-800"
                      )}
                    >
                      <option value="">(Selecione a Coluna...)</option>
                      {availableColLetters.map(l => <option key={l} value={l}>Coluna {l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição *</label>
                    <select 
                      value={colDesc} 
                      onChange={e => setColDesc(e.target.value)}
                      className={clsx(
                        "w-full px-3 py-2 bg-white border rounded-lg text-xs font-bold font-mono outline-none",
                        !colDesc ? "border-rose-300 text-slate-400" : "border-blue-500 text-slate-800"
                      )}
                    >
                      <option value="">(Selecione a Coluna...)</option>
                      {availableColLetters.map(l => <option key={l} value={l}>Coluna {l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unidade *</label>
                    <select 
                      value={colUnd} 
                      onChange={e => setColUnd(e.target.value)}
                      className={clsx(
                        "w-full px-3 py-2 bg-white border rounded-lg text-xs font-bold font-mono outline-none",
                        !colUnd ? "border-rose-300 text-slate-400" : "border-blue-500 text-slate-800"
                      )}
                    >
                      <option value="">(Selecione a Coluna...)</option>
                      {availableColLetters.map(l => <option key={l} value={l}>Coluna {l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Quantidade *</label>
                    <select 
                      value={colQtd} 
                      onChange={e => setColQtd(e.target.value)}
                      className={clsx(
                        "w-full px-3 py-2 bg-white border rounded-lg text-xs font-bold font-mono outline-none",
                        !colQtd ? "border-rose-300 text-slate-400" : "border-blue-500 text-slate-800"
                      )}
                    >
                      <option value="">(Selecione a Coluna...)</option>
                      {availableColLetters.map(l => <option key={l} value={l}>Coluna {l}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Mapeamento Opcional (6 Campos Completos) */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                  Colunas Opcionais (Valores Unitários e Totais do Cliente)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Valor Unitário Total (R$)</label>
                    <select 
                      value={colUnit} 
                      onChange={e => setColUnit(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">(Não Importar)</option>
                      {availableColLetters.map(l => <option key={l} value={l}>Coluna {l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mat. Unitário (R$)</label>
                    <select 
                      value={colMatUnit} 
                      onChange={e => setColMatUnit(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">(Não Importar)</option>
                      {availableColLetters.map(l => <option key={l} value={l}>Coluna {l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">M.O. Unitário (R$)</label>
                    <select 
                      value={colMoUnit} 
                      onChange={e => setColMoUnit(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">(Não Importar)</option>
                      {availableColLetters.map(l => <option key={l} value={l}>Coluna {l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Total Geral (R$)</label>
                    <select 
                      value={colTotal} 
                      onChange={e => setColTotal(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">(Não Importar)</option>
                      {availableColLetters.map(l => <option key={l} value={l}>Coluna {l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mat. Total (R$)</label>
                    <select 
                      value={colMatTotal} 
                      onChange={e => setColMatTotal(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">(Não Importar)</option>
                      {availableColLetters.map(l => <option key={l} value={l}>Coluna {l}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">M.O. Total (R$)</label>
                    <select 
                      value={colMoTotal} 
                      onChange={e => setColMoTotal(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">(Não Importar)</option>
                      {availableColLetters.map(l => <option key={l} value={l}>Coluna {l}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 3: PRÉ-VISUALIZAÇÃO */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50/60 p-4 rounded-xl border border-blue-200">
                <div>
                  <h4 className="text-sm font-bold text-blue-900">{parsedPreview.length} Itens Identificados na Planilha</h4>
                  <p className="text-xs text-blue-700 mt-0.5">Confira a lista dos itens identificados a partir da linha {startRow} na aba "{sheetName}".</p>
                </div>
                <span className="text-xs font-bold text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-xs">
                  Total Estimado Cliente: {parsedPreview.reduce((acc, i) => acc + (i.total_orig || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5 w-16">Item</th>
                      <th className="p-2.5">Descrição</th>
                      <th className="p-2.5 w-16 text-center">Und</th>
                      <th className="p-2.5 w-24 text-right">Qtd</th>
                      <th className="p-2.5 w-28 text-right">Unit. Orig</th>
                      <th className="p-2.5 w-28 text-right">Total Orig</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-mono font-bold text-slate-700">{item.item_eap}</td>
                        <td className="p-2 font-medium text-slate-800">{item.descricao}</td>
                        <td className="p-2 text-center text-slate-500">{item.unidade}</td>
                        <td className="p-2 text-right font-semibold text-slate-700">{item.quantidade}</td>
                        <td className="p-2 text-right text-slate-600">{item.valor_unitario_orig.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="p-2 text-right font-bold text-slate-800">{item.total_orig.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
          {step > 1 ? (
            <button 
              onClick={() => { setStep((step - 1) as any); setErrorMsg(null); }} 
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Voltar
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer">
              Cancelar
            </button>
            {step === 2 && (
              <button 
                onClick={handleAdvanceToPreview} 
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <span>Avançar para Pré-visualização</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {step === 3 && (
              <button 
                onClick={handleSaveImport} 
                disabled={saving}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Importando...' : 'Confirmar & Importar Planilha'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
