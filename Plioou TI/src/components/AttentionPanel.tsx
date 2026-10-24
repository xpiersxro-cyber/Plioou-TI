import React from 'react';
import { AlertOctagon, User, Clock } from 'lucide-react';
import { ServiceOrder } from '../types';

interface AttentionPanelProps {
  stalledOrders: ServiceOrder[];
  onSelectOrder: (os: ServiceOrder) => void;
}

export const AttentionPanel: React.FC<AttentionPanelProps> = ({ stalledOrders, onSelectOrder }) => {
  const displayItems = stalledOrders.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-orange-500" />
          <h2 className="font-bold text-slate-800 text-sm">Solicitar Atenção</h2>
        </div>
        <span className="w-6 h-6 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
          {stalledOrders.length}
        </span>
      </div>

      {/* List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            Nenhuma OS requer atenção crítica no momento.
          </div>
        ) : (
          displayItems.map((os) => (
            <div
              key={os.id}
              onClick={() => onSelectOrder(os)}
              className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50 hover:border-rose-200 transition cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-bold text-rose-600 text-sm group-hover:underline">
                    {os.id}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  parada de {os.stalledHours || 48} horas
                </span>
              </div>

              <div className="mt-2 text-xs font-semibold text-slate-800 truncate">
                {os.clientName}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1 text-slate-600">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>{os.technicianName || 'Sem técnico'}</span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    os.status === 'Em Andamento'
                      ? 'bg-amber-100 text-amber-700'
                      : os.status === 'Aguardando Peças'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {os.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
