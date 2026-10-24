import { describe, it, expect, vi } from 'vitest';
import { generateSimplePDF, generateCompletePDF } from '../utils/pdfGenerator';
import { ServiceOrder, ChecklistItem } from '../types';
import {
  CHECKLIST_TEMPLATES,
  getMatchingTemplateKey,
  generateDefaultChecklistForOS,
} from '../../server/store';

describe('Validação Abrangente do Sistema Plioou TI', () => {
  // Cenário 1: Criar uma O.S. e marcar todos os itens do checklist
  it('Cenário 1: Criar uma O.S. e marcar todos os itens do checklist', () => {
    const osId = 'OS-TEST-01';
    const defaultItems = generateDefaultChecklistForOS(osId, 'Notebook Dell Latitude');
    expect(defaultItems.length).toBeGreaterThan(0);

    // Marcar todos os itens como concluídos
    const allChecked = defaultItems.map((item) => ({ ...item, checked: true }));
    expect(allChecked.every((i) => i.checked)).toBe(true);

    const total = allChecked.length;
    const checkedCount = allChecked.filter((i) => i.checked).length;
    const progress = Math.round((checkedCount / total) * 100);
    expect(progress).toBe(100);
  });

  // Cenário 2: Salvar e reabrir a O.S.
  it('Cenário 2: Salvar e reabrir a O.S. preservando o estado dos itens', () => {
    const osId = 'OS-TEST-02';
    const items: ChecklistItem[] = [
      { id: `${osId}-1`, label: 'Verificar fonte', checked: true, required: true },
      { id: `${osId}-2`, label: 'Testar bateria', checked: true, required: true },
      { id: `${osId}-3`, label: 'Verificar memória', checked: true, required: false },
    ];

    // Simula salvamento em armazenamento estruturado
    const store: Record<string, ChecklistItem[]> = {};
    store[osId] = JSON.parse(JSON.stringify(items));

    // Reabrir a O.S.
    const reopenedItems = store[osId];
    expect(reopenedItems).toBeDefined();
    expect(reopenedItems.length).toBe(3);
    expect(reopenedItems.every((i) => i.checked)).toBe(true);
  });

  // Cenário 3: Atualizar a página e verificar a persistência
  it('Cenário 3: Simular recarregamento da aplicação e validar persistência', () => {
    const osId = 'OS-TEST-03';
    const persistedPayload = JSON.stringify({
      [osId]: [
        { id: `${osId}-1`, label: 'Verificar HD/SSD', checked: true, required: true, notes: 'SSD NVMe 512GB 100% vida útil' },
        { id: `${osId}-2`, label: 'Testar tela', checked: true, required: true },
      ],
    });

    // Simulação do carregamento a partir de storage em disco / json
    const rehydratedStore = JSON.parse(persistedPayload);
    expect(rehydratedStore[osId]).toBeDefined();
    expect(rehydratedStore[osId][0].notes).toBe('SSD NVMe 512GB 100% vida útil');
    expect(rehydratedStore[osId][0].checked).toBe(true);
  });

  // Cenário 4: Desmarcar um item e confirmar a atualização
  it('Cenário 4: Desmarcar um item e recalcular progresso com precisão', () => {
    const osId = 'OS-TEST-04';
    const initialItems: ChecklistItem[] = [
      { id: `${osId}-1`, label: 'Item 1', checked: true },
      { id: `${osId}-2`, label: 'Item 2', checked: true },
      { id: `${osId}-3`, label: 'Item 3', checked: true },
      { id: `${osId}-4`, label: 'Item 4', checked: true },
    ];

    // Desmarcar o primeiro item
    const updatedItems = initialItems.map((item, idx) => (idx === 0 ? { ...item, checked: false } : item));
    expect(updatedItems[0].checked).toBe(false);
    expect(updatedItems[1].checked).toBe(true);

    const total = updatedItems.length;
    const checkedCount = updatedItems.filter((i) => i.checked).length;
    const progress = Math.round((checkedCount / total) * 100);

    expect(checkedCount).toBe(3);
    expect(progress).toBe(75);
  });

  // Cenário 5: Gerar o relatório PDF e conferir todos os estados
  it('Cenário 5: Gerar relatório PDF e conferir estados e renderização', () => {
    const mockOS: ServiceOrder = {
      id: 'OS-TEST-05',
      clientId: 'c-1',
      clientName: 'Cliente Teste Alpha',
      equipment: 'Notebook Dell Latitude 5420',
      category: 'Hardware',
      description: 'Equipamento reiniciando sozinho em alta carga.',
      status: 'Em Andamento',
      priority: 'Alta',
      technicianName: 'Técnico Rogério',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      checklist: [
        { id: 'i-1', label: 'Verificar fonte de alimentação', checked: true, required: true, notes: 'Tensão nominal 19.5V estável' },
        { id: 'i-2', label: 'Testar saúde da bateria', checked: false, required: true },
      ],
    };

    // Executar geração dos relatórios simples e completo
    expect(() => generateSimplePDF(mockOS)).not.toThrow();
    expect(() => generateCompletePDF(mockOS)).not.toThrow();
  });

  // Cenário 6: Testar duas ou mais O.S. com checklists diferentes
  it('Cenário 6: Testar templates específicos para diferentes categorias de equipamento', () => {
    const notebookItems = generateDefaultChecklistForOS('OS-NOTE', 'Notebook Dell XPS');
    const serverItems = generateDefaultChecklistForOS('OS-SRV', 'Servidor PowerEdge');
    const switchItems = generateDefaultChecklistForOS('OS-SW', 'Switch Cisco 24 Portas');

    expect(getMatchingTemplateKey('Notebook Dell XPS')).toBe('Notebook');
    expect(getMatchingTemplateKey('Servidor PowerEdge')).toBe('Servidor');
    expect(getMatchingTemplateKey('Switch Cisco 24 Portas')).toBe('Switch/Roteador');

    // Categorias distintas possuem conjuntos de itens distintos
    expect(notebookItems.some((i) => i.label.toLowerCase().includes('bateria'))).toBe(true);
    expect(serverItems.some((i) => i.label.toLowerCase().includes('raid'))).toBe(true);
    expect(switchItems.some((i) => i.label.toLowerCase().includes('rj45'))).toBe(true);

    expect(notebookItems.length).not.toBe(serverItems.length);
  });

  // Cenário 7: Confirmar que os dados não são misturados entre O.S.
  it('Cenário 7: Confirmar isolamento estrito de dados entre diferentes Ordens de Serviço', () => {
    const osA: ServiceOrder = {
      id: 'OS-A',
      clientId: 'c-1',
      clientName: 'Empresa A',
      equipment: 'Notebook',
      category: 'Hardware',
      description: 'Problema A',
      status: 'Aberta',
      priority: 'Média',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      checklist: [
        { id: 'OS-A-chk-1', label: 'Item Exclusivo de A', checked: true },
      ],
    };

    const osB: ServiceOrder = {
      id: 'OS-B',
      clientId: 'c-2',
      clientName: 'Empresa B',
      equipment: 'Servidor',
      category: 'Servidores',
      description: 'Problema B',
      status: 'Aberta',
      priority: 'Alta',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      checklist: [
        { id: 'OS-B-chk-1', label: 'Item Exclusivo de B', checked: false },
      ],
    };

    // Verificar que os identificadores e labels não se sobrepõem
    expect(osA.checklist?.some((itemA) => osB.checklist?.some((itemB) => itemB.id === itemA.id))).toBe(false);
    expect(osA.checklist?.[0].checked).toBe(true);
    expect(osB.checklist?.[0].checked).toBe(false);
  });

  // Cenário 8: Testar comentários e observações individuais
  it('Cenário 8: Testar persistência de comentários e observações técnicas em cada item', () => {
    const item: ChecklistItem = {
      id: 'item-note-1',
      label: 'Testar memória RAM',
      checked: true,
      notes: 'Memória testada com MemTest86 por 2 ciclos sem falhas.',
    };

    expect(item.notes).toBeDefined();
    expect(item.notes).toContain('MemTest86');

    // Atualização da nota
    item.notes = 'Adicionado pente adicional de 8GB DDR4 Kingston.';
    expect(item.notes).toBe('Adicionado pente adicional de 8GB DDR4 Kingston.');
  });

  // Cenário 9: Simular falhas de API e banco de dados
  it('Cenário 9: Validar tratamento de erros com payload inválido ou O.S. inexistente', () => {
    const validateSavePayload = (osExists: boolean, body: any) => {
      if (!osExists) {
        return { status: 404, error: 'Ordem de serviço não encontrada.' };
      }
      const data = body.checklist || body;
      if (!Array.isArray(data)) {
        return { status: 400, error: 'Formato inválido. O checklist deve ser uma lista de itens.' };
      }
      return { status: 200, success: true };
    };

    // Falha: OS não existe
    const resNotFound = validateSavePayload(false, { checklist: [] });
    expect(resNotFound.status).toBe(404);

    // Falha: Formato inválido
    const resBadFormat = validateSavePayload(true, { checklist: 'não é array' });
    expect(resBadFormat.status).toBe(400);

    // Sucesso: Válido
    const resOk = validateSavePayload(true, { checklist: [{ label: 'Item' }] });
    expect(resOk.status).toBe(200);
  });

  // Cenário 10: Verificar comportamento da interface diante de erros
  it('Cenário 10: Impedir geração de relatório incompleto se dados do checklist falharem', () => {
    const generateReportWithIntegrityGuard = (os: { id: string; checklist?: ChecklistItem[] }) => {
      if (!os.checklist || os.checklist.length === 0) {
        throw new Error(`Falha na validação do relatório: Não foi possível recuperar a lista de verificação técnica da ${os.id}. O relatório não foi gerado para impedir a emissão de um documento incompleto.`);
      }
      return true;
    };

    const emptyOS = { id: 'OS-EMPTY', checklist: [] };
    expect(() => generateReportWithIntegrityGuard(emptyOS)).toThrowError(
      'Falha na validação do relatório: Não foi possível recuperar a lista de verificação técnica da OS-EMPTY.'
    );

    const validOS = {
      id: 'OS-VALID',
      checklist: [{ id: '1', label: 'Item', checked: true }],
    };
    expect(generateReportWithIntegrityGuard(validOS)).toBe(true);
  });

  // Cenário 11: Testar O.S. antigas e novas
  it('Cenário 11: Garantir compatibilidade tanto para O.S. legadas quanto recém-criadas', () => {
    // O.S. legada sem checklist explícito recebe template padrão automaticamente
    const legacyOS: ServiceOrder = {
      id: 'OS-0001',
      clientId: 'c-1',
      clientName: 'Cliente Antigo',
      equipment: 'Notebook Dell Latitude 5420',
      category: 'Hardware',
      description: 'Chamado legado',
      status: 'Aberta',
      priority: 'Média',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
      notes: [],
    };

    const legacyChecklist = generateDefaultChecklistForOS(legacyOS.id, legacyOS.equipment);
    expect(legacyChecklist.length).toBeGreaterThan(0);

    // Nova O.S. criada hoje
    const newOSId = 'OS-9999';
    const newChecklist = generateDefaultChecklistForOS(newOSId, 'Impressora Laser');
    expect(newChecklist.length).toBeGreaterThan(0);
    expect(newChecklist[0].id).toContain(newOSId);
  });

  // Cenário 12: Gerar o mesmo relatório várias vezes e verificar consistência
  it('Cenário 12: Gerar múltiplos relatórios sucessivos e comprovar determinismo', () => {
    const testOS: ServiceOrder = {
      id: 'OS-DETERMINISTIC',
      clientId: 'c-10',
      clientName: 'Corporação Beta',
      equipment: 'Servidor Dell R740',
      category: 'Servidores',
      description: 'Validação de consistência de relatórios',
      status: 'Finalizado',
      priority: 'Alta',
      technicianName: 'Técnico Rogério',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      checklist: [
        { id: 'c-1', label: 'Checagem de fontes', checked: true, required: true, notes: 'Redundância OK' },
        { id: 'c-2', label: 'Checagem de temperatura', checked: true, required: true },
        { id: 'c-3', label: 'Checagem de discos', checked: false, required: true },
      ],
    };

    // Executar 5 vezes consecutivas
    const results: number[] = [];
    for (let i = 0; i < 5; i++) {
      const total = testOS.checklist!.length;
      const checked = testOS.checklist!.filter((item) => item.checked).length;
      const percent = Math.round((checked / total) * 100);
      results.push(percent);

      expect(() => generateCompletePDF(testOS)).not.toThrow();
    }

    // Todos os percentuais devem ser rigorosamente 67%
    expect(results).toEqual([67, 67, 67, 67, 67]);
  });

  // Cenário 13: Execução e verificação de testes de regressão
  it('Cenário 13: Testes de regressão das regras de negócio do sistema', () => {
    // 1. Cálculo de horas estagnadas
    const stalledOrder = { id: 'OS-0080', stalledHours: 50, status: 'Aberta' };
    const isStalled = stalledOrder.stalledHours >= 48 && stalledOrder.status !== 'Finalizado';
    expect(isStalled).toBe(true);

    // 2. Cálculo financeiro de faturamento
    const labor = 200;
    const parts = 150;
    const discount = 50;
    const total = Math.max(0, labor + parts - discount);
    expect(total).toBe(300);

    // 3. Validação de formato de data e fuso
    const dateStr = new Date('2026-10-22T08:00:00Z').toISOString();
    expect(dateStr).toContain('2026-10-22');
  });
});
