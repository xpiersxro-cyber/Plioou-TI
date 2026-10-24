import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { ServiceOrder } from '../types';

interface AlertBannerProps {
  stalledOrders: ServiceOrder[];
  onViewStalled: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ stalledOrders, onViewStalled }) => {
  if (!stalledOrders || stalledOrders.length === 0) return null;

  const codesPreview = stalledOrders.map((os) => os.id).join(', ');

  return (
    <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white p-4 rounded-2xl shadow-xl shadow-red-500/20 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-red-500">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
        </div>
        <div className="min-w-0">
          <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
            <span>{stalledOrders.length} OS paradas há mais de 2 dias!</span>
          </h3>
          <p className="text-xs text-red-100 font-medium truncate mt-0.5 max-w-2xl">
            {codesPreview} — sem atualização recente
          </p>
        </div>
      </div>

      <button
        onClick={onViewStalled}
        className="shrink-0 bg-white hover:bg-red-50 text-red-600 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition transform active:scale-95"
      >
        <span>Ver</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
