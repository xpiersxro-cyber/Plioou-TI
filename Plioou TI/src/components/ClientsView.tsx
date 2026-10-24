import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Plus,
  Building,
  Mail,
  Phone,
  MapPin,
  Search,
  FileText,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  X,
  ChevronRight,
  Eye,
  Edit2,
  MessageSquare,
  Navigation,
  Compass,
  Crosshair,
  Map,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Client, ServiceOrder } from '../types';
import { getGoogleMapsUrl, getWazeUrl, captureDeviceGPS } from '../utils/gpsUtils';

interface ClientsViewProps {
  clients: Client[];
  orders?: ServiceOrder[];
  initialOpenAddModal?: boolean;
  onCloseAddModal?: () => void;
  onAddClient: (data: {
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
  }) => void;
  onEditClient?: (
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
  ) => void;
  onSelectOrder?: (os: ServiceOrder) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  orders = [],
  initialOpenAddModal = false,
  onCloseAddModal,
  onAddClient,
  onEditClient,
  onSelectOrder,
}) => {
  const [showAddModal, setShowAddModal] = useState(initialOpenAddModal);

  useEffect(() => {
    if (initialOpenAddModal) {
      setShowAddModal(true);
    }
  }, [initialOpenAddModal]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Period Filter for Client O.S. History
  const [clientPeriod, setClientPeriod] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
  const [clientStartDate, setClientStartDate] = useState('');
  const [clientEndDate, setClientEndDate] = useState('');
  const [clientOsSearch, setClientOsSearch] = useState('');

  // New Client Form State
  const [name, setName] = useState('');
  const [cnpjOrCpf, setCnpjOrCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [coordinates, setCoordinates] = useState<string>('');
  const [isCapturingGps, setIsCapturingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    return [...clients]
      .filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.cnpjOrCpf.includes(searchTerm)
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }, [clients, searchTerm]);

  // Map orders per client
  const clientOrdersMap = useMemo(() => {
    const map: Record<string, ServiceOrder[]> = {};
    orders.forEach((os) => {
      const key = os.clientId || os.clientName;
      if (!map[key]) map[key] = [];
      map[key].push(os);
      if (os.clientName && !map[os.clientName]) {
        map[os.clientName] = map[key];
      }
    });
    return map;
  }, [orders]);

  // Orders for currently opened client history modal
  const selectedClientOrders = useMemo(() => {
    if (!selectedClientForHistory) return [];
    const clientName = selectedClientForHistory.name;
    const clientId = selectedClientForHistory.id;

    const allClientOs = orders.filter(
      (os) =>
        (os.clientId && os.clientId === clientId) ||
        (os.clientName && os.clientName.toLowerCase() === clientName.toLowerCase())
    );

    return allClientOs.filter((os) => {
      // Period filter
      if (clientPeriod !== 'all' && os.createdAt) {
        const date = new Date(os.createdAt);
        const now = new Date();

        if (clientPeriod === 'week') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (date < sevenDaysAgo) return false;
        } else if (clientPeriod === 'month') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (date < thirtyDaysAgo) return false;
        } else if (clientPeriod === 'year') {
          if (date.getFullYear() !== now.getFullYear()) return false;
        } else if (clientPeriod === 'custom') {
          if (clientStartDate) {
            const start = new Date(clientStartDate);
            start.setHours(0, 0, 0, 0);
            if (date < start) return false;
          }
          if (clientEndDate) {
            const end = new Date(clientEndDate);
            end.setHours(23, 59, 59, 999);
            if (date > end) return false;
          }
        }
      }

      // Search term filter
      if (clientOsSearch) {
        const query = clientOsSearch.toLowerCase();
        const matchesId = os.id.toLowerCase().includes(query);
        const matchesEquip = os.equipment.toLowerCase().includes(query);
        const matchesCategory = os.category.toLowerCase().includes(query);
        if (!matchesId && !matchesEquip && !matchesCategory) return false;
      }

      return true;
    });
  }, [selectedClientForHistory, orders, clientPeriod, clientStartDate, clientEndDate, clientOsSearch]);

  const handleCaptureGPS = async () => {
    setIsCapturingGps(true);
    setGpsError(null);
    try {
      const coords = await captureDeviceGPS();
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      setCoordinates(coords.coordinatesFormatted);
    } catch (err: any) {
      setGpsError(err.message || 'Erro ao capturar sinal do GPS.');
    } finally {
      setIsCapturingGps(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCnpjOrCpf('');
    setEmail('');
    setPhone('');
    setCity('');
    setAddress('');
    setNeighborhood('');
    setZipCode('');
    setLatitude(undefined);
    setLongitude(undefined);
    setCoordinates('');
    setGpsError(null);
    setShowAddModal(false);
    setEditingClient(null);
    if (onCloseAddModal) onCloseAddModal();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name,
      cnpjOrCpf,
      email,
      phone,
      city,
      address,
      neighborhood,
      zipCode,
      latitude,
      longitude,
      coordinates: coordinates || (latitude && longitude ? `${latitude}, ${longitude}` : undefined),
    };

    if (editingClient) {
      if (onEditClient) {
        onEditClient(editingClient.id, payload);
      }
    } else {
      onAddClient(payload);
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
            <Building className="w-4 h-4" />
            Base de Contratos & Empresas
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mt-1">Gestão de Clientes Atendidos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro de empresas, contatos e pesquisa de histórico de O.S. por período
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Cliente</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Buscar cliente por nome, cidade ou CNPJ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
        />
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map((c) => {
          const clientOsCount = orders.filter(
            (o) =>
              (o.clientId && o.clientId === c.id) ||
              (o.clientName && o.clientName.toLowerCase() === c.name.toLowerCase())
          ).length;

          return (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm border border-blue-100">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{c.name}</h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Doc: {c.cnpjOrCpf || 'Não informado'}
                      </p>
                    </div>
                  </div>

                  <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full shrink-0 border border-slate-200">
                    {clientOsCount} O.S.
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email || 'sem e-mail'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{c.phone || 'sem telefone'}</span>
                    </div>
                    {c.phone && (
                      <a
                        href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg border border-emerald-200 text-[11px] flex items-center gap-1 transition"
                        title="Enviar mensagem no WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-slate-600 space-y-1">
                      <div>{c.address ? `${c.address}${c.neighborhood ? ` - ${c.neighborhood}` : ''}` : c.city || 'Cidade N/I'}</div>
                      {c.address && (c.city || c.zipCode) && (
                        <div className="text-[11px] text-slate-400">
                          {c.city}{c.zipCode ? ` | CEP: ${c.zipCode}` : ''}
                        </div>
                      )}
                      {(c.coordinates || (c.latitude && c.longitude)) && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md text-[10px] font-mono font-bold mt-1">
                          <Navigation className="w-3 h-3 text-indigo-600" />
                          <span>GPS: {c.coordinates || `${c.latitude}, ${c.longitude}`}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GPS Navigation Quick Links */}
                  {(c.address || c.city || c.coordinates || (c.latitude && c.longitude)) && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <a
                        href={getGoogleMapsUrl(c.coordinates || `${c.address || ''}, ${c.city || ''}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 px-2 py-1 bg-slate-50 hover:bg-blue-50 text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        title="Abrir rota no Google Maps"
                      >
                        <Map className="w-3 h-3 text-blue-600" />
                        <span>Google Maps</span>
                      </a>
                      <a
                        href={getWazeUrl(c.coordinates || `${c.address || ''}, ${c.city || ''}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 px-2 py-1 bg-slate-50 hover:bg-cyan-50 text-cyan-700 border border-slate-200 hover:border-cyan-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition"
                        title="Abrir rota no Waze"
                      >
                        <Compass className="w-3 h-3 text-cyan-600" />
                        <span>Waze</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingClient(c);
                    setName(c.name);
                    setCnpjOrCpf(c.cnpjOrCpf || '');
                    setEmail(c.email || '');
                    setPhone(c.phone || '');
                    setCity(c.city || '');
                    setAddress(c.address || '');
                    setNeighborhood(c.neighborhood || '');
                    setZipCode(c.zipCode || '');
                    setLatitude(c.latitude);
                    setLongitude(c.longitude);
                    setCoordinates(c.coordinates || (c.latitude && c.longitude ? `${c.latitude}, ${c.longitude}` : ''));
                  }}
                  className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition shrink-0"
                  title="Editar cadastro do cliente"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedClientForHistory(c);
                    setClientPeriod('all');
                    setClientStartDate('');
                    setClientEndDate('');
                    setClientOsSearch('');
                  }}
                  className="flex-1 py-2 px-3 bg-slate-50 hover:bg-blue-50 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 hover:border-blue-200 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Histórico O.S.</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CLIENT O.S. HISTORY MODAL WITH PERIOD FILTER */}
      {selectedClientForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">
                    Histórico de Chamados: {selectedClientForHistory.name}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    Doc: {selectedClientForHistory.cnpjOrCpf || 'N/I'} | Cidade: {selectedClientForHistory.city}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedClientForHistory(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Controls Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-extrabold text-slate-700">Filtrar O.S. por Período:</span>
                </div>

                {/* Period Quick Tabs */}
                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button
                    onClick={() => setClientPeriod('week')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      clientPeriod === 'week'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Esta Semana (7d)
                  </button>
                  <button
                    onClick={() => setClientPeriod('month')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      clientPeriod === 'month'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Este Mês (30d)
                  </button>
                  <button
                    onClick={() => setClientPeriod('year')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      clientPeriod === 'year'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Este Ano
                  </button>
                  <button
                    onClick={() => setClientPeriod('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      clientPeriod === 'all'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todo o Histórico
                  </button>
                  <button
                    onClick={() => setClientPeriod('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      clientPeriod === 'custom'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>
              </div>

              {/* Custom Date Selector if active */}
              {clientPeriod === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span>Data Inicial:</span>
                    <input
                      type="date"
                      value={clientStartDate}
                      onChange={(e) => setClientStartDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span>Data Final:</span>
                    <input
                      type="date"
                      value={clientEndDate}
                      onChange={(e) => setClientEndDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}

              {/* Search Within Client OS */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar no histórico deste cliente por código, equipamento ou categoria..."
                  value={clientOsSearch}
                  onChange={(e) => setClientOsSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Modal Body - List of O.S. */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>Total de O.S. encontradas no período: {selectedClientOrders.length}</span>
                {clientPeriod !== 'all' && (
                  <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                    Filtro ativo: {clientPeriod === 'week' ? 'Semana' : clientPeriod === 'month' ? 'Mês' : clientPeriod === 'year' ? 'Ano' : 'Personalizado'}
                  </span>
                )}
              </div>

              {selectedClientOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                  Nenhuma ordem de serviço registrada para este cliente no período selecionado.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3">Código</th>
                        <th className="p-3">Equipamento</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3">Técnico</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Data</th>
                        <th className="p-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {selectedClientOrders.map((os) => (
                        <tr key={os.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-extrabold text-blue-600">{os.id}</td>
                          <td className="p-3 font-bold text-slate-800">{os.equipment}</td>
                          <td className="p-3">{os.category}</td>
                          <td className="p-3">{os.technicianName || '—'}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 border border-slate-200">
                              {os.status}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px]">
                            {new Date(os.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3 text-right">
                            {onSelectOrder && (
                              <button
                                onClick={() => {
                                  onSelectOrder(os);
                                  setSelectedClientForHistory(null);
                                }}
                                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 ml-auto"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Ver Detalhes</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedClientForHistory(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {(showAddModal || editingClient) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base text-white">
                {editingClient ? 'Editar Cadastro do Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Razão Social / Nome Fantasia
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    value={cnpjOrCpf}
                    onChange={(e) => setCnpjOrCpf(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Endereço / Logradouro e Número
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Av. Paulista, 1000 - Conjunto 42"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Bairro
                    </label>
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      CEP
                    </label>
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 font-medium"
                    />
                  </div>
                </div>

                {/* GPS Location Section */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Crosshair className="w-4 h-4 text-indigo-600" />
                        <span>Localização GPS do Cliente</span>
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Coordenadas para rota exata e atendimento externo/campo
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCaptureGPS}
                      disabled={isCapturingGps}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      {isCapturingGps ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>Obtendo Sinal GPS...</span>
                        </>
                      ) : (
                        <>
                          <Crosshair className="w-4 h-4 text-white" />
                          <span>Capturar GPS Atual</span>
                        </>
                      )}
                    </button>
                  </div>

                  {gpsError && (
                    <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      ⚠️ {gpsError}
                    </p>
                  )}

                  {coordinates ? (
                    <div className="flex items-center justify-between p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs font-mono font-bold text-indigo-900">
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>GPS: {coordinates}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCoordinates('');
                          setLatitude(undefined);
                          setLongitude(undefined);
                        }}
                        className="text-[11px] text-rose-600 hover:text-rose-800 font-sans font-bold underline cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-100 border border-slate-200/80 rounded-xl text-xs text-slate-500 font-medium">
                      Nenhuma localização GPS capturada. Clique no botão acima para capturar a posição do dispositivo.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingClient ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
