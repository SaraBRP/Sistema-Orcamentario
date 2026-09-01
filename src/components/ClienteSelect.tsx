import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, MapPin, Building } from 'lucide-react';
import { clsx } from 'clsx';
import { getClientesCadastrados, type ClienteData } from '../lib/clientes';

interface ClienteSelectProps {
  value: string;
  onSelectClient: (client: ClienteData) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ClienteSelect({
  value,
  onSelectClient,
  placeholder = 'Selecione ou busque o Cliente...',
  disabled = false
}: ClienteSelectProps) {
  const [clientes, setClientes] = useState<ClienteData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getClientesCadastrados().then(data => {
      if (isMounted) {
        setClientes(data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredClientes = useMemo(() => {
    if (!searchFilter.trim()) return clientes;
    const term = searchFilter.toLowerCase().trim();
    return clientes.filter(c =>
      c.razao_social.toLowerCase().includes(term) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(term)) ||
      (c.cnpj && c.cnpj.includes(term)) ||
      (c.cidade && c.cidade.toLowerCase().includes(term)) ||
      (c.responsavel && c.responsavel.toLowerCase().includes(term))
    );
  }, [clientes, searchFilter]);

  const selectedClient = useMemo(() => {
    if (!value) return null;
    const valLower = value.toLowerCase().trim();
    return clientes.find(c => 
      c.razao_social.toLowerCase().trim() === valLower ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().trim() === valLower)
    ) || null;
  }, [clientes, value]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
            setSearchFilter('');
          }
        }}
        className={clsx(
          "w-full px-3 py-2 border rounded-xl flex items-center justify-between transition-all cursor-pointer select-none text-xs font-semibold",
          disabled ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" :
          isOpen ? "border-blue-500 ring-2 ring-blue-500/20 bg-white shadow-xs" :
          selectedClient ? "border-slate-300 bg-white text-slate-900" : "border-slate-200 bg-white text-slate-400"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Building className={clsx("w-4 h-4 shrink-0", selectedClient ? "text-blue-600" : "text-slate-400")} />
          <span className="truncate">
            {selectedClient 
              ? (selectedClient.nome_fantasia || selectedClient.razao_social)
              : value || placeholder
            }
          </span>
        </div>
        <ChevronDown className={clsx("w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200", isOpen && "rotate-180 text-blue-600")} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-72 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Digitar para filtrar empresa ou CNPJ..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-4 text-center text-slate-400 text-xs font-medium">Carregando clientes...</div>
            ) : filteredClientes.length === 0 ? (
              <div className="p-4 text-center space-y-1">
                <p className="text-slate-500 font-bold text-xs">Nenhum cliente cadastrado encontrado</p>
                <p className="text-[11px] text-slate-400">Só é possível selecionar clientes cadastrados no sistema.</p>
              </div>
            ) : (
              filteredClientes.map(c => {
                const isSelected = selectedClient?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectClient(c);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "p-2.5 transition-colors cursor-pointer flex items-start justify-between gap-2 text-xs",
                      isSelected ? "bg-blue-50/80 hover:bg-blue-100/80" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-slate-900 leading-tight truncate">
                        {c.razao_social}
                      </div>
                      {c.nome_fantasia && c.nome_fantasia !== c.razao_social && (
                        <div className="text-[11px] font-semibold text-blue-700 truncate">
                          Fantasia: {c.nome_fantasia}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-slate-500 font-medium">
                        {c.cnpj && <span className="font-mono text-slate-600 font-bold">CNPJ: {c.cnpj}</span>}
                        {(c.cidade || c.uf) && (
                          <span className="inline-flex items-center gap-0.5 text-slate-600">
                            <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            {c.cidade}{c.uf ? `/${c.uf}` : ''}
                          </span>
                        )}
                        {c.responsavel && (
                          <span className="text-slate-700 font-semibold">Gestor: {c.responsavel}</span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
