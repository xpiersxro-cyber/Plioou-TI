import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  History,
  LogOut,
  PieChart,
  Wallet,
  PlusCircle,
  UserPlus,
  UserCheck,
  Calendar,
} from 'lucide-react';
import { User } from '../types';
import { PlioouLogo } from './PlioouLogo';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewOS?: () => void;
  onOpenNewClient?: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenNewOS,
  onOpenNewClient,
  onLogout,
}) => {
  const isTech = currentUser.role === 'technician';

  // Menu Oficial do Técnico conforme especificação RBAC:
  // 1. Clientes
  // 2. Novo Cliente
  // 3. Ordens de Serviço
  // 4. Nova O.S.
  // 5. Meus Atendimentos
  // 6. Agenda
  const techMenuItems = [
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'new_client', label: 'Novo Cliente', icon: UserPlus, isAction: true },
    { id: 'orders', label: 'Ordens de Serviço', icon: FileText },
    { id: 'new_os', label: 'Nova O.S.', icon: PlusCircle, isAction: true },
    { id: 'my_orders', label: 'Meus Atendimentos', icon: UserCheck },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
  ];

  // Menu Completo do Administrador
  const adminMenuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'orders', label: 'Ordens de Serviço', icon: FileText },
    { id: 'new_os', label: 'Nova O.S.', icon: PlusCircle, isAction: true },
    { id: 'my_orders', label: 'Meus Atendimentos', icon: UserCheck },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'new_client', label: 'Novo Cliente', icon: UserPlus, isAction: true },
    { id: 'financial', label: 'Financeiro', icon: Wallet },
    { id: 'reports', label: 'Relatórios', icon: PieChart },
    { id: 'admin_dashboard', label: 'Área do Administrador', icon: BarChart3, highlight: true },
    { id: 'logs', label: 'Logs do Sistema', icon: History },
  ];

  const menuItems = isTech ? techMenuItems : adminMenuItems;

  const handleItemClick = (item: { id: string; isAction?: boolean }) => {
    if (item.id === 'new_os') {
      if (onOpenNewOS) onOpenNewOS();
      return;
    }
    if (item.id === 'new_client') {
      if (onOpenNewClient) onOpenNewClient();
      return;
    }
    setActiveTab(item.id);
  };

  return (
    <aside className="w-64 bg-[#0a1128] text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800/60 shadow-2xl select-none z-20 print:hidden">
      {/* Brand Header */}
      <div className="p-4 px-5 flex items-center border-b border-slate-800/80">
        <PlioouLogo className="h-10" isDarkBg={true} />
      </div>

      {/* User Profile Card */}
      <div className="p-4">
        <div className="bg-[#131d38] border border-slate-800 rounded-2xl p-3.5 flex items-center gap-3 shadow-inner">
          <div className="w-10 h-10 rounded-xl bg-blue-600/90 text-white flex items-center justify-center font-bold text-base shadow-md">
            {currentUser.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{currentUser.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] font-bold text-blue-400 capitalize">
                {currentUser.role === 'admin' ? 'Administrador (Acesso Total)' : 'Técnico Autorizado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          {isTech ? 'Menu do Técnico' : 'Menu Principal'}
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'agenda' && activeTab === 'external');
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                  : item.isAction
                  ? 'text-blue-300 hover:text-white bg-blue-950/30 hover:bg-blue-900/40 border border-blue-800/30'
                  : (item as any).highlight
                  ? 'text-indigo-300 hover:text-white bg-indigo-950/50 hover:bg-indigo-900/80 border border-indigo-800/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-white'
                      : item.isAction
                      ? 'text-blue-400'
                      : (item as any).highlight
                      ? 'text-indigo-400'
                      : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.isAction && !isActive && (
                <span className="text-[9px] font-extrabold uppercase bg-blue-600/80 text-white px-1.5 py-0.5 rounded">
                  +
                </span>
              )}
              {(item as any).highlight && !isActive && (
                <span className="text-[9px] font-extrabold uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
            </button>
          );
        })}
      </div>

      {/* Bottom Logout */}
      <div className="p-3 border-t border-slate-800/80">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-rose-400 bg-slate-900/60 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
};
