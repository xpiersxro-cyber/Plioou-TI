import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
  FolderOpen,
  Archive,
  Layers,
  ShieldAlert,
  RotateCcw,
  BarChart3,
  PieChart as PieIcon,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ServiceOrder, User } from '../types';

interface ReportsViewProps {
  orders?: ServiceOrder[];
  currentUser?: User;
  token?: string | null;
  onSelectOrder?: (os: ServiceOrder) => void;
}

export type PeriodType = 'day' | 'week' | 'month' | 'year';

interface ReportSummary {
  total: number;
  abertas: number;
  emAndamento: number;
  finalizadas: number;
  encerradas: number;
}

interface StatusBreakdownItem {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  currentUser,
  token,
  onSelectOrder,
}) => {
  // Verificação de permissão estrita na camada de visualização
  const isAdmin = currentUser?.role === 'admin';

  // Filtros de Período
  const [period, setPeriod] = useState<PeriodType>('month');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Dados do Relatório retornados pela API
  const [summary, setSummary] = useState<ReportSummary>({
    total: 0,
    abertas: 0,
    emAndamento: 0,
    finalizadas: 0,
    encerradas: 0,
  });
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdownItem[]>([]);
  const [reportOrders, setReportOrders] = useState<ServiceOrder[]>([]);
  const [dateRangeLabel, setDateRangeLabel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros da tabela analítica
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tableStatusFilter, setTableStatusFilter] = useState<string>('all');
  const [exportNotice, setExportNotice] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  // Consulta à API na fonte de dados
  const fetchReportData = async () => {
    if (!isAdmin) return;

    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-user-id': currentUser?.id || 'u-2',
      };
      const storedToken = token || localStorage.getItem('plioou_jwt');
      if (storedToken && storedToken !== 'demo_token') {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const tzOffset = new Date().getTimezoneOffset();
      const res = await fetch(`/api/reports/os-summary?period=${period}&date=${selectedDate}&tzOffset=${tzOffset}`, {
        headers,
      });

      if (!res.ok) {
        if (res.status === 403) {
          setError('Acesso restrito: Apenas usuários administradores têm permissão para visualizar relatórios.');
        } else {
          setError('Falha ao obter os dados do relatório.');
        }
        return;
      }

      const data = await res.json();
      setSummary(data.summary);
      setStatusBreakdown(data.statusBreakdown || []);
      setReportOrders(data.orders || []);

      // Formata o label do período ativo
      formatLabel(data.startDate, data.endDate, period, data.referenceDate);
    } catch (err: any) {
      setError(err.message || 'Erro de conexão ao buscar dados do relatório.');
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (startDateStr: string, endDateStr: string, p: PeriodType, refDateStr: string) => {
    try {
      const ref = new Date(refDateStr);
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);

      if (p === 'day') {
        const diaFormatado = start.toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        });
        setDateRangeLabel(diaFormatado.charAt(0).toUpperCase() + diaFormatado.slice(1));
      } else if (p === 'week') {
        setDateRangeLabel(
          `Semana de ${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} até ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
        );
      } else if (p === 'month') {
        const mesAno = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        setDateRangeLabel(mesAno.charAt(0).toUpperCase() + mesAno.slice(1));
      } else {
        setDateRangeLabel(`Ano de ${ref.getFullYear()}`);
      }
    } catch {
      setDateRangeLabel(selectedDate);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [period, selectedDate, isAdmin]);

  // Navegação de datas
  const handleNavigateDate = (direction: 'prev' | 'next') => {
    const d = new Date(selectedDate + 'T12:00:00');
    if (isNaN(d.getTime())) return;

    if (period === 'day') {
      d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
    } else if (period === 'week') {
      d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    } else if (period === 'month') {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (period === 'year') {
      d.setFullYear(d.getFullYear() + (direction === 'next' ? 1 : -1));
    }

    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleResetToToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  };

  // Filtragem local na tabela analítica de registros
  const filteredTableOrders = useMemo(() => {
    return reportOrders.filter((os) => {
      // Filtro de status da tabela
      if (tableStatusFilter !== 'all') {
        if (tableStatusFilter === 'Aberta' && os.status !== 'Aberta') return false;
        if (
          tableStatusFilter === 'Em Andamento' &&
          os.status !== 'Em Andamento' &&
          os.status !== 'Aguardando Peças' &&
          os.status !== 'Aguardando Cliente' &&
          os.status !== 'Finalizado pelo Técnico'
        ) {
          return false;
        }
        if (tableStatusFilter === 'Finalizado' && os.status !== 'Finalizado') return false;
        if (tableStatusFilter === 'Encerrado' && os.status !== 'Encerrado') return false;
      }

      // Busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = os.id.toLowerCase().includes(q);
        const matchesClient = os.clientName.toLowerCase().includes(q);
        const matchesEquipment = os.equipment.toLowerCase().includes(q);
        const matchesCategory = (os.category || '').toLowerCase().includes(q);
        const matchesTech = (os.technicianName || '').toLowerCase().includes(q);
        return matchesId || matchesClient || matchesEquipment || matchesCategory || matchesTech;
      }

      return true;
    });
  }, [reportOrders, tableStatusFilter, searchQuery]);

  // Função 1: Imprimir (Abre janela nativa de impressão do navegador)
  const handlePrint = () => {
    window.print();
  };

  // Função 2: Exportar (Exporta relatório atual em CSV UTF-8 de forma independente)
  const handleExportReport = () => {
    if (filteredTableOrders.length === 0) {
      setExportNotice({
        text: 'Nenhuma Ordem de Serviço para exportar no período e filtros atuais.',
        type: 'warning',
      });
      setTimeout(() => setExportNotice(null), 4000);
      return;
    }

    const headers = ['Código', 'Cliente', 'Equipamento', 'Categoria', 'Técnico', 'Status', 'Data de Criação', 'Prioridade'];
    const rows = filteredTableOrders.map((os) => [
      `"${(os.id || '').replace(/"/g, '""')}"`,
      `"${(os.clientName || '').replace(/"/g, '""')}"`,
      `"${(os.equipment || '').replace(/"/g, '""')}"`,
      `"${(os.category || '').replace(/"/g, '""')}"`,
      `"${(os.technicianName || 'Não atribuído').replace(/"/g, '""')}"`,
      `"${(os.status || '').replace(/"/g, '""')}"`,
      `"${os.createdAt ? `${new Date(os.createdAt).toLocaleDateString('pt-BR')} ${new Date(os.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}"`,
      `"${(os.priority || '').replace(/"/g, '""')}"`,
    ]);

    const filename = `relatorio-os-${period}-${selectedDate}.csv`;
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Desacoplado: remove do DOM e revoga URL após delay seguro para não cancelar o download assíncrono no navegador
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 2000);

      setExportNotice({
        text: `Arquivo ${filename} exportado com sucesso (${filteredTableOrders.length} registros).`,
        type: 'success',
      });
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      // Fallback para Data URI caso o ambiente restrinja Blob URLs
      const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', filename);
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
      }, 1000);

      setExportNotice({
        text: `Arquivo ${filename} exportado com sucesso (${filteredTableOrders.length} registros).`,
        type: 'success',
      });
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  // Se não for admin, proteção de renderização
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm max-w-xl mx-auto my-12">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Acesso Restrito ao Administrador</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Esta área é reservada para controle gerencial de Ordens de Serviço e indicadores corporativos. Usuários com perfil de Técnico não possuem permissão para visualizar relatórios.
        </p>
      </div>
    );
  }

  // Dados para o Gráfico de Barras com rótulos e cores
  const barChartData = [
    { name: 'Abertas', quantidade: summary.abertas, fill: '#2563eb' },
    { name: 'Em andamento', quantidade: summary.emAndamento, fill: '#f59e0b' },
    { name: 'Finalizadas', quantidade: summary.finalizadas, fill: '#10b981' },
    { name: 'Encerradas', quantidade: summary.encerradas, fill: '#6366f1' },
  ];

  // Dados para o Gráfico de Rosca (Donut)
  const pieChartData = [
    { name: 'Abertas', value: summary.abertas, color: '#2563eb' },
    { name: 'Em andamento', value: summary.emAndamento, color: '#f59e0b' },
    { name: 'Finalizadas', value: summary.finalizadas, color: '#10b981' },
    { name: 'Encerradas', value: summary.encerradas, color: '#6366f1' },
  ].filter((item) => item.value > 0);

  return (
    <div className="animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. VERSÃO INTERATIVA EM TELA (print:hidden)              */}
      {/* ======================================================== */}
      <div className="space-y-6 print:hidden">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs uppercase tracking-wider mb-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span>Módulo Exclusivo Admin</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Relatório de Ordens de Serviço
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
              Controle de volumetria, acompanhamento de status e distribuição de chamados por período
            </p>
          </div>

          {/* Botões de Ação: [ 🖨️ Imprimir ] [ 📥 Exportar ] */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchReportData()}
              disabled={loading}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 rounded-xl transition text-xs font-bold cursor-pointer disabled:opacity-50"
              title="Atualizar dados da fonte"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>

            {/* Botão Imprimir */}
            <button
              type="button"
              onClick={() => {
                console.log('IMPRIMIR CLICADO');
                window.print();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition shadow-sm text-xs font-bold cursor-pointer"
              title="Imprimir relatório profissional na janela nativa do navegador"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Imprimir</span>
            </button>

            {/* Botão Exportar */}
            <button
              type="button"
              onClick={handleExportReport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-lg shadow-blue-600/30 text-xs font-bold cursor-pointer disabled:opacity-50"
              title="Exportar dados do relatório em arquivo CSV"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros por Período (Dia, Semana, Mês, Ano) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Seletor de Período Principal */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-700 text-xs font-extrabold">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Filtrar por Período:</span>
              </div>

              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setPeriod('day')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    period === 'day'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Dia
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('week')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    period === 'week'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Semana
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('month')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    period === 'month'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Mês
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('year')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                    period === 'year'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Ano
                </button>
              </div>
            </div>

            {/* Navegador Interativo de Datas */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleNavigateDate('prev')}
                  className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                  title="Período anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDate(e.target.value);
                    }}
                    className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleNavigateDate('next')}
                  className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                  title="Próximo período"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetToToday}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200 cursor-pointer"
              >
                Hoje
              </button>
            </div>
          </div>

          {/* Indicador do Intervalo Atual Selecionado */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Período ativo:</span>
              <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                {dateRangeLabel || 'Calculando período...'}
              </span>
            </div>

            {loading && (
              <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Consultando base de dados...
              </span>
            )}
          </div>
        </div>

        {/* Erro de Requisição (se houver) */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Notificação / Feedback de Exportação */}
        {exportNotice && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all ${
              exportNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {exportNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            )}
            <span>{exportNotice.text}</span>
          </div>
        )}

        {/* CARDS / RESUMOS NA PARTE SUPERIOR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* CARD TOTAL GERAL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 hover:border-slate-300 transition">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Total no Período</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4 text-slate-700" />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{summary.total}</p>
            <p className="text-[11px] text-slate-500 font-medium">Todas as O.S. registradas</p>
          </div>

          {/* CARD ABERTAS */}
          <div className="bg-white border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 hover:border-blue-300 transition bg-gradient-to-br from-white to-blue-50/30">
            <div className="flex items-center justify-between text-blue-700 text-xs font-extrabold">
              <span>Total Abertas</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <FolderOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-blue-600 tracking-tight">{summary.abertas}</p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Aguardando atendimento</span>
              <span className="font-extrabold text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded">
                {summary.total > 0 ? Math.round((summary.abertas / summary.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* CARD EM ANDAMENTO */}
          <div className="bg-white border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 hover:border-amber-300 transition bg-gradient-to-br from-white to-amber-50/30">
            <div className="flex items-center justify-between text-amber-700 text-xs font-extrabold">
              <span>Em Andamento</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-amber-600 tracking-tight">{summary.emAndamento}</p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Em execução técnica</span>
              <span className="font-extrabold text-amber-600 bg-amber-100/70 px-1.5 py-0.5 rounded">
                {summary.total > 0 ? Math.round((summary.emAndamento / summary.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* CARD FINALIZADAS */}
          <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 hover:border-emerald-300 transition bg-gradient-to-br from-white to-emerald-50/30">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-extrabold">
              <span>Total Finalizadas</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-600 tracking-tight">{summary.finalizadas}</p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Concluídas pelo técnico</span>
              <span className="font-extrabold text-emerald-600 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                {summary.total > 0 ? Math.round((summary.finalizadas / summary.total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* CARD ENCERRADAS */}
          <div className="bg-white border border-indigo-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2 hover:border-indigo-300 transition bg-gradient-to-br from-white to-indigo-50/30">
            <div className="flex items-center justify-between text-indigo-700 text-xs font-extrabold">
              <span>Total Encerradas</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <Archive className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-black text-indigo-600 tracking-tight">{summary.encerradas}</p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Faturadas / Arquivadas</span>
              <span className="font-extrabold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                {summary.total > 0 ? Math.round((summary.encerradas / summary.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* GRÁFICOS DE DISTRIBUIÇÃO DAS O.S. POR STATUS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* GRÁFICO 1: Barras Comparativas de Volume */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Distribuição de O.S. por Status</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Volume de trabalho categorizado no período selecionado
                </p>
              </div>
              <span className="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                {summary.total} O.S. Total
              </span>
            </div>

            <div className="h-68 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '14px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                    formatter={(value: any) => [`${value} O.S.`, 'Quantidade']}
                  />
                  <Bar dataKey="quantidade" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GRÁFICO 2: Donut Chart de Proporção Relativa */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-indigo-600" />
                  <span>Composição Percentual</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Proporção do volume total de atendimento
                </p>
              </div>
            </div>

            <div className="h-68 w-full flex items-center justify-center">
              {pieChartData.length === 0 ? (
                <div className="text-center p-6 text-slate-400 space-y-2">
                  <Layers className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs font-bold">Nenhuma O.S. registrada neste período.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '14px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                      formatter={(val: any, name: any) => [`${val} chamados`, name]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* TABELA ANALÍTICA DETALHADA DAS O.S. NO PERÍODO (VERSÃO DE TELA) */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Listagem Analítica das O.S. do Período</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Dados reais extraídos da base de dados ({filteredTableOrders.length} de {reportOrders.length} registros no período)
              </p>
            </div>

            {/* Filtros Internos da Tabela */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Filter */}
              <select
                value={tableStatusFilter}
                onChange={(e) => setTableStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="Aberta">Abertas ({summary.abertas})</option>
                <option value="Em Andamento">Em Andamento ({summary.emAndamento})</option>
                <option value="Finalizado">Finalizadas ({summary.finalizadas})</option>
                <option value="Encerrado">Encerradas ({summary.encerradas})</option>
              </select>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por O.S., cliente, técnico..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Dados da Tela */}
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Código</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Equipamento</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5">Técnico</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Data / Hora</th>
                  <th className="p-3.5 text-center">Prioridade</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredTableOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      Nenhuma Ordem de Serviço encontrada para os critérios selecionados neste período.
                    </td>
                  </tr>
                ) : (
                  filteredTableOrders.map((os) => {
                    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (os.status === 'Aberta') {
                      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                    } else if (
                      os.status === 'Em Andamento' ||
                      os.status === 'Aguardando Peças' ||
                      os.status === 'Aguardando Cliente' ||
                      os.status === 'Finalizado pelo Técnico'
                    ) {
                      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                    } else if (os.status === 'Finalizado') {
                      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    } else if (os.status === 'Encerrado') {
                      badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                    }

                    return (
                      <tr key={os.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-black text-blue-600">{os.id}</td>
                        <td className="p-3.5 font-bold text-slate-900">{os.clientName}</td>
                        <td className="p-3.5">{os.equipment}</td>
                        <td className="p-3.5">
                          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {os.category || 'Geral'}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {os.technicianName || '—'}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${badgeClass}`}>
                            {os.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px]">
                          {new Date(os.createdAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(os.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              os.priority === 'Crítica'
                                ? 'bg-rose-100 text-rose-700'
                                : os.priority === 'Alta'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {os.priority}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          {onSelectOrder && (
                            <button
                              type="button"
                              onClick={() => onSelectOrder(os)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver O.S.</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VERSÃO EXCLUSIVA PARA IMPRESSÃO (@media print)        */}
      {/* Somente exibida quando disparado o comando window.print()*/}
      {/* Contém exatamente:                                       */}
      {/* - Cabeçalho: Relatório de O.S., Período, Data/Hora       */}
      {/* - Resumo: Indicadores e Percentuais correspondentes      */}
      {/* - Tabela com EXATAMENTE estas 6 colunas na ordem:        */}
      {/*   Código | Cliente | Equipamento | Categoria | Técnico | Status */}
      {/* ======================================================== */}
      <div className="hidden print:block w-full text-slate-900 bg-white">
        {/* Cabeçalho de Impressão */}
        <div className="border-b-2 border-slate-900 pb-3 mb-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11pt] font-black uppercase tracking-wider text-blue-700">Plioou TI</span>
              <span className="text-slate-400">•</span>
              <span className="text-[10pt] font-semibold text-slate-600">Sistema de Gestão de Ordens de Serviço</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Relatório de O.S.
            </h1>
            <p className="text-xs font-bold text-slate-800 mt-1">
              Período: <span className="text-blue-700">{dateRangeLabel}</span>
            </p>
          </div>

          <div className="text-right text-[9pt] text-slate-600 font-medium">
            <p className="font-bold text-slate-900">Comprovante Gerencial</p>
            <p>
              Gerado em: {new Date().toLocaleDateString('pt-BR')} às{' '}
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[8pt] text-slate-400 mt-0.5">Uso Interno Administrativo</p>
          </div>
        </div>

        {/* Resumo de Indicadores Impresso */}
        <div className="mb-6">
          <h2 className="text-[10pt] font-black uppercase tracking-wider text-slate-700 mb-2">
            Resumo do Período
          </h2>
          <div className="grid grid-cols-5 gap-3 border border-slate-300 rounded-xl p-3 bg-slate-50/80">
            <div className="border-r border-slate-300 pr-2">
              <span className="block text-[8pt] font-bold text-slate-500 uppercase">Total de O.S.</span>
              <span className="text-xl font-black text-slate-900">{summary.total}</span>
              <span className="block text-[8pt] text-slate-400 font-medium">100% no período</span>
            </div>
            <div className="border-r border-slate-300 pr-2">
              <span className="block text-[8pt] font-bold text-blue-700 uppercase">Abertas</span>
              <span className="text-xl font-black text-blue-700">{summary.abertas}</span>
              <span className="block text-[8pt] text-slate-600 font-bold">
                {summary.total > 0 ? Math.round((summary.abertas / summary.total) * 100) : 0}%
              </span>
            </div>
            <div className="border-r border-slate-300 pr-2">
              <span className="block text-[8pt] font-bold text-amber-700 uppercase">Em andamento</span>
              <span className="text-xl font-black text-amber-700">{summary.emAndamento}</span>
              <span className="block text-[8pt] text-slate-600 font-bold">
                {summary.total > 0 ? Math.round((summary.emAndamento / summary.total) * 100) : 0}%
              </span>
            </div>
            <div className="border-r border-slate-300 pr-2">
              <span className="block text-[8pt] font-bold text-emerald-700 uppercase">Finalizadas</span>
              <span className="text-xl font-black text-emerald-700">{summary.finalizadas}</span>
              <span className="block text-[8pt] text-slate-600 font-bold">
                {summary.total > 0 ? Math.round((summary.finalizadas / summary.total) * 100) : 0}%
              </span>
            </div>
            <div>
              <span className="block text-[8pt] font-bold text-indigo-700 uppercase">Encerradas</span>
              <span className="text-xl font-black text-indigo-700">{summary.encerradas}</span>
              <span className="block text-[8pt] text-slate-600 font-bold">
                {summary.total > 0 ? Math.round((summary.encerradas / summary.total) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Tabela de O.S. para Impressão (SOMENTE as 6 colunas na ordem exata) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-300">
            <h2 className="text-[10pt] font-black uppercase tracking-wider text-slate-800">
              Detalhamento das O.S. ({filteredTableOrders.length} registros)
            </h2>
            <span className="text-[8pt] text-slate-500 font-medium">
              Filtro ativo: {tableStatusFilter !== 'all' ? tableStatusFilter : 'Todos os status'}
              {searchQuery ? ` | Busca: "${searchQuery}"` : ''}
            </span>
          </div>

          <table className="w-full text-left border-collapse text-[9.5pt]">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-900 text-[8.5pt] font-black uppercase">
                <th className="py-2.5 px-2 text-left w-20">Código</th>
                <th className="py-2.5 px-2 text-left">Cliente</th>
                <th className="py-2.5 px-2 text-left">Equipamento</th>
                <th className="py-2.5 px-2 text-left w-28">Categoria</th>
                <th className="py-2.5 px-2 text-left w-36">Técnico</th>
                <th className="py-2.5 px-2 text-left w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[9pt]">
              {filteredTableOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                    Nenhuma Ordem de Serviço encontrada para os critérios selecionados neste período.
                  </td>
                </tr>
              ) : (
                filteredTableOrders.map((os) => (
                  <tr key={os.id} className="border-b border-slate-200">
                    <td className="py-2.5 px-2 font-black text-slate-900">{os.id}</td>
                    <td className="py-2.5 px-2 font-bold text-slate-900">{os.clientName}</td>
                    <td className="py-2.5 px-2 text-slate-800">{os.equipment}</td>
                    <td className="py-2.5 px-2 text-slate-600">{os.category || 'Geral'}</td>
                    <td className="py-2.5 px-2 text-slate-700 font-medium">
                      {os.technicianName || 'Não atribuído'}
                    </td>
                    <td className="py-2.5 px-2 font-bold text-slate-900">{os.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Impressão */}
        <div className="border-t border-slate-300 pt-3 text-[8pt] text-slate-500 flex items-center justify-between">
          <span>Plioou TI • Documento Gerencial de Ordem de Serviço</span>
          <span>Acesso Exclusivo Administrador • Confidencial</span>
        </div>
      </div>
    </div>
  );
};
