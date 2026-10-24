import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  CreditCard,
  PieChart,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Receipt,
  Calendar,
  Filter,
  Download,
  Search,
  Building2,
  Wrench,
  ShoppingBag,
  Percent,
  Check,
  AlertCircle,
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
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import { ServiceOrder } from '../types';

interface FinancialViewProps {
  orders: ServiceOrder[];
  onSelectOrder?: (os: ServiceOrder) => void;
  onUpdateFinancials?: (
    osId: string,
    laborCost: number,
    partsCost: number,
    discountCost: number,
    paymentMethod: string,
    financialNotes: string
  ) => void;
}

const PIE_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const FinancialView: React.FC<FinancialViewProps> = ({
  orders,
  onSelectOrder,
  onUpdateFinancials,
}) => {
  const [period, setPeriod] = useState<'30days' | 'month' | 'year' | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Quick edit modal state
  const [editingOs, setEditingOs] = useState<ServiceOrder | null>(null);
  const [editLabor, setEditLabor] = useState<number | string>(0);
  const [editParts, setEditParts] = useState<number | string>(0);
  const [editDiscount, setEditDiscount] = useState<number | string>(0);
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('Pix');
  const [editNotes, setEditNotes] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Filter orders by period & criteria
  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter((os) => {
      // Date filter
      if (os.createdAt) {
        const osDate = new Date(os.createdAt);
        if (period === '30days') {
          const thirtyAgo = new Date();
          thirtyAgo.setDate(now.getDate() - 30);
          if (osDate < thirtyAgo) return false;
        } else if (period === 'month') {
          if (osDate.getMonth() !== now.getMonth() || osDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        } else if (period === 'year') {
          if (osDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // Payment filter
      if (paymentFilter !== 'all') {
        const pMethod = os.paymentMethod || 'Pendente';
        if (paymentFilter === 'Pendente' && os.paymentMethod && os.paymentMethod !== 'Pendente') {
          return false;
        }
        if (paymentFilter !== 'Pendente' && pMethod !== paymentFilter) {
          return false;
        }
      }

      // OS Status Filter
      if (statusFilter !== 'all' && os.status !== statusFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesId = os.id.toLowerCase().includes(term);
        const matchesClient = os.clientName.toLowerCase().includes(term);
        const matchesEquip = os.equipment.toLowerCase().includes(term);
        if (!matchesId && !matchesClient && !matchesEquip) return false;
      }

      return true;
    });
  }, [orders, period, paymentFilter, statusFilter, searchTerm]);

  // Financial KPIs
  const financials = useMemo(() => {
    let totalGrossRevenue = 0;
    let totalLaborRevenue = 0;
    let totalPartsCost = 0;
    let totalDiscounts = 0;
    let pendingQuoteAmount = 0;
    let approvedQuoteAmount = 0;
    let finalizedRevenue = 0;

    filteredOrders.forEach((os) => {
      const labor = os.laborCost || 0;
      const parts = os.partsCost || 0;
      const discount = os.discountCost || 0;
      const total = os.totalCost !== undefined && os.totalCost !== null ? os.totalCost : Math.max(0, labor + parts - discount);

      totalLaborRevenue += labor;
      totalPartsCost += parts;
      totalDiscounts += discount;
      totalGrossRevenue += total;

      if (os.status === 'Finalizado' || os.status === 'Encerrado') {
        finalizedRevenue += total;
      }

      if (os.quoteStatus === 'Pendente' || os.quoteStatus === 'Enviado') {
        const qTotal = os.quoteItems ? os.quoteItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0) : parts;
        pendingQuoteAmount += qTotal + labor;
      } else if (os.quoteStatus === 'Aprovado') {
        const qTotal = os.quoteItems ? os.quoteItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0) : parts;
        approvedQuoteAmount += qTotal + labor;
      }
    });

    const netProfit = Math.max(0, totalGrossRevenue - totalPartsCost);
    const marginPercent = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0;

    return {
      totalGrossRevenue,
      totalLaborRevenue,
      totalPartsCost,
      totalDiscounts,
      netProfit,
      marginPercent,
      pendingQuoteAmount,
      approvedQuoteAmount,
      finalizedRevenue,
    };
  }, [filteredOrders]);

  // Revenue by Category for PieChart
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();

    filteredOrders.forEach((os) => {
      const cat = os.category || 'Outros';
      const labor = os.laborCost || 0;
      const parts = os.partsCost || 0;
      const discount = os.discountCost || 0;
      const val = os.totalCost !== undefined ? os.totalCost : Math.max(0, labor + parts - discount);

      map.set(cat, (map.get(cat) || 0) + val);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  // Top Clients by Revenue
  const topClientsData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    filteredOrders.forEach((os) => {
      const name = os.clientName || 'Cliente sem nome';
      const labor = os.laborCost || 0;
      const parts = os.partsCost || 0;
      const discount = os.discountCost || 0;
      const val = os.totalCost !== undefined ? os.totalCost : Math.max(0, labor + parts - discount);

      const current = map.get(name) || { total: 0, count: 0 };
      map.set(name, {
        total: current.total + val,
        count: current.count + 1,
      });
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, value: data.total, count: data.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredOrders]);

  // Open Edit Modal
  const handleOpenEdit = (os: ServiceOrder) => {
    setEditingOs(os);
    setEditLabor(os.laborCost || 0);
    setEditParts(os.partsCost || 0);
    setEditDiscount(os.discountCost || 0);
    setEditPaymentMethod(os.paymentMethod || 'Pix');
    setEditNotes(os.financialNotes || '');
    setSaveSuccess(false);
  };

  const handleSaveFinancials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOs) return;

    const numLabor = Number(editLabor) || 0;
    const numParts = Number(editParts) || 0;
    const numDiscount = Number(editDiscount) || 0;

    if (onUpdateFinancials) {
      onUpdateFinancials(
        editingOs.id,
        numLabor,
        numParts,
        numDiscount,
        editPaymentMethod,
        editNotes
      );
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setEditingOs(null);
    }, 1200);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID O.S.', 'Cliente', 'Equipamento', 'Status O.S.', 'Mão de Obra (R$)', 'Peças (R$)', 'Desconto (R$)', 'Total (R$)', 'Forma Pagamento', 'Status Orçamento'];
    const rows = filteredOrders.map((os) => {
      const labor = os.laborCost || 0;
      const parts = os.partsCost || 0;
      const discount = os.discountCost || 0;
      const total = os.totalCost !== undefined ? os.totalCost : Math.max(0, labor + parts - discount);

      return [
        os.id,
        `"${os.clientName.replace(/"/g, '""')}"`,
        `"${os.equipment.replace(/"/g, '""')}"`,
        os.status,
        labor.toFixed(2),
        parts.toFixed(2),
        discount.toFixed(2),
        total.toFixed(2),
        os.paymentMethod || 'Pendente',
        os.quoteStatus || 'Pendente',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_financeiro_plioou_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Wallet className="w-4 h-4" />
            Gestão Financeira & Faturamento de Serviços
          </div>
          <h2 className="text-2xl font-black text-white mt-1 tracking-tight">Painel Financeiro & DRE de T.I.</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Acompanhamento de faturamento bruto, custos de peças, margens de lucro e status de cobrança de O.S.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="w-full md:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Relatório CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Faturamento Bruto</span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {financials.totalGrossRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Mão de Obra: <strong className="text-slate-800">{financials.totalLaborRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
            <span>Finalizadas: <strong className="text-emerald-600">{financials.finalizedRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
          </div>
        </div>

        {/* Parts Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Custo de Peças</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {financials.totalPartsCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Descontos Concedidos: <strong className="text-rose-600">{financials.totalDiscounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
          </div>
        </div>

        {/* Net Profit & Margin */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Lucro Líquido Estimado</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {financials.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <Percent className="w-3.5 h-3.5" />
            <span>Margem Bruta de Serviços: <strong>{financials.marginPercent.toFixed(1)}%</strong></span>
          </div>
        </div>

        {/* Pending Quotes / Expected Income */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Orçamentos Pendentes</span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {financials.pendingQuoteAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Aprovados em Execução: <strong className="text-blue-600">{financials.approvedQuoteAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
          </div>
        </div>
      </div>

      {/* DRE Resumido & Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DRE Resumido Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                DRE Resumido (Demonstrativo)
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Operacional T.I.
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50">
              <span className="font-bold text-slate-700">(+) Receita Bruta de Serviços & Mão de Obra</span>
              <span className="font-black text-slate-900">{financials.totalLaborRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50">
              <span className="font-bold text-slate-700">(+) Repasse / Reembolso de Peças</span>
              <span className="font-black text-slate-900">{financials.totalPartsCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-rose-50/60 text-rose-900 border border-rose-100">
              <span className="font-bold">(-) Descontos Concedidos</span>
              <span className="font-black">-{financials.totalDiscounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 text-white flex justify-between items-center font-bold">
              <span>(=) Faturamento Bruto Total</span>
              <span className="text-base font-black text-blue-400">{financials.totalGrossRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50">
              <span className="font-bold text-slate-700">(-) Custo Direto com Peças/Insumos</span>
              <span className="font-bold text-slate-800">-{financials.totalPartsCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200 flex justify-between items-center font-extrabold text-sm">
              <span>(=) Lucro Bruto Operacional</span>
              <span className="text-emerald-700 text-base">{financials.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>
        </div>

        {/* Category Distribution Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                Faturamento por Categoria de Serviço
              </h3>
            </div>
          </div>

          {categoryData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                  <Tooltip
                    formatter={(val: number) => [val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Faturamento']}
                    contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              Nenhum dado financeiro registrado para exibir no gráfico.
            </div>
          )}
        </div>
      </div>

      {/* Orders Financial Table & Filters */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Lançamentos & Cobrança de Ordens de Serviço
            </h3>
            <p className="text-xs text-slate-400">
              Detalhamento de faturamento, forma de pagamento e lançamento individual de cada chamado
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar O.S., Cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">Todas Formas de Pagamento</option>
              <option value="Pix">Pix</option>
              <option value="Boleto">Boleto Bancário</option>
              <option value="Cartão de Crédito">Cartão de Crédito</option>
              <option value="Transferência">Transferência / TED</option>
              <option value="Faturado 30 dias">Faturado 30 dias</option>
              <option value="Pendente">Pendente de Lançamento</option>
            </select>

            {/* Period Filter */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">Todo o Período</option>
              <option value="30days">Últimos 30 Dias</option>
              <option value="month">Este Mês</option>
              <option value="year">Este Ano</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-2xs">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Nº O.S.</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Equipamento</th>
                <th className="p-3 text-right">Mão de Obra</th>
                <th className="p-3 text-right">Peças</th>
                <th className="p-3 text-right">Desconto</th>
                <th className="p-3 text-right">Total O.S.</th>
                <th className="p-3 text-center">Forma Pagto</th>
                <th className="p-3 text-center">Status Orçamento</th>
                <th className="p-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((os) => {
                  const labor = os.laborCost || 0;
                  const parts = os.partsCost || 0;
                  const discount = os.discountCost || 0;
                  const total = os.totalCost !== undefined ? os.totalCost : Math.max(0, labor + parts - discount);

                  return (
                    <tr key={os.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-extrabold text-blue-600">{os.id}</td>
                      <td className="p-3 font-semibold text-slate-800">{os.clientName}</td>
                      <td className="p-3 text-slate-600 font-medium">{os.equipment}</td>
                      <td className="p-3 text-right text-slate-700 font-medium">
                        {labor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-3 text-right text-slate-700 font-medium">
                        {parts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-3 text-right text-rose-600 font-medium">
                        {discount > 0 ? `-${discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '-'}
                      </td>
                      <td className="p-3 text-right font-black text-slate-900">
                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          os.paymentMethod === 'Pix'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : os.paymentMethod === 'Boleto'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : os.paymentMethod === 'Cartão de Crédito'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : os.paymentMethod === 'Faturado 30 dias'
                            ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          {os.paymentMethod || 'Pendente'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          os.quoteStatus === 'Aprovado'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : os.quoteStatus === 'Enviado'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : os.quoteStatus === 'Rejeitado' || os.quoteStatus === 'Recusado'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {os.quoteStatus || 'Pendente'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(os)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                            title="Editar Valores e Forma de Pagamento"
                          >
                            Lançar
                          </button>
                          {onSelectOrder && (
                            <button
                              type="button"
                              onClick={() => onSelectOrder(os)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Ver O.S. Completa"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-400 font-medium">
                    Nenhum lançamento financeiro encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT FINANCIALS QUICK MODAL */}
      {editingOs && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Lançamento Financeiro - {editingOs.id}
                </h3>
              </div>
              <button
                onClick={() => setEditingOs(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Valores financeiros atualizados com sucesso!</span>
              </div>
            )}

            <form onSubmit={handleSaveFinancials} className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                <span className="font-bold block text-slate-800">{editingOs.clientName}</span>
                <span className="text-[11px] text-slate-500">{editingOs.equipment}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mão de Obra (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editLabor}
                    onChange={(e) => setEditLabor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peças (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editParts}
                    onChange={(e) => setEditParts(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Desconto (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-rose-600 focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex justify-between items-center font-bold">
                <span className="text-slate-700">Total Calculado da O.S.:</span>
                <span className="text-indigo-700 text-sm font-black">
                  {(
                    Math.max(0, (Number(editLabor) || 0) + (Number(editParts) || 0) - (Number(editDiscount) || 0))
                  ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Forma de Pagamento / Faturamento</label>
                <select
                  value={editPaymentMethod}
                  onChange={(e) => setEditPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="Pix">Pix (À vista)</option>
                  <option value="Boleto">Boleto Bancário</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Transferência">Transferência Bancária / TED</option>
                  <option value="Faturado 30 dias">Faturado 30 Dias</option>
                  <option value="Pendente">Aguardando Lançamento</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações Financeiras</label>
                <input
                  type="text"
                  placeholder="Ex: Nota Fiscal nº 4092 emitida em 12/08..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOs(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
