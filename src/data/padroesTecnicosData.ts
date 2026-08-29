export interface TelaNBRItem {
  id: string;
  codigo: string;
  tipoMalha: string;
  espacamentoMm: string;
  diametroMm: number;
  pesoKgM2: number;
  pesoPecaKg: number;
  larguraM: number;
  comprimentoM: number;
}

export interface TrelicaItem {
  id: string;
  codigoGerdau: string;
  codigoNBR: string;
  alturaCm: number;
  banzoSuperiorMm: number;
  diagonaisMm: number;
  banzoInferiorMm: number;
  pesoLinearKgM: number;
}

export interface AcoCAItem {
  id: string;
  bitolaMm: number;
  categoria: 'CA-25' | 'CA-50' | 'CA-60';
  secaoCm2: number;
  pesoLinearKgM: number;
  perimetroCm: number;
  usoTipico: string;
}

// Catálogo Oficial Telas Soldadas Aço CA-60 NBR 7481 (Gerdau)
export const TELAS_SOLDADAS_MASTER: TelaNBRItem[] = [
  { id: 'q138', codigo: 'Q138', tipoMalha: 'Quadrada', espacamentoMm: '100 x 100', diametroMm: 4.2, pesoKgM2: 2.20, pesoPecaKg: 32.40, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'r138', codigo: 'R138', tipoMalha: 'Retangular', espacamentoMm: '100 x 150', diametroMm: 4.2, pesoKgM2: 1.83, pesoPecaKg: 26.90, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'm138', codigo: 'M138', tipoMalha: 'Retangular', espacamentoMm: '100 x 200', diametroMm: 4.2, pesoKgM2: 1.65, pesoPecaKg: 24.30, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'q159', codigo: 'Q159', tipoMalha: 'Quadrada', espacamentoMm: '100 x 100', diametroMm: 4.5, pesoKgM2: 2.52, pesoPecaKg: 37.00, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'r159', codigo: 'R159', tipoMalha: 'Retangular', espacamentoMm: '100 x 150', diametroMm: 4.5, pesoKgM2: 2.11, pesoPecaKg: 31.00, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'm159', codigo: 'M159', tipoMalha: 'Retangular', espacamentoMm: '100 x 200', diametroMm: 4.5, pesoKgM2: 1.90, pesoPecaKg: 27.90, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'l159', codigo: 'L159', tipoMalha: 'Retangular', espacamentoMm: '100 x 300', diametroMm: 4.5, pesoKgM2: 1.69, pesoPecaKg: 24.80, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'q196', codigo: 'Q196', tipoMalha: 'Quadrada', espacamentoMm: '100 x 100', diametroMm: 5.0, pesoKgM2: 3.11, pesoPecaKg: 45.70, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'r196', codigo: 'R196', tipoMalha: 'Retangular', espacamentoMm: '100 x 150', diametroMm: 5.0, pesoKgM2: 2.60, pesoPecaKg: 38.20, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'm196', codigo: 'M196', tipoMalha: 'Retangular', espacamentoMm: '100 x 200', diametroMm: 5.0, pesoKgM2: 2.34, pesoPecaKg: 34.40, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'l196', codigo: 'L196', tipoMalha: 'Retangular', espacamentoMm: '100 x 300', diametroMm: 5.0, pesoKgM2: 2.09, pesoPecaKg: 30.70, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 't196', codigo: 'T196', tipoMalha: 'Transversal', espacamentoMm: '300 x 100', diametroMm: 5.0, pesoKgM2: 2.11, pesoPecaKg: 31.00, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'q246', codigo: 'Q246', tipoMalha: 'Quadrada', espacamentoMm: '100 x 100', diametroMm: 5.6, pesoKgM2: 3.91, pesoPecaKg: 57.50, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'r246', codigo: 'R246', tipoMalha: 'Retangular', espacamentoMm: '100 x 150', diametroMm: 5.6, pesoKgM2: 3.26, pesoPecaKg: 47.90, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'm246', codigo: 'M246', tipoMalha: 'Retangular', espacamentoMm: '100 x 200', diametroMm: 5.6, pesoKgM2: 2.94, pesoPecaKg: 43.20, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'l246', codigo: 'L246', tipoMalha: 'Retangular', espacamentoMm: '100 x 300', diametroMm: 5.6, pesoKgM2: 2.62, pesoPecaKg: 38.50, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 't246', codigo: 'T246', tipoMalha: 'Transversal', espacamentoMm: '300 x 100', diametroMm: 5.6, pesoKgM2: 2.64, pesoPecaKg: 38.80, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'q283', codigo: 'Q283', tipoMalha: 'Quadrada', espacamentoMm: '100 x 100', diametroMm: 6.0, pesoKgM2: 4.48, pesoPecaKg: 65.90, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'r283', codigo: 'R283', tipoMalha: 'Retangular', espacamentoMm: '100 x 150', diametroMm: 6.0, pesoKgM2: 3.74, pesoPecaKg: 55.00, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'm283', codigo: 'M283', tipoMalha: 'Retangular', espacamentoMm: '100 x 200', diametroMm: 6.0, pesoKgM2: 3.37, pesoPecaKg: 49.50, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'l283', codigo: 'L283', tipoMalha: 'Retangular', espacamentoMm: '100 x 300', diametroMm: 6.0, pesoKgM2: 3.00, pesoPecaKg: 44.10, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 't283', codigo: 'T283', tipoMalha: 'Transversal', espacamentoMm: '300 x 100', diametroMm: 6.0, pesoKgM2: 3.03, pesoPecaKg: 44.50, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'q335', codigo: 'Q335', tipoMalha: 'Quadrada', espacamentoMm: '150 x 150', diametroMm: 8.0, pesoKgM2: 5.37, pesoPecaKg: 78.90, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'l335', codigo: 'L335', tipoMalha: 'Retangular', espacamentoMm: '150 x 300', diametroMm: 8.0, pesoKgM2: 3.48, pesoPecaKg: 51.20, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 't335', codigo: 'T335', tipoMalha: 'Transversal', espacamentoMm: '300 x 150', diametroMm: 8.0, pesoKgM2: 3.45, pesoPecaKg: 50.70, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'q396', codigo: 'Q396', tipoMalha: 'Quadrada', espacamentoMm: '100 x 100', diametroMm: 7.1, pesoKgM2: 6.28, pesoPecaKg: 92.30, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'r396', codigo: 'R396', tipoMalha: 'Retangular', espacamentoMm: '100 x 150', diametroMm: 7.1, pesoKgM2: 5.24, pesoPecaKg: 77.00, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'm396', codigo: 'M396', tipoMalha: 'Retangular', espacamentoMm: '100 x 200', diametroMm: 7.1, pesoKgM2: 4.73, pesoPecaKg: 69.50, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'l396', codigo: 'L396', tipoMalha: 'Retangular', espacamentoMm: '100 x 300', diametroMm: 7.1, pesoKgM2: 3.91, pesoPecaKg: 57.50, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 't396', codigo: 'T396', tipoMalha: 'Transversal', espacamentoMm: '300 x 100', diametroMm: 7.1, pesoKgM2: 3.92, pesoPecaKg: 57.60, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'q503', codigo: 'Q503', tipoMalha: 'Quadrada', espacamentoMm: '100 x 100', diametroMm: 8.0, pesoKgM2: 7.97, pesoPecaKg: 117.20, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'r503', codigo: 'R503', tipoMalha: 'Retangular', espacamentoMm: '100 x 150', diametroMm: 8.0, pesoKgM2: 6.66, pesoPecaKg: 97.60, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'm503', codigo: 'M503', tipoMalha: 'Retangular', espacamentoMm: '100 x 200', diametroMm: 8.0, pesoKgM2: 6.00, pesoPecaKg: 88.20, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'l503', codigo: 'L503', tipoMalha: 'Retangular', espacamentoMm: '100 x 300', diametroMm: 8.0, pesoKgM2: 4.77, pesoPecaKg: 70.10, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 't503', codigo: 'T503', tipoMalha: 'Transversal', espacamentoMm: '300 x 100', diametroMm: 8.0, pesoKgM2: 4.76, pesoPecaKg: 70.00, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'q636', codigo: 'Q636', tipoMalha: 'Quadrada', espacamentoMm: '100 x 100', diametroMm: 9.0, pesoKgM2: 10.09, pesoPecaKg: 148.30, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'l636', codigo: 'L636', tipoMalha: 'Retangular', espacamentoMm: '100 x 300', diametroMm: 9.0, pesoKgM2: 5.84, pesoPecaKg: 85.80, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'q785', codigo: 'Q785', tipoMalha: 'Quadrada', espacamentoMm: '100 x 100', diametroMm: 10.0, pesoKgM2: 12.46, pesoPecaKg: 183.20, larguraM: 2.45, comprimentoM: 6.00 },
  { id: 'l785', codigo: 'L785', tipoMalha: 'Retangular', espacamentoMm: '100 x 300', diametroMm: 10.0, pesoKgM2: 7.03, pesoPecaKg: 103.30, larguraM: 2.45, comprimentoM: 6.00 }
];

// Catálogo Oficial Treliças NBR 14862 (Gerdau)
export const TRELICAS_MASTER: TrelicaItem[] = [
  { id: '1', codigoGerdau: 'TG 8 L', codigoNBR: 'TR 08644', alturaCm: 8, banzoSuperiorMm: 6.0, diagonaisMm: 4.2, banzoInferiorMm: 4.2, pesoLinearKgM: 0.735 },
  { id: '2', codigoGerdau: 'TG 8 M', codigoNBR: 'TR 08645', alturaCm: 8, banzoSuperiorMm: 6.0, diagonaisMm: 4.2, banzoInferiorMm: 5.0, pesoLinearKgM: 0.821 },
  { id: '3', codigoGerdau: 'TG 12 M', codigoNBR: 'TR 12645', alturaCm: 12, banzoSuperiorMm: 6.0, diagonaisMm: 4.2, banzoInferiorMm: 5.0, pesoLinearKgM: 0.886 },
  { id: '4', codigoGerdau: 'TG 12 R', codigoNBR: 'TR 12646', alturaCm: 12, banzoSuperiorMm: 6.0, diagonaisMm: 4.2, banzoInferiorMm: 6.0, pesoLinearKgM: 1.016 },
  { id: '5', codigoGerdau: 'TG 16 L', codigoNBR: 'TR 16745', alturaCm: 16, banzoSuperiorMm: 7.0, diagonaisMm: 4.2, banzoInferiorMm: 5.0, pesoLinearKgM: 1.032 },
  { id: '6', codigoGerdau: 'TG 16 R', codigoNBR: 'TR 16746', alturaCm: 16, banzoSuperiorMm: 7.0, diagonaisMm: 4.2, banzoInferiorMm: 6.0, pesoLinearKgM: 1.168 },
  { id: '7', codigoGerdau: 'TG 20 L', codigoNBR: 'TR 20745', alturaCm: 20, banzoSuperiorMm: 7.0, diagonaisMm: 4.2, banzoInferiorMm: 5.0, pesoLinearKgM: 1.111 },
  { id: '8', codigoGerdau: 'TG 20 R', codigoNBR: 'TR 20756', alturaCm: 20, banzoSuperiorMm: 7.0, diagonaisMm: 5.0, banzoInferiorMm: 6.0, pesoLinearKgM: 1.446 },
  { id: '9', codigoGerdau: 'TG 25 L', codigoNBR: 'TR 25856', alturaCm: 25, banzoSuperiorMm: 8.0, diagonaisMm: 5.0, banzoInferiorMm: 6.0, pesoLinearKgM: 1.686 },
  { id: '10', codigoGerdau: 'TG 25 R', codigoNBR: 'TR 25857', alturaCm: 25, banzoSuperiorMm: 8.0, diagonaisMm: 5.0, banzoInferiorMm: 7.0, pesoLinearKgM: 1.855 }
];

// Catálogo Oficial Barras Aço CA-25 / CA-50 / CA-60 NBR 7480
export const BARRAS_ACO_MASTER: AcoCAItem[] = [
  { id: '1', bitolaMm: 5.0, categoria: 'CA-60', secaoCm2: 0.196, pesoLinearKgM: 0.154, perimetroCm: 1.57, usoTipico: 'Estribos / Telas' },
  { id: '2', bitolaMm: 6.3, categoria: 'CA-50', secaoCm2: 0.312, pesoLinearKgM: 0.245, perimetroCm: 1.98, usoTipico: 'Armação Secundária / Estribos' },
  { id: '3', bitolaMm: 8.0, categoria: 'CA-50', secaoCm2: 0.503, pesoLinearKgM: 0.395, perimetroCm: 2.51, usoTipico: 'Caranguejos / Armação Pilares' },
  { id: '4', bitolaMm: 10.0, categoria: 'CA-50', secaoCm2: 0.785, pesoLinearKgM: 0.617, perimetroCm: 3.14, usoTipico: 'Armação Principal / Vigas' },
  { id: '5', bitolaMm: 12.5, categoria: 'CA-50', secaoCm2: 1.227, pesoLinearKgM: 0.963, perimetroCm: 3.93, usoTipico: 'Barras de Transferência / Pilares' },
  { id: '6', bitolaMm: 16.0, categoria: 'CA-50', secaoCm2: 2.011, pesoLinearKgM: 1.578, perimetroCm: 5.03, usoTipico: 'Barras de Transferência / Vigas Pesadas' },
  { id: '7', bitolaMm: 20.0, categoria: 'CA-50', secaoCm2: 3.142, pesoLinearKgM: 2.466, perimetroCm: 6.28, usoTipico: 'Barras de Transferência / Fundações' },
  { id: '8', bitolaMm: 25.0, categoria: 'CA-50', secaoCm2: 4.909, pesoLinearKgM: 3.853, perimetroCm: 7.85, usoTipico: 'Barras de Transferência Piso / Pilares' },
  { id: '9', bitolaMm: 32.0, categoria: 'CA-25', secaoCm2: 8.042, pesoLinearKgM: 6.313, perimetroCm: 10.05, usoTipico: 'Barras de Transferência Pesadas' },
  { id: '10', bitolaMm: 40.0, categoria: 'CA-25', secaoCm2: 12.566, pesoLinearKgM: 9.865, perimetroCm: 12.57, usoTipico: 'Barras de Transferência Pesadas' }
];
