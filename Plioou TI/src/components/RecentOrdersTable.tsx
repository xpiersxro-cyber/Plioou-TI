import React from 'react';
import { TrendingUp, ArrowRight, ChevronRight } from 'lucide-react';
import { ServiceOrder } from '../types';

interface RecentOrdersTableProps {
  orders: ServiceOrder[];
  onSelectOrder: (os: ServiceOrder) => void;
  onViewAll: () => void;
}

export const RecentOrdersTable: React.FC<RecentOrdersTableProps> = ({
  orders,
  onSelectOrder,
  onViewAll,
}) => {
  // Include active orders and orders pending financial closure
  const activeOrders = orders.filter((os) => os.status !== 'Encerrado');
  const displayOrders = activeOrders.slice(0, 8);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Finalizado pelo Técnico':
      case 'Finalizado':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 font-extrabold shadow-2xs';
      case 'Encerrado':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Em Andamento':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Aguardando Peças':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Aguardando Cliente':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Aberta':
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const created = new Date(dateStr).getTime();
    const diffHours = Math.floor((Date.now() - created) / (3600 * 1000));
    if (diffHours < 24) return 'hoje';
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Ordens Recentes</h2>
            <p className="text-[10px] font-semibold text-slate-400">Exibindo ordens ativas em andamento</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
        >
          <span>Ver todas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
        {displayOrders.length === 0 ? (
          <div className="text-center py-8 text-xs font-semibold text-slate-400">
            Nenhuma ordem de serviço aberta ou em andamento no momento.
          </div>
        ) : (
          displayOrders.map((os) => (
            <div
              key={os.id}
              onClick={() => onSelectOrder(os)}
              className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-slate-50 rounded-xl transition cursor-pointer group"
            >
              {/* Code */}
              <div className="w-20 font-extrabold text-xs text-blue-600 group-hover:underline shrink-0">
                {os.id}
              </div>

              {/* Client & Equipment */}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-slate-800 truncate">{os.clientName}</div>
                <div className="text-[11px] text-slate-400 font-medium truncate">
                  {os.equipment}
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(
                    os.status
                  )}`}
                >
                  {os.status}
                </span>
              </div>

              {/* Relative time */}
              <div className="text-[11px] text-slate-400 font-medium shrink-0 w-20 text-right">
                {getRelativeTime(os.createdAt)}
              </div>

              {/* Action Arrow */}
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
