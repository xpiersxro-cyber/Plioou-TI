import React, { useState, useEffect, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { Plus, Filter, Search, UserCheck, Calendar, Building2, FileText } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AlertBanner } from './components/AlertBanner';
import { StatCards } from './components/StatCards';
import { AttentionPanel } from './components/AttentionPanel';
import { RecentOrdersTable } from './components/RecentOrdersTable';
import { CreateOSModal } from './components/CreateOSModal';
import { OSDetailDrawer } from './components/OSDetailDrawer';
import { AdminDashboard } from './components/AdminDashboard';
import { AuditLogsView } from './components/AuditLogsView';
import { ClientsView } from './components/ClientsView';
import { ExternalServiceView } from './components/ExternalServiceView';
import { ExternalServiceDashboardWidget } from './components/ExternalServiceDashboardWidget';
import { ReportsView } from './components/ReportsView';
import { FinancialView } from './components/FinancialView';
import { LoginModal } from './components/LoginModal';
import { ClientRemoteSignView } from './components/ClientRemoteSignView';
import {
  User,
  Client,
  ServiceOrder,
  AuditLog,
  Notification,
  DashboardStats,
  OSStatus,
  ChecklistItem,
  DigitalSignature,
  ServiceOrderPhoto,
} from './types';

export default function App() {
  // Check if opened via remote signature link (?signToken=...)
  const [remoteSignToken, setRemoteSignToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('signToken');
    }
    return null;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('plioou_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      id: 'u-1',
      name: 'Técnico Rogério',
      email: 'rogerio@plioou.com',
      role: 'technician',
    };
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const saved = localStorage.getItem('plioou_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role === 'technician') return 'orders';
      } catch (e) {}
    }
    return 'dashboard';
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('plioou_jwt'));
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(!localStorage.getItem('plioou_jwt'));
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState<boolean>(false);

  // Core Data State
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOS: 0,
    abertas: 0,
    emAndamento: 0,
    aguardandoCliente: 0,
    finalizadas: 0,
    atendimentoExterno: 0,
    stalledOrders: [],
    productivity: [],
  });

  const handleTabChange = (tab: string) => {
    if (tab === 'new_os') {
      setIsCreateModalOpen(true);
      return;
    }
    if (tab === 'new_client') {
      setActiveTab('clients');
      setIsAddClientModalOpen(true);
      return;
    }
    if (
      (tab === 'admin_dashboard' || tab === 'logs' || tab === 'financial' || tab === 'reports') &&
      currentUser.role !== 'admin'
    ) {
      alert('Acesso restrito: Apenas usuários administradores têm permissão para acessar esta área.');
      return;
    }
    setActiveTab(tab);
  };

  // UI Filter & Modals
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fetch all data from Express backend
  const fetchData = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-user-id': currentUser.id,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Fetch Orders (Filtered by technician role if technician)
      const techParam = currentUser.role === 'technician' ? `?techId=${currentUser.id}` : '';
      const [resOrders, resClients, resUsers, resStats, resLogs, resNotifs] = await Promise.all([
        fetch(`/api/service-orders${techParam}`, { headers }),
        fetch('/api/clients', { headers }),
        fetch('/api/users', { headers }),
        fetch('/api/dashboard/stats', { headers }),
        fetch('/api/logs', { headers }),
        fetch('/api/notifications', { headers }),
      ]);

      if (resOrders.ok) setOrders(await resOrders.json());
      if (resClients.ok) setClients(await resClients.json());
      if (resUsers.ok) setUsers(await resUsers.json());
      if (resStats.ok) setStats(await resStats.json());
      if (resLogs.ok) setAuditLogs(await resLogs.json());
      if (resNotifs.ok) setNotifications(await resNotifs.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, token]);

  // Real-time Socket.io Integration
  useEffect(() => {
    const newSocket = io(window.location.origin, {
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Realtime socket connected!');
      newSocket.emit('join_user', currentUser.id);
    });

    newSocket.on('os_updated', () => {
      fetchData();
    });

    newSocket.on('notification', (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUser.id]);

  // Handlers
  const handleLogin = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      if (!res.ok) return false;
      const data = await res.json();
      setToken(data.token);
      localStorage.setItem('plioou_jwt', data.token);
      localStorage.setItem('plioou_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsLoginOpen(false);
      if (data.user.role === 'technician') {
        setActiveTab('orders');
      } else {
        setActiveTab('dashboard');
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('plioou_jwt');
    localStorage.removeItem('plioou_user');
    setToken(null);
    setIsLoginOpen(true);
    setActiveTab('orders');
  };

  const handleCreateOS = async (data: {
    clientId: string;
    clientName: string;
    equipment: string;
    category: string;
    description: string;
    priority: any;
    origin?: 'Interna' | 'Externa';
    attendanceType?: 'remote' | 'presential' | 'collect';
    technicianId?: string;
  }) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-user-id': currentUser.id,
      };
      if (token && token !== 'demo_token') headers['Authorization'] = `Bearer ${token}`;

      // If created by a technician and no technician was specified, default to current technician
      const techIdToUse = data.technicianId || (currentUser.role === 'technician' ? currentUser.id : undefined);

      const res = await fetch('/api/service-orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...data, technicianId: techIdToUse }),
      });

      if (res.ok) {
        const newOS = await res.json();
        setOrders((prev) => [newOS, ...prev.filter((o) => o.id !== newOS.id)]);
        fetchData();
      } else {
        const tech = users.find((u) => u.id === techIdToUse) || (currentUser.role === 'technician' ? currentUser : undefined);
        const fallbackOS: ServiceOrder = {
          id: `OS-${Math.floor(1000 + Math.random() * 9000)}`,
          clientId: data.clientId || `c-${Date.now()}`,
          clientName: data.clientName,
          equipment: data.equipment,
          category: data.category || 'Geral',
          description: data.description,
          origin: data.origin || 'Interna',
          attendanceType: data.attendanceType || 'remote',
          status: 'Aberta',
          priority: data.priority || 'Média',
          technicianId: tech ? tech.id : undefined,
          technicianName: tech ? tech.name : undefined,
          stalledHours: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: [],
        };
        setOrders((prev) => [fallbackOS, ...prev]);
      }
    } catch (err) {
      console.error('Error creating OS:', err);
      const techIdToUse = data.technicianId || (currentUser.role === 'technician' ? currentUser.id : undefined);
      const tech = users.find((u) => u.id === techIdToUse) || (currentUser.role === 'technician' ? currentUser : undefined);
      const fallbackOS: ServiceOrder = {
        id: `OS-${Math.floor(1000 + Math.random() * 9000)}`,
        clientId: data.clientId || `c-${Date.now()}`,
        clientName: data.clientName,
        equipment: data.equipment,
        category: data.category || 'Geral',
        description: data.description,
        origin: data.origin || 'Interna',
        attendanceType: data.attendanceType || 'remote',
        status: 'Aberta',
        priority: data.priority || 'Média',
        technicianId: tech ? tech.id : undefined,
        technicianName: tech ? tech.name : undefined,
        stalledHours: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
      };
      setOrders((prev) => [fallbackOS, ...prev]);
    }
  };

  const handleUpdateOSStatus = async (
    osId: string,
    status?: OSStatus,
    technicianId?: string,
    additionalData?: Partial<ServiceOrder>
  ) => {
    let updatedTarget: ServiceOrder | null = null;
    // Optimistic local update
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === osId) {
          const tech = technicianId !== undefined ? users.find((u) => u.id === technicianId) : undefined;
          const merged: ServiceOrder = {
            ...o,
            ...(status ? { status } : {}),
            ...(technicianId !== undefined ? { technicianId: tech ? tech.id : undefined, technicianName: tech ? tech.name : undefined } : {}),
            ...additionalData,
            updatedAt: new Date().toISOString(),
          };
          updatedTarget = merged;
          return merged;
        }
        return o;
      })
    );

    if (updatedTarget && selectedOS?.id === osId) {
      setSelectedOS(updatedTarget);
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-user-id': currentUser.id,
      };
      if (token && token !== 'demo_token') headers['Authorization'] = `Bearer ${token}`;

      const bodyData = {
        ...(status ? { status } : {}),
        ...(technicianId !== undefined ? { technicianId } : {}),
        ...additionalData,
      };

      const res = await fetch(`/api/service-orders/${osId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(bodyData),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedOS((prev) => ({
          ...updated,
          checklist: updated.checklist || prev?.checklist || [],
        }));
        fetchData();
      }
    } catch (err) {
      console.error('Error updating OS:', err);
    }
  };

  const handleUpdateChecklist = (osId: string, checklist: ChecklistItem[]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === osId ? { ...o, checklist } : o))
    );
    setSelectedOS((prev) => (prev && prev.id === osId ? { ...prev, checklist } : prev));
  };

  const handleUpdateSignature = (osId: string, signature: DigitalSignature) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === osId ? { ...o, signature } : o))
    );
    setSelectedOS((prev) => (prev && prev.id === osId ? { ...prev, signature } : prev));
  };

  const handleUpdatePhotos = (osId: string, photos: ServiceOrderPhoto[]) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === osId ? { ...o, photos } : o))
    );
    setSelectedOS((prev) => (prev && prev.id === osId ? { ...prev, photos } : prev));
  };

  const handleUpdateFinancials = (
    osId: string,
    laborCost: number,
    partsCost: number,
    discountCost: number,
    paymentMethod: string,
    financialNotes: string
  ) => {
    const totalCost = Math.max(0, laborCost + partsCost - discountCost);
    handleUpdateOSStatus(osId, undefined, undefined, {
      laborCost,
      partsCost,
      discountCost,
      totalCost,
      paymentMethod,
      financialNotes,
    });
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('Tem certeza de que deseja zerar o banco de dados? Todas as ordens de serviço e clientes serão removidos e a contagem iniciará a partir da OS-0001.')) {
      return;
    }
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        alert('Banco de dados e clientes zerados com sucesso! A próxima O.S. será criada como OS-0001.');
        setOrders([]);
        setClients([]);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao zerar o banco de dados.');
      }
    } catch (err) {
      console.error('Error resetting database:', err);
      alert('Erro de conexão ao zerar o banco de dados.');
    }
  };

  const handleAddOSNote = async (osId: string, content: string) => {
    const tempNote = {
      id: `n-${Date.now()}`,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      content,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === osId) {
          return { ...o, notes: [tempNote, ...(o.notes || [])], updatedAt: new Date().toISOString() };
        }
        return o;
      })
    );
    if (selectedOS && selectedOS.id === osId) {
      setSelectedOS((prev) =>
        prev
          ? {
              ...prev,
              notes: [tempNote, ...(prev.notes || [])],
              updatedAt: new Date().toISOString(),
            }
          : null
      );
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-user-id': currentUser.id,
      };
      if (token && token !== 'demo_token') headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/service-orders/${osId}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const handleDeleteOS = async (osId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== osId));
    if (selectedOS && selectedOS.id === osId) setSelectedOS(null);

    try {
      const headers: Record<string, string> = {
        'x-dev-user-id': currentUser.id,
      };
      if (token && token !== 'demo_token') headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/service-orders/${osId}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Error deleting OS:', err);
    }
  };

  const handleAddClient = async (data: {
    name: string;
    cnpjOrCpf: string;
    email: string;
    phone: string;
    city: string;
    address?: string;
    neighborhood?: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
    coordinates?: string;
  }) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-user-id': currentUser.id,
      };
      if (token && token !== 'demo_token') headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const createdClient = await res.json();
        setClients((prev) =>
          [createdClient, ...prev.filter((c) => c.id !== createdClient.id)].sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
          )
        );
        fetchData();
      } else {
        const newClient: Client = {
          id: `c-${Date.now()}`,
          name: data.name,
          cnpjOrCpf: data.cnpjOrCpf || '',
          email: data.email || '',
          phone: data.phone || '',
          city: data.city || '',
          address: data.address || '',
          neighborhood: data.neighborhood || '',
          zipCode: data.zipCode || '',
          latitude: data.latitude,
          longitude: data.longitude,
          coordinates: data.coordinates,
          activeOrdersCount: 0,
        };
        setClients((prev) =>
          [newClient, ...prev].sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
          )
        );
      }
    } catch (err) {
      console.error('Error adding client:', err);
      const newClient: Client = {
        id: `c-${Date.now()}`,
        name: data.name,
        cnpjOrCpf: data.cnpjOrCpf || '',
        email: data.email || '',
        phone: data.phone || '',
        city: data.city || '',
        address: data.address || '',
        neighborhood: data.neighborhood || '',
        zipCode: data.zipCode || '',
        latitude: data.latitude,
        longitude: data.longitude,
        coordinates: data.coordinates,
        activeOrdersCount: 0,
      };
      setClients((prev) =>
        [newClient, ...prev].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
        )
      );
    }
  };

  const handleEditClient = async (
    clientId: string,
    data: {
      name: string;
      cnpjOrCpf: string;
      email: string;
      phone: string;
      city: string;
      address?: string;
      neighborhood?: string;
      zipCode?: string;
      latitude?: number;
      longitude?: number;
      coordinates?: string;
    }
  ) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-user-id': currentUser.id,
      };
      if (token && token !== 'demo_token') headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const updated = await res.json();
        setClients((prev) =>
          prev
            .map((c) => (c.id === clientId ? updated : c))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
        );
        fetchData();
      } else {
        setClients((prev) =>
          prev
            .map((c) => (c.id === clientId ? { ...c, ...data } : c))
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
        );
      }
    } catch (err) {
      console.error('Error editing client:', err);
      setClients((prev) =>
        prev
          .map((c) => (c.id === clientId ? { ...c, ...data } : c))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
      );
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const headers: Record<string, string> = {
        'x-dev-user-id': currentUser.id,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/notifications/read-all', { method: 'PUT', headers });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error reading notifications:', err);
    }
  };

  // Memorized filtered orders for Dashboard "Ordens Recentes" (todas as ordens ativas)
  const dashboardRecentOrders = useMemo(() => {
    return orders.filter(
      (os) => os.status !== 'Finalizado' && os.status !== 'Encerrado'
    );
  }, [orders]);

  // Filtered orders list memoized with Client, Period, Status and Meus Atendimentos support
  const filteredOrders = useMemo(() => {
    return orders.filter((os) => {
      // Meus Atendimentos tab: strictly filter orders assigned to the logged-in technician
      if (activeTab === 'my_orders' && os.technicianId !== currentUser.id) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'all' && os.status !== statusFilter) return false;

      // Client Filter
      if (
        clientFilter !== 'all' &&
        os.clientName !== clientFilter &&
        os.clientId !== clientFilter
      ) {
        return false;
      }

      // Period Filter
      if (periodFilter !== 'all' && os.createdAt) {
        const osDate = new Date(os.createdAt);
        const now = new Date();

        if (periodFilter === 'week') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (osDate < sevenDaysAgo) return false;
        } else if (periodFilter === 'month') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (osDate < thirtyDaysAgo) return false;
        } else if (periodFilter === 'year') {
          if (osDate.getFullYear() !== now.getFullYear()) return false;
        } else if (periodFilter === 'custom') {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (osDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (osDate > end) return false;
          }
        }
      }

      // Text Search
      if (
        searchTerm &&
        !os.id.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !os.clientName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !os.equipment.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [orders, statusFilter, clientFilter, periodFilter, startDate, endDate, searchTerm, activeTab, currentUser.id]);

  // If accessed directly through a remote signature link, render client signing interface
  if (remoteSignToken) {
    return (
      <ClientRemoteSignView
        token={remoteSignToken}
        onClose={() => {
          setRemoteSignToken(null);
          if (window.history.pushState) {
            const newUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
            window.history.pushState({ path: newUrl }, '', newUrl);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f6fc] text-slate-800 flex flex-row font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenNewOS={() => setIsCreateModalOpen(true)}
        onOpenNewClient={() => {
          setActiveTab('clients');
          setIsAddClientModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentUser={currentUser}
          activeTab={activeTab}
          notifications={notifications}
          onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
          onRefreshData={fetchData}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6">
          {/* PAINEL / DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <>
              {/* Critical Red Alert Banner */}
              <AlertBanner
                stalledOrders={stats.stalledOrders}
                onViewStalled={() => {
                  setActiveTab('orders');
                  setStatusFilter('stalled');
                }}
              />

              {/* Greeting Header & Nova OS Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>
                      Olá, {currentUser.role === 'technician' ? 'técnico' : 'Admin'} !
                    </span>
                    <span className="text-2xl">👋</span>
                  </h1>
                  <p className="text-xs font-semibold text-slate-400 capitalize mt-0.5">
                    {new Date().toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: '2-digit',
                    })}
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition transform active:scale-95 text-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nova OS</span>
                </button>
              </div>

              {/* Stat Summary Cards */}
              <StatCards
                stats={stats}
                activeFilter={statusFilter}
                onFilterChange={(st) => {
                  if (st === 'externo') {
                    setActiveTab('external');
                  } else {
                    setStatusFilter(st);
                    if (st !== 'all') setActiveTab('orders');
                  }
                }}
              />

              {/* Main 2-Column Grid matching user's screenshot */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[480px]">
                {/* Left Panel: Solicitar Atenção */}
                <div className="lg:col-span-4">
                  <AttentionPanel
                    stalledOrders={stats.stalledOrders}
                    onSelectOrder={(os) => setSelectedOS(os)}
                  />
                </div>

                {/* Right Panel: Ordens Recentes */}
                <div className="lg:col-span-8">
                  <RecentOrdersTable
                    orders={dashboardRecentOrders}
                    onSelectOrder={(os) => setSelectedOS(os)}
                    onViewAll={() => setActiveTab('orders')}
                  />
                </div>
              </div>

              {/* Quadro de Atendimento Externo no Painel Geral */}
              <ExternalServiceDashboardWidget
                orders={orders}
                onSelectOrder={(os) => setSelectedOS(os)}
                onViewAllExternal={() => setActiveTab('external')}
              />
            </>
          )}

          {/* ORDENS DE SERVIÇO OU MEUS ATENDIMENTOS LIST VIEW */}
          {(activeTab === 'orders' || activeTab === 'my_orders') && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    {activeTab === 'my_orders' ? (
                      <>
                        <UserCheck className="w-5 h-5 text-blue-600" />
                        <span>Meus Atendimentos ({filteredOrders.length})</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span>Ordens de Serviço ({filteredOrders.length})</span>
                      </>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {activeTab === 'my_orders'
                      ? `Chamados técnicos diretamente atribuídos a você (${currentUser.name})`
                      : currentUser.role === 'technician'
                      ? 'Listando chamados atribuídos a você e chamados abertos disponíveis para atendimento'
                      : 'Listando todos os chamados da empresa'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por código ou cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Client Filter Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={clientFilter}
                      onChange={(e) => setClientFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none max-w-[150px] truncate"
                    >
                      <option value="all">Todos os Clientes</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Period Filter Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <select
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value as any)}
                      className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="all">Todos os Períodos</option>
                      <option value="week">Esta Semana (7d)</option>
                      <option value="month">Este Mês (30d)</option>
                      <option value="year">Este Ano</option>
                      <option value="custom">Personalizado...</option>
                    </select>
                  </div>

                  {/* Custom Date Pickers */}
                  {periodFilter === 'custom' && (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium"
                      />
                      <span className="text-slate-400 font-bold">até</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-medium"
                      />
                    </div>
                  )}

                  {/* Status Filter Dropdown */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      <option value="all">Todos os Status</option>
                      <option value="Aberta">Abertas</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Aguardando Peças">Aguardando Peças</option>
                      <option value="Aguardando Cliente">Aguardando Cliente</option>
                      <option value="Finalizado">Finalizadas</option>
                      <option value="Encerrado">Encerradas</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova OS</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Nenhuma ordem de serviço encontrada para os filtros selecionados.
                  </div>
                ) : (
                  filteredOrders.map((os) => (
                    <div
                      key={os.id}
                      onClick={() => setSelectedOS(os)}
                      className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                    >
                      <div className="w-20 font-extrabold text-xs text-blue-600">{os.id}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-slate-800 truncate">
                          {os.clientName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate font-medium">
                          {os.equipment} • {os.category}
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-600 hidden md:block">
                        Técnico: <strong className="text-slate-800">{os.technicianName || 'Sem técnico'}</strong>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                            os.status === 'Finalizado'
                              ? 'bg-emerald-100 text-emerald-700'
                              : os.status === 'Em Andamento'
                              ? 'bg-amber-100 text-amber-700'
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
          )}

          {/* AGENDA & ATENDIMENTO EXTERNO VIEW */}
          {(activeTab === 'agenda' || activeTab === 'external') && (
            <ExternalServiceView
              orders={orders}
              clients={clients}
              onSelectOrder={(os) => setSelectedOS(os)}
              onCreateNew={() => setIsCreateModalOpen(true)}
            />
          )}

          {/* FINANCIAL VIEW - ADMIN ONLY */}
          {activeTab === 'financial' && (
            currentUser.role === 'admin' ? (
              <FinancialView
                orders={orders}
                onSelectOrder={(os) => setSelectedOS(os)}
                onUpdateFinancials={handleUpdateFinancials}
              />
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
                <h3 className="font-bold text-slate-800 text-lg">Acesso Restrito</h3>
                <p className="text-xs text-slate-500">A gestão financeira está disponível apenas para administradores.</p>
              </div>
            )
          )}

          {/* REPORTS VIEW - ADMIN ONLY */}
          {activeTab === 'reports' && (
            currentUser.role === 'admin' ? (
              <ReportsView
                orders={orders}
                currentUser={currentUser}
                token={token}
                onSelectOrder={(os) => setSelectedOS(os)}
              />
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
                <h3 className="font-bold text-slate-800 text-lg">Acesso Restrito</h3>
                <p className="text-xs text-slate-500">A visualização de relatórios está disponível apenas para administradores.</p>
              </div>
            )
          )}

          {/* CLIENTS VIEW */}
          {activeTab === 'clients' && (
            <ClientsView
              clients={clients}
              orders={orders}
              initialOpenAddModal={isAddClientModalOpen}
              onCloseAddModal={() => setIsAddClientModalOpen(false)}
              onAddClient={handleAddClient}
              onEditClient={handleEditClient}
              onSelectOrder={(os) => setSelectedOS(os)}
            />
          )}

          {/* ADMIN DASHBOARD VIEW */}
          {activeTab === 'admin_dashboard' && (
            <AdminDashboard
              stats={stats}
              allOrders={orders}
              logs={auditLogs}
              onSelectOrder={(os) => setSelectedOS(os)}
              onResetDatabase={handleResetDatabase}
            />
          )}

          {/* AUDIT LOGS VIEW */}
          {activeTab === 'logs' && <AuditLogsView logs={auditLogs} />}
        </main>
      </div>

      {/* Modals & Drawers */}
      <CreateOSModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        clients={clients}
        technicians={users}
        onSubmit={handleCreateOS}
      />

      <OSDetailDrawer
        os={selectedOS}
        onClose={() => setSelectedOS(null)}
        technicians={users}
        clients={clients}
        currentUser={currentUser}
        token={token}
        onUpdateStatus={handleUpdateOSStatus}
        onAddNote={handleAddOSNote}
        onDeleteOS={handleDeleteOS}
        onUpdateChecklist={handleUpdateChecklist}
        onUpdateSignature={handleUpdateSignature}
        onUpdatePhotos={handleUpdatePhotos}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onLogin={handleLogin}
        users={users}
      />
    </div>
  );
}
