import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { clsx } from 'clsx';
import {
  CheckCircle2, XCircle, Clock, ExternalLink,
  RefreshCw, Search, FileText, User, Building2, AlertCircle, MessageSquare
} from 'lucide-react';

export default function FluxoAprovacao() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [decisaoModal, setDecisaoModal] = useState<{
    orc: any;
    tipo: 'aprovar' | 'aprovar_pendencia' | 'recusar';
    obsText: string;
  } | null>(null);

  const fetchPendentes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .select('*')
        .eq('status', 'Ag. Validação')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setOrcamentos(data || []);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao carregar orçamentos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendentes();
  }, []);

  const openDecisaoModal = (orc: any, tipo: 'aprovar' | 'aprovar_pendencia' | 'recusar') => {
    setDecisaoModal({
      orc,
      tipo,
      obsText: orc.observacao_gestor || '',
    });
  };

  const executeDecisao = async () => {
    if (!decisaoModal) return;
    const { orc, tipo, obsText } = decisaoModal;
    const obs = obsText.trim();

    if (!obs && tipo !== 'aprovar') {
      alert('Por favor, informe a observação ou motivo para a pendência/recusa.');
      return;
    }

    if (obs) {
      localStorage.setItem(`orcamento_obs_gestor_${orc.id}`, obs);
    } else {
      localStorage.removeItem(`orcamento_obs_gestor_${orc.id}`);
    }
    localStorage.setItem(`orcamento_decisao_${orc.id}`, tipo);

    setProcessing(orc.id);
    setDecisaoModal(null);

    try {
      const isAprovado = tipo === 'aprovar';
      const newStatus = isAprovado ? 'Ag. Validação' : 'Em andamento';
      const payload: Record<string, any> = {
        status: newStatus,
        aprovado: isAprovado,
        decisao_gestor: tipo,
        observacao_gestor: obs || null,
        aprovado_em: isAprovado ? new Date().toISOString() : null,
        aprovado_por: isAprovado ? (user?.email || 'gestor') : null,
      };

      const { error } = await supabase
        .schema('engenharia')
        .from('orcamentos')
        .update(payload)
        .eq('id', orc.id);

      if (error) {
        delete payload.decisao_gestor;
        delete payload.observacao_gestor;
        const { error: err2 } = await supabase
          .schema('engenharia')
          .from('orcamentos')
          .update(payload)
          .eq('id', orc.id);
        if (err2) throw err2;
      }

      setOrcamentos(prev => prev.filter(o => o.id !== orc.id));
    } catch (err: any) {
      alert('Erro ao processar decisão: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const filtered = orcamentos.filter(o =>
    (o.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.cliente || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dt: string | null) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Fluxo de Aprovação</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Orçamentos aguardando validação do gestor antes de serem enviados ao cliente.
          </p>
        </div>
        <button
          onClick={fetchPendentes}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{orcamentos.length}</div>
            <div className="text-xs text-slate-500 font-medium">Aguardando Aprovação</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por código, cliente..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 font-medium">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <p className="text-slate-600 font-semibold text-lg">Nenhum orçamento pendente</p>
          <p className="text-slate-400 text-sm">Todos os orçamentos já foram validados ou ainda não foram enviados para aprovação.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-5 w-40">Código / Rev</th>
                <th className="py-3 px-5">Orçamento</th>
                <th className="py-3 px-5 w-48">Cliente / Gestor</th>
                <th className="py-3 px-5 w-44">Enviado em</th>
                <th className="py-3 px-5 text-center w-64">Ações do Gestor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(orc => (
                <tr
                  key={orc.id}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  <td className="py-4 px-5 font-mono">
                    <div className="font-bold bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/50 inline-block text-slate-700">
                      {orc.codigo || '—'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                      REV {String(orc.revisao || '0').padStart(2, '0')}
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <div
                      className="font-bold text-slate-800 group-hover:text-amber-600 transition-colors text-sm flex items-center gap-1.5 cursor-pointer"
                      onClick={() => navigate(`/orcamentos/${orc.id}?modo=validacao`)}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      {orc.nome || 'Orçamento sem título'}
                      <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-amber-400 transition-colors" />
                    </div>
                    {orc.descricao && (
                      <div className="text-slate-400 text-[11px] mt-0.5 line-clamp-1 max-w-md">{orc.descricao}</div>
                    )}
                    {orc.observacao_gestor && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        <span className="line-clamp-1">"{orc.observacao_gestor}"</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {orc.cliente || 'Não informado'}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                      <User className="w-3 h-3 shrink-0" />
                      {orc.gestor_cliente || 'Não informado'}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-slate-500">
                    {formatDate(orc.updated_at)}
                  </td>
                  <td className="py-4 px-5 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <button
                        disabled={processing === orc.id}
                        onClick={() => openDecisaoModal(orc, 'recusar')}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        title="Recusar e devolver para revisão"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeitar
                      </button>
                      <button
                        disabled={processing === orc.id}
                        onClick={() => openDecisaoModal(orc, 'aprovar_pendencia')}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        title="Aprovar com pendências de ajuste"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        C/ Pendência
                      </button>
                      <button
                        disabled={processing === orc.id}
                        onClick={() => openDecisaoModal(orc, 'aprovar')}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        title="Aprovar orçamento"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {processing === orc.id ? '...' : 'Aprovar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Decisão do Gestor */}
      {decisaoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {decisaoModal.tipo === 'recusar' && <XCircle className="w-5 h-5 text-rose-500" />}
                {decisaoModal.tipo === 'aprovar_pendencia' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                {decisaoModal.tipo === 'aprovar' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {decisaoModal.tipo === 'recusar' ? 'Rejeitar Orçamento' : decisaoModal.tipo === 'aprovar_pendencia' ? 'Aprovar com Pendências' : 'Aprovar Orçamento'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Orçamento: <span className="font-semibold text-slate-700">{decisaoModal.orc.nome} ({decisaoModal.orc.codigo})</span>
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observações do Gestor {decisaoModal.tipo !== 'aprovar' && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  rows={4}
                  value={decisaoModal.obsText}
                  onChange={e => setDecisaoModal({ ...decisaoModal, obsText: e.target.value })}
                  placeholder="Digite sua observação aqui. Dica: Digite o código do item EAP (ex: 1.2.1) para torná-lo um link clicável na planilha."
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all resize-none text-slate-700"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  💡 Códigos EAP mencionados no texto (ex: <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-700">1.2.1</code>) viram links que navegam direto para a linha do item.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecisaoModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDecisao}
                className={clsx(
                  "px-4 py-2 text-xs font-bold text-white rounded-xl transition-all shadow-sm cursor-pointer",
                  decisaoModal.tipo === 'recusar' ? 'bg-rose-600 hover:bg-rose-700' :
                  decisaoModal.tipo === 'aprovar_pendencia' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                Confirmar {decisaoModal.tipo === 'recusar' ? 'Rejeição' : decisaoModal.tipo === 'aprovar_pendencia' ? 'Pendência' : 'Aprovação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
