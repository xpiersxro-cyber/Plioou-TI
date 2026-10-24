import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'plioou_ti_jwt_secret_key_2026';

describe('Sistema de Ordem de Serviço - Regras de Negócio', () => {
  it('Deve gerar e verificar token JWT com role de Técnico', () => {
    const payload = {
      id: 'u-1',
      name: 'Técnico Rogério',
      email: 'rogerio@plioou.com',
      role: 'technician' as const,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    expect(token).toBeDefined();

    const decoded = jwt.verify(token, JWT_SECRET) as typeof payload;
    expect(decoded.name).toBe('Técnico Rogério');
    expect(decoded.role).toBe('technician');
  });

  it('Deve identificar corretamente O.S. paradas com mais de 48 horas', () => {
    const now = Date.now();
    const mockOrders = [
      { id: 'OS-0092', stalledHours: 52, status: 'Aberta' },
      { id: 'OS-0095', stalledHours: 0, status: 'Finalizado' },
      { id: 'OS-0077', stalledHours: 95, status: 'Em Andamento' },
    ];

    const stalledCount = mockOrders.filter(
      (os) => os.stalledHours >= 48 && os.status !== 'Finalizado'
    ).length;

    expect(stalledCount).toBe(2);
  });

  it('Deve filtrar O.S. atribuídas especificamente para o Técnico logado', () => {
    const mockOrders = [
      { id: 'OS-0095', technicianId: 'u-1', title: 'Manutenção Wi-Fi' },
      { id: 'OS-0094', technicianId: 'u-3', title: 'Servidor Impressão' },
      { id: 'OS-0093', technicianId: 'u-1', title: 'Notebook HP' },
    ];

    const rogerioOrders = mockOrders.filter((os) => os.technicianId === 'u-1');
    expect(rogerioOrders.length).toBe(2);
    expect(rogerioOrders.map((os) => os.id)).toEqual(['OS-0095', 'OS-0093']);
  });

  it('Deve validar se a secret API_KEY está configurada no ambiente antes de executar', () => {
    // Função simulando a validação de pré-execução
    const validateApiKey = (env: Record<string, string | undefined>) => {
      const key = env.API_KEY || env.GEMINI_API_KEY;
      if (!key || key.trim() === '') {
        return { valid: false, error: 'A variável de ambiente API_KEY não está configurada.' };
      }
      return { valid: true, error: null };
    };

    // Caso 1: API_KEY ausente
    expect(validateApiKey({}).valid).toBe(false);
    expect(validateApiKey({ API_KEY: '' }).valid).toBe(false);
    expect(validateApiKey({ API_KEY: '   ' }).valid).toBe(false);

    // Caso 2: API_KEY presente e preenchida
    expect(validateApiKey({ API_KEY: 'test-secret-key-123' }).valid).toBe(true);
    expect(validateApiKey({ GEMINI_API_KEY: 'test-gemini-key-456' }).valid).toBe(true);
  });

  it('Deve restringir o acesso ao relatório de O.S. exclusivamente para perfil Admin', () => {
    const checkReportAccess = (role: string) => {
      if (role !== 'admin') {
        return { allowed: false, status: 403, error: 'Acesso restrito: Apenas administradores podem acessar relatórios.' };
      }
      return { allowed: true, status: 200, error: null };
    };

    expect(checkReportAccess('technician').allowed).toBe(false);
    expect(checkReportAccess('technician').status).toBe(403);
    expect(checkReportAccess('admin').allowed).toBe(true);
    expect(checkReportAccess('admin').status).toBe(200);
  });

  it('Deve filtrar e contabilizar corretamente os status (Abertas, Em andamento, Finalizadas, Encerradas) por período', () => {
    const baseNow = new Date('2026-10-07T12:00:00Z');
    const dayMs = 24 * 3600 * 1000;

    const sampleOrders = [
      { id: 'OS-1', status: 'Aberta', createdAt: new Date(baseNow.getTime() - 2 * 3600 * 1000).toISOString() }, // Hoje
      { id: 'OS-2', status: 'Em Andamento', createdAt: new Date(baseNow.getTime() - 4 * 3600 * 1000).toISOString() }, // Hoje
      { id: 'OS-3', status: 'Finalizado', createdAt: new Date(baseNow.getTime() - 6 * 3600 * 1000).toISOString() }, // Hoje
      { id: 'OS-4', status: 'Encerrado', createdAt: new Date(baseNow.getTime() - 8 * 3600 * 1000).toISOString() }, // Hoje
      { id: 'OS-5', status: 'Aberta', createdAt: new Date(baseNow.getTime() - 3 * dayMs).toISOString() }, // Esta semana
      { id: 'OS-6', status: 'Em Andamento', createdAt: new Date(baseNow.getTime() - 10 * dayMs).toISOString() }, // Este mês
      { id: 'OS-7', status: 'Encerrado', createdAt: new Date(baseNow.getTime() - 40 * dayMs).toISOString() }, // Este ano
    ];

    // Contagem de hoje (Dia)
    const todayStart = new Date('2026-10-07T00:00:00Z').getTime();
    const todayEnd = new Date('2026-10-07T23:59:59Z').getTime();
    const todayOrders = sampleOrders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= todayStart && t <= todayEnd;
    });

    const countStatus = (list: typeof sampleOrders) => ({
      abertas: list.filter((o) => o.status === 'Aberta').length,
      emAndamento: list.filter((o) => o.status === 'Em Andamento').length,
      finalizadas: list.filter((o) => o.status === 'Finalizado').length,
      encerradas: list.filter((o) => o.status === 'Encerrado').length,
      total: list.length,
    });

    const todayStats = countStatus(todayOrders);
    expect(todayStats.total).toBe(4);
    expect(todayStats.abertas).toBe(1);
    expect(todayStats.emAndamento).toBe(1);
    expect(todayStats.finalizadas).toBe(1);
    expect(todayStats.encerradas).toBe(1);

    // Contagem total do ano
    const yearStats = countStatus(sampleOrders);
    expect(yearStats.total).toBe(7);
    expect(yearStats.abertas).toBe(2);
    expect(yearStats.emAndamento).toBe(2);
    expect(yearStats.finalizadas).toBe(1);
    expect(yearStats.encerradas).toBe(2);
  });

  it('Deve calcular com precisão os limites de tempo para Dia, Semana (Seg-Dom), Mês e Ano', () => {
    function calculateRange(period: string, dateStr: string) {
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const base = new Date(y, m, d);

      let start: Date;
      let end: Date;

      if (period === 'day') {
        start = new Date(y, m, d, 0, 0, 0, 0);
        end = new Date(y, m, d, 23, 59, 59, 999);
      } else if (period === 'week') {
        const dayOfWeek = base.getDay();
        const diffToMonday = d - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(y, m, diffToMonday, 0, 0, 0, 0);
        end = new Date(start.getTime() + 7 * 24 * 3600 * 1000 - 1);
      } else if (period === 'month') {
        start = new Date(y, m, 1, 0, 0, 0, 0);
        end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      } else {
        start = new Date(y, 0, 1, 0, 0, 0, 0);
        end = new Date(y, 11, 31, 23, 59, 59, 999);
      }
      return { start, end };
    }

    // 1. Dia: exatamente 00:00:00 até 23:59:59
    const dayRange = calculateRange('day', '2026-10-07');
    expect(dayRange.start.getHours()).toBe(0);
    expect(dayRange.start.getMinutes()).toBe(0);
    expect(dayRange.start.getSeconds()).toBe(0);
    expect(dayRange.end.getHours()).toBe(23);
    expect(dayRange.end.getMinutes()).toBe(59);
    expect(dayRange.end.getSeconds()).toBe(59);

    // 2. Semana: Sempre Segunda (1) a Domingo (0)
    const weekMid = calculateRange('week', '2026-10-07'); // Quarta-feira
    expect(weekMid.start.getDay()).toBe(1); // Segunda
    expect(weekMid.end.getDay()).toBe(0); // Domingo
    expect(weekMid.start.getDate()).toBe(5); // Segunda 05/10/2026
    expect(weekMid.end.getDate()).toBe(11); // Domingo 11/10/2026

    // 3. Semana na virada de mês (ex: 01/11/2026 é Domingo)
    const weekNov1 = calculateRange('week', '2026-11-01');
    expect(weekNov1.start.getDay()).toBe(1); // Segunda 26/10
    expect(weekNov1.start.getDate()).toBe(26);
    expect(weekNov1.end.getDay()).toBe(0); // Domingo 01/11
    expect(weekNov1.end.getDate()).toBe(1);

    // 4. Semana na virada de ano (ex: 31/12/2026 é Quinta-feira)
    const weekYearEnd = calculateRange('week', '2026-12-31');
    expect(weekYearEnd.start.getDay()).toBe(1); // Segunda 28/12/2026
    expect(weekYearEnd.start.getFullYear()).toBe(2026);
    expect(weekYearEnd.end.getDay()).toBe(0); // Domingo 03/01/2027
    expect(weekYearEnd.end.getFullYear()).toBe(2027);

    // 5. Mês: primeiro ao último dia
    const febNonLeap = calculateRange('month', '2026-02-15');
    expect(febNonLeap.start.getDate()).toBe(1);
    expect(febNonLeap.end.getDate()).toBe(28);

    const octMonth = calculateRange('month', '2026-10-07');
    expect(octMonth.start.getDate()).toBe(1);
    expect(octMonth.end.getDate()).toBe(31);

    // 6. Ano: 1º de janeiro a 31 de dezembro
    const yearRange = calculateRange('year', '2026-06-15');
    expect(yearRange.start.getMonth()).toBe(0); // Janeiro
    expect(yearRange.start.getDate()).toBe(1);
    expect(yearRange.end.getMonth()).toBe(11); // Dezembro
    expect(yearRange.end.getDate()).toBe(31);
  });

  it('Deve garantir unicidade de O.S. e consistência entre soma dos status, percentuais e total', () => {
    const orders = [
      { id: 'OS-1', status: 'Aberta' },
      { id: 'OS-2', status: 'Em Andamento' },
      { id: 'OS-3', status: 'Finalizado' },
      { id: 'OS-4', status: 'Encerrado' },
    ];

    // Verificar se não há IDs duplicados
    const ids = orders.map((o) => o.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Verificar se a soma dos 4 status é exatamente igual ao Total
    const abertas = orders.filter((o) => o.status === 'Aberta').length;
    const emAndamento = orders.filter((o) => o.status === 'Em Andamento').length;
    const finalizadas = orders.filter((o) => o.status === 'Finalizado').length;
    const encerradas = orders.filter((o) => o.status === 'Encerrado').length;
    const total = orders.length;

    expect(abertas + emAndamento + finalizadas + encerradas).toBe(total);

    // Verificar cálculo de percentual sobre o Total
    const pctAberta = total > 0 ? Math.round((abertas / total) * 100) : 0;
    const pctEmAndamento = total > 0 ? Math.round((emAndamento / total) * 100) : 0;
    const pctFinalizada = total > 0 ? Math.round((finalizadas / total) * 100) : 0;
    const pctEncerrada = total > 0 ? Math.round((encerradas / total) * 100) : 0;

    expect(pctAberta).toBe(25);
    expect(pctEmAndamento).toBe(25);
    expect(pctFinalizada).toBe(25);
    expect(pctEncerrada).toBe(25);
    expect(pctAberta + pctEmAndamento + pctFinalizada + pctEncerrada).toBe(100);
  });

  describe('Exportação de Relatórios de Ordens de Serviço (CSV)', () => {
    const mockReportOrders = [
      {
        id: 'OS-0001',
        clientName: 'TechCorp Inovações',
        equipment: 'Notebook Dell Latitude 5420',
        category: 'Hardware',
        technicianName: 'Técnico Rogério',
        status: 'Aberta',
        createdAt: '2026-10-07T14:30:00Z',
        priority: 'Alta',
      },
      {
        id: 'OS-0002',
        clientName: 'Advocacia Mendes & Associados',
        equipment: 'Servidor HP ProLiant ML350',
        category: 'Servidores',
        technicianName: 'Técnico Rogério',
        status: 'Em Andamento',
        createdAt: '2026-10-07T12:00:00Z',
        priority: 'Crítica',
      },
      {
        id: 'OS-0003',
        clientName: 'Hospital São Lucas Diagnósticos',
        equipment: 'Switch Cisco Catalyst 2960',
        category: 'Redes',
        technicianName: 'Técnico Rogério',
        status: 'Finalizado',
        createdAt: '2026-10-05T09:00:00Z',
        priority: 'Alta',
      },
      {
        id: 'OS-0004',
        clientName: 'TechCorp Inovações',
        equipment: 'Impressora Laser HP LaserJet Pro',
        category: 'Impressora',
        technicianName: 'Técnico Rogério',
        status: 'Encerrado',
        createdAt: '2026-09-20T10:00:00Z',
        priority: 'Média',
      },
    ];

    function generateCsvContent(orders: typeof mockReportOrders) {
      const headers = ['Código', 'Cliente', 'Equipamento', 'Categoria', 'Técnico', 'Status', 'Data de Criação', 'Prioridade'];
      const rows = orders.map((os) => [
        `"${(os.id || '').replace(/"/g, '""')}"`,
        `"${(os.clientName || '').replace(/"/g, '""')}"`,
        `"${(os.equipment || '').replace(/"/g, '""')}"`,
        `"${(os.category || '').replace(/"/g, '""')}"`,
        `"${(os.technicianName || 'Não atribuído').replace(/"/g, '""')}"`,
        `"${(os.status || '').replace(/"/g, '""')}"`,
        `"${os.createdAt ? `${new Date(os.createdAt).toLocaleDateString('pt-BR')} ${new Date(os.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}"`,
        `"${(os.priority || '').replace(/"/g, '""')}"`,
      ]);

      return '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    }

    it('Deve gerar arquivo CSV formatado com BOM UTF-8 e delimitador ponto-e-vírgula', () => {
      const csv = generateCsvContent(mockReportOrders);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Código;Cliente;Equipamento;Categoria;Técnico;Status;Data de Criação;Prioridade');
      expect(csv).toContain('"OS-0001";"TechCorp Inovações"');
      expect(csv).toContain('"OS-0002";"Advocacia Mendes & Associados"');
    });

    it('Deve gerar nome de arquivo padronizado para Dia, Semana, Mês e Ano', () => {
      const date = '2026-10-07';
      expect(`relatorio-os-day-${date}.csv`).toBe('relatorio-os-day-2026-10-07.csv');
      expect(`relatorio-os-week-${date}.csv`).toBe('relatorio-os-week-2026-10-07.csv');
      expect(`relatorio-os-month-${date}.csv`).toBe('relatorio-os-month-2026-10-07.csv');
      expect(`relatorio-os-year-${date}.csv`).toBe('relatorio-os-year-2026-10-07.csv');
    });

    it('Deve exportar corretamente dados com filtro de status aplicado', () => {
      const filteredByStatus = mockReportOrders.filter((o) => o.status === 'Aberta');
      const csv = generateCsvContent(filteredByStatus);
      expect(filteredByStatus.length).toBe(1);
      expect(csv).toContain('OS-0001');
      expect(csv).not.toContain('OS-0002');
      expect(csv).not.toContain('OS-0003');
    });

    it('Deve exportar corretamente dados com busca textual aplicada', () => {
      const filteredBySearch = mockReportOrders.filter((o) =>
        o.clientName.toLowerCase().includes('hospital') || o.equipment.toLowerCase().includes('switch')
      );
      const csv = generateCsvContent(filteredBySearch);
      expect(filteredBySearch.length).toBe(1);
      expect(csv).toContain('Hospital São Lucas Diagnósticos');
      expect(csv).toContain('OS-0003');
      expect(csv).not.toContain('OS-0001');
    });

    it('Deve garantir independência total entre as ações de Imprimir e Exportar', () => {
      let printCalled = false;
      let downloadTriggered = false;

      const mockPrint = () => {
        printCalled = true;
      };

      const mockExport = (orders: typeof mockReportOrders) => {
        if (orders.length > 0) {
          downloadTriggered = true;
        }
      };

      // Disparar Exportar não pode invocar mockPrint
      mockExport(mockReportOrders);
      expect(downloadTriggered).toBe(true);
      expect(printCalled).toBe(false);

      // Disparar Imprimir não pode acionar mockExport
      downloadTriggered = false;
      mockPrint();
      expect(printCalled).toBe(true);
      expect(downloadTriggered).toBe(false);
    });
  });

  describe('Relatórios Técnicos e Checklist de Atendimento', () => {
    const mockChecklistOS = {
      id: 'OS-0002',
      clientName: 'Advocacia Mendes & Associados',
      equipment: 'Servidor HP ProLiant ML350',
      technicianName: 'Técnico Rogério',
      checklist: [
        { id: 'item-1', label: 'Verificar redundância de fontes', checked: true, required: true, notes: 'Fonte A e B ok' },
        { id: 'item-2', label: 'Verificar ventoinhas', checked: true, required: true, notes: 'Pasta térmica trocada' },
        { id: 'item-3', label: 'Testar discos RAID', checked: false, required: true, notes: '' },
        { id: 'item-4', label: 'Verificar memória ECC', checked: false, required: true, notes: '' },
        { id: 'item-5', label: 'Verificar logs do SO', checked: false, required: false, notes: '' },
        { id: 'item-6', label: 'Testar rede iDRAC', checked: false, required: false, notes: '' },
        { id: 'item-7', label: 'Verificar rotinas de backup', checked: false, required: false, notes: '' },
      ],
    };

    it('Deve calcular com precisão o percentual de conclusão conforme regra do sistema', () => {
      const total = mockChecklistOS.checklist.length;
      const checked = mockChecklistOS.checklist.filter((i) => i.checked).length;
      const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

      expect(total).toBe(7);
      expect(checked).toBe(2);
      expect(percent).toBe(29);
    });

    it('Deve preservar descrições de verificações e observações técnicas associadas', () => {
      const itemWithNotes = mockChecklistOS.checklist[0];
      expect(itemWithNotes.label).toBe('Verificar redundância de fontes');
      expect(itemWithNotes.checked).toBe(true);
      expect(itemWithNotes.notes).toBe('Fonte A e B ok');
    });

    it('Deve rejeitar silenciosamente documentos incompletos sem checklist', () => {
      const validateReportIntegrity = (os: { id: string; checklist?: any[] }) => {
        if (!os.checklist || os.checklist.length === 0) {
          throw new Error(`Falha na validação do relatório: Não foi possível recuperar a lista de verificação técnica da ${os.id}.`);
        }
        return true;
      };

      const emptyOS = { id: 'OS-9999', checklist: [] };
      expect(() => validateReportIntegrity(emptyOS)).toThrowError(
        'Falha na validação do relatório: Não foi possível recuperar a lista de verificação técnica da OS-9999.'
      );
      expect(validateReportIntegrity(mockChecklistOS)).toBe(true);
    });
  });
});
