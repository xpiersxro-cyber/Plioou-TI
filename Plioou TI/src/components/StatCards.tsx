import React from 'react';
import { FileText, AlertCircle, Wrench, Clock, MapPin } from 'lucide-react';
import { DashboardStats } from '../types';

interface StatCardsProps {
  stats: DashboardStats;
  activeFilter: string;
  onFilterChange: (status: string) => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats, activeFilter, onFilterChange }) => {
  const cards = [
    {
      id: 'total',
      filterKey: 'all',
      title: 'Total de OS',
      sub: 'geral',
      value: stats.totalOS,
      icon: FileText,
      gradient: 'from-blue-600 to-blue-700',
      shadow: 'shadow-blue-500/20',
      activeRing: 'ring-2 ring-blue-600',
    },
    {
      id: 'abertas',
      filterKey: 'Aberta',
      title: 'Abertas',
      sub: 'aguardando início',
      value: stats.abertas,
      icon: AlertCircle,
      gradient: 'from-orange-500 to-amber-600',
      shadow: 'shadow-orange-500/20',
      activeRing: 'ring-2 ring-orange-500',
    },
    {
      id: 'emAndamento',
      filterKey: 'Em Andamento',
      title: 'Em Andamento',
      sub: 'em execução',
      value: stats.emAndamento,
      icon: Wrench,
      gradient: 'from-amber-500 to-yellow-600',
      shadow: 'shadow-amber-500/20',
      activeRing: 'ring-2 ring-amber-500',
    },
    {
      id: 'aguardando',
      filterKey: 'Aguardando Cliente',
      title: 'Aguarda. Cliente',
      sub: 'aguardando cliente',
      value: stats.aguardandoCliente,
      icon: Clock,
      gradient: 'from-purple-600 to-purple-700',
      shadow: 'shadow-purple-500/20',
      activeRing: 'ring-2 ring-purple-600',
    },
    {
      id: 'externo',
      filterKey: 'externo',
      title: 'Atend. Externo',
      sub: 'criado na empresa',
      value: stats.atendimentoExterno || 0,
      icon: MapPin,
      gradient: 'from-indigo-600 to-indigo-800',
      shadow: 'shadow-indigo-500/20',
      activeRing: 'ring-2 ring-indigo-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.filterKey;
        return (
          <button
            key={card.id}
            onClick={() => onFilterChange(card.filterKey)}
            className={`text-left bg-gradient-to-br ${card.gradient} text-white p-4.5 rounded-2xl shadow-xl ${card.shadow} transition-all duration-200 hover:-translate-y-1 relative overflow-hidden group ${
              isSelected ? card.activeRing : ''
            }`}
          >
            {/* Background icon watermark */}
            <Icon className="absolute -right-3 -bottom-3 w-24 h-24 text-white/10 group-hover:scale-110 transition duration-300" />

            {/* Top Icon Pill */}
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2.5">
              <Icon className="w-4.5 h-4.5 text-white" />
            </div>

            {/* Value */}
            <div className="text-3xl font-extrabold tracking-tight mb-0.5">{card.value}</div>

            {/* Title & Sub */}
            <div className="font-extrabold text-xs leading-tight text-white">{card.title}</div>
            <div className="text-[10px] font-medium text-white/80">{card.sub}</div>
          </button>
        );
      })}
    </div>
  );
};
