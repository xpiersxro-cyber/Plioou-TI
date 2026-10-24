import React, { useState } from 'react';
import {
  MapPin,
  Wifi,
  Monitor,
  Search,
  Plus,
  Building2,
  Eye,
  LayoutGrid,
  List,
  Clock,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Phone,
  Map,
  Compass,
} from 'lucide-react';
import { ServiceOrder, Client } from '../types';
import { getGoogleMapsUrl, getWazeUrl } from '../utils/gpsUtils';

interface ExternalServiceViewProps {
  orders: ServiceOrder[];
  clients?: Client[];
  onSelectOrder: (os: ServiceOrder) => void;
  onCreateNew?: () => void;
}

const OS_STATUS_COLORS: Record<string, string> = {
  Aberta: 'bg-blue-100 text-blue-700 border-blue-200',
  'Em Andamento': 'bg-amber-100 text-amber-700 border-amber-200',
  'Aguardando Peças': 'bg-purple-100 text-purple-700 border-purple-200',
  'Aguardando Cliente': 'bg-purple-100 text-purple-700 border-purple-200',
  Finalizado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Encerrado: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const ExternalServiceView: React.FC<ExternalServiceViewProps> = ({
  orders,
  clients = [],
  onSelectOrder,
  onCreateNew,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'presential' | 'collect'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Filter external orders (Presencial or Coleta or marked as Externa)
  const externalOrders = orders.filter((o) => {
    const isExterna =
      o.origin === 'Externa' ||
      o.attendanceType === 'presential' ||
      o.attendanceType === 'collect' ||
      o.category?.toLowerCase().includes('infra') ||
      o.category?.toLowerCase().includes('rede') ||
      o.equipment?.toLowerCase().includes('switch') ||
      o.equipment?.toLowerCase().includes('roteador');
    return isExterna;
  });

  // Apply Search, Status, and Type Filters
  const filtered = externalOrders.filter((order) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchClient = order.clientName.toLowerCase().includes(q);
      const matchEquip = order.equipment.toLowerCase().includes(q);
      if (!matchId && !matchClient && !matchEquip) return false;
    }

    // Filter Status
    if (filterStatus !== 'all' && order.status !== filterStatus) {
      return false;
    }

    // Filter Attendance Type
    if (filterType !== 'all') {
      const type = order.attendanceType || 'presential';
      if (type !== filterType) return false;
    }

    return true;
  });

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getAttendanceIcon = (type?: string) => {
    switch (type) {
      case 'remote':
        return <Monitor className="w-3.5 h-3.5" />;
      case 'collect':
        return <Wifi className="w-3.5 h-3.5 text-purple-600" />;
      case 'presential':
      default:
        return <MapPin className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  const getAttendanceLabel = (type?: string) => {
    switch (type) {
      case 'remote':
        return 'Remoto';
      case 'collect':
        return 'Coleta';
      case 'presential':
      default:
        return 'Presencial';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 rounded-2xl text-white shadow-xl border border-indigo-900/60">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs uppercase tracking-wider mb-1">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>Gestão de Campo</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Atendimento Externo</h1>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            O.S. presenciais e coletas de equipamentos registradas na empresa
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 rounded-xl text-xs font-bold hidden sm:inline-block">
            {externalOrders.length} Atendimentos Cadastrados
          </span>

          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-lg shadow-blue-600/30 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Nova O.S. Externa</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por número, cliente ou dispositivo..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs font-medium text-slate-700 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-700 bg-slate-50"
            >
              <option value="all">Todos os Status</option>
              <option value="Aberta">Aberta</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Aguardando Peças">Aguardando Peças</option>
              <option value="Aguardando Cliente">Aguardando Cliente</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Encerrado">Encerrado</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold text-slate-700 bg-slate-50"
            >
              <option value="all">Todos os Tipos</option>
              <option value="presential">📍 Presencial</option>
              <option value="collect">📶 Coleta</option>
            </select>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-auto md:ml-0">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === 'table'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Tabela</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                  viewMode === 'cards'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visualização em Cartões de Rota"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Rotas</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {paginatedOrders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-bold text-xs">
                Nenhum atendimento externo encontrado para os filtros selecionados
              </p>
              {onCreateNew && (
                <button
                  onClick={onCreateNew}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar primeira O.S. externa</span>
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">O.S.</th>
                    <th className="px-4 py-3.5">Cliente</th>
                    <th className="px-4 py-3.5">Dispositivo / Item</th>
                    <th className="px-4 py-3.5">Tipo</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Técnico</th>
                    <th className="px-4 py-3.5">Abertura</th>
                    <th className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {paginatedOrders.map((order) => {
                    const typeLabel = getAttendanceLabel(order.attendanceType);
                    const isPresential = (order.attendanceType || 'presential') === 'presential';

                    return (
                      <tr
                        key={order.id}
                        onClick={() => onSelectOrder(order)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3.5 font-extrabold text-blue-600 group-hover:underline">
                          {order.id}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">
                          {order.clientName}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                          {order.equipment}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({order.category})
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold border ${
                              isPresential
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {getAttendanceIcon(order.attendanceType)}
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                              OS_STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 font-semibold">
                          {order.technicianName || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-[11px] font-medium">
                          {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectOrder(order);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Ver Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium bg-slate-50/50">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1 border border-slate-200 rounded-lg bg-white disabled:opacity-50 font-bold hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <span>
                Página <strong className="text-slate-800">{currentPage}</strong> de{' '}
                <strong className="text-slate-800">{totalPages}</strong> ({totalItems} O.S.)
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1 border border-slate-200 rounded-lg bg-white disabled:opacity-50 font-bold hover:bg-slate-50 transition"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* CARDS / ROTAS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedOrders.map((os) => {
            const clientObj = clients.find(
              (c) => c.id === os.clientId || c.name.toLowerCase() === os.clientName.toLowerCase()
            );
            const addressText = clientObj?.address
              ? `${clientObj.address}${clientObj.neighborhood ? ` - ${clientObj.neighborhood}` : ''}${clientObj.city ? `, ${clientObj.city}` : ''}`
              : os.clientName;
            const gpsCoords =
              os.coordinates ||
              (os.latitude && os.longitude ? `${os.latitude}, ${os.longitude}` : null) ||
              clientObj?.coordinates ||
              (clientObj?.latitude && clientObj?.longitude ? `${clientObj.latitude}, ${clientObj.longitude}` : null);

            return (
              <div
                key={os.id}
                onClick={() => onSelectOrder(os)}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-400 transition cursor-pointer space-y-3 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-blue-600 group-hover:underline">
                      {os.id}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        OS_STATUS_COLORS[os.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {os.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm">{os.clientName}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Ativo: <strong className="text-slate-700">{os.equipment}</strong> ({os.category})
                    </p>
                  </div>

                  {/* Origin & Attendance Type Badge */}
                  <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Origem: {os.origin || 'Empresa'}</span>
                    </div>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-extrabold">
                      {getAttendanceLabel(os.attendanceType)}
                    </span>
                  </div>

                  {/* Address & GPS info */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                    <div className="flex items-start gap-2 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{addressText}</span>
                    </div>

                    {gpsCoords && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200">
                        <Navigation className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span>GPS: {gpsCoords}</span>
                      </div>
                    )}

                    {clientObj?.phone && (
                      <div className="flex items-center gap-2 font-medium text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Contato: {clientObj.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Navigation Quick Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={getGoogleMapsUrl(gpsCoords || addressText)}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Map className="w-3.5 h-3.5 text-blue-600" />
                      <span>Google Maps</span>
                    </a>
                    <a
                      href={getWazeUrl(gpsCoords || addressText)}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Compass className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Waze</span>
                    </a>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 mt-2">
                  <span className="flex items-center gap-1 font-semibold text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {os.technicianName || 'Técnico Não Definido'}
                  </span>

                  <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                    <span>Detalhes</span>
                    <Eye className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
