import React, { useState } from 'react';
import { Bell, ChevronRight, CheckCheck, RefreshCw, LogOut } from 'lucide-react';
import { User, Notification } from '../types';

interface HeaderProps {
  currentUser: User;
  activeTab: string;
  notifications: Notification[];
  onMarkAllNotificationsRead: () => void;
  onRefreshData: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  notifications,
  onMarkAllNotificationsRead,
  onRefreshData,
  onLogout,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getTabLabel = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Painel';
      case 'orders':
        return 'Ordens de Serviço';
      case 'external':
        return 'Atender. Externo';
      case 'clients':
        return 'Clientes';
      case 'admin_dashboard':
        return 'Produtividade (Admin)';
      case 'logs':
        return 'Logs do Sistema';
      default:
        return 'Painel';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm print:hidden">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
        <span className="text-slate-700 font-semibold">Pliioou</span>
        <ChevronRight className="w-4 h-4 text-slate-400" />
        <span className="text-blue-600 font-bold">{getTabLabel()}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Refresh Data Button */}
        <button
          onClick={onRefreshData}
          title="Atualizar dados"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-ping"></span>
            )}
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Notificações em Tempo Real
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] bg-rose-500 text-white font-bold rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllNotificationsRead}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Lidas
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">Nenhuma notificação recente.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition ${n.read ? 'bg-white text-slate-600' : 'bg-blue-50/70 text-slate-900 font-medium'}`}
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{n.title}</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logged User Badge & Logout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block leading-tight">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-blue-600 font-semibold block leading-none capitalize">
                {currentUser.role === 'admin' ? 'Administrador' : 'Técnico de Campo'}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Sair do sistema"
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
