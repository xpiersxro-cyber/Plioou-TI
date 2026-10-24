import React from 'react';
import { MapPin, Building2, User, ChevronRight, ArrowUpRight } from 'lucide-react';
import { ServiceOrder } from '../types';

interface ExternalServiceDashboardWidgetProps {
  orders: ServiceOrder[];
  onSelectOrder: (os: ServiceOrder) => void;
  onViewAllExternal: () => void;
}

export const ExternalServiceDashboardWidget: React.FC<ExternalServiceDashboardWidgetProps> = ({
  orders,
  onSelectOrder,
  onViewAllExternal,
}) => {
  // Filter external orders
  const externalOrders = orders.filter(
    (os) =>
      os.origin === 'Externa' ||
      os.category === 'Redes' ||
      os.equipment.toLowerCase().includes('switch') ||
      os.equipment.toLowerCase().includes('roteador')
  );

  const activeExternalOrders = externalOrders.filter(
    (os) => os.status === 'Aberta' || os.status === 'Em Andamento'
  );

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-800 text-sm">Quadro de Atendimento Externo</h2>
              <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {activeExternalOrders.length} Ativas
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-400">
              Chamados de campo abertos pela empresa para deslocamento técnico
            </p>
          </div>
        </div>

        <button
          onClick={onViewAllExternal}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition self-end sm:self-auto"
        >
          <span>Ver Rotas Completas</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Active External OS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeExternalOrders.length === 0 ? (
          <div className="col-span-full text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-500">Nenhum atendimento externo ativo no momento</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Todos os chamados de campo estão finalizados ou sem agendamentos abertos.
            </p>
          </div>
        ) : (
          activeExternalOrders.slice(0, 6).map((os) => (
            <div
              key={os.id}
              onClick={() => onSelectOrder(os)}
              className="p-3.5 bg-slate-50/50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-xl transition cursor-pointer flex flex-col justify-between group space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-xs text-indigo-700 group-hover:underline">
                  {os.id}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    os.status === 'Em Andamento'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {os.status}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-xs text-slate-800 truncate">{os.clientName}</h4>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Equipamento: <span className="text-slate-700 font-bold">{os.equipment}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                    {os.technicianName || 'Não atribuído'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-indigo-600 font-bold group-hover:translate-x-0.5 transition">
                  <span>Acessar</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
