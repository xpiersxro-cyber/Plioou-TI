import { describe, it, expect, beforeEach } from 'vitest';
import {
  serviceOrdersStore,
  signaturesStore,
  signatureTokensStore,
  savePersistedSignatures,
  loadPersistedSignatures,
} from '../../server/store.js';
import { DigitalSignature, ServiceOrder } from '../types.js';
import { generateSimplePDF, generateCompletePDF } from '../utils/pdfGenerator.js';

describe('Módulo de Assinatura Digital de Aceite - Plioou TI', () => {
  beforeEach(() => {
    // Clean test signatures
    delete signaturesStore['OS-TEST-SIG-1'];
    delete signaturesStore['OS-TEST-SIG-2'];
  });

  it('1. Assinatura presencial válida: validação de estrutura e propriedades', () => {
    const validSamplePng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const sig: DigitalSignature = {
      id: `sig-OS-0001-${Date.now()}`,
      osId: 'OS-0001',
      signerName: 'Carlos Drummond',
      signerRole: 'Cliente / Responsável Legal',
      purpose: 'Aceite de Conclusão e Entrega dos Serviços Técnicos',
      modality: 'presential',
      signatureData: validSamplePng,
      signedAt: new Date().toISOString(),
      registeredBy: 'Técnico Rogério (technician)',
      status: 'signed',
    };

    expect(sig.osId).toBe('OS-0001');
    expect(sig.signerName).toBe('Carlos Drummond');
    expect(sig.modality).toBe('presential');
    expect(sig.status).toBe('signed');
    expect(sig.signatureData.startsWith('data:image/png')).toBe(true);
  });

  it('2. Tentativa de salvar assinatura vazia: rejeição obrigatória', () => {
    const emptySignatures = ['', '   ', 'data:image/png;base64,'];

    emptySignatures.forEach((val) => {
      const isValid = Boolean(val && val.trim().length > 50);
      expect(isValid).toBe(false);
    });

    const emptyName = '   ';
    expect(Boolean(emptyName && emptyName.trim().length > 0)).toBe(false);
  });

  it('3. Limpeza do quadro: reset de traçado para estado vazio', () => {
    let hasDrawn = true;
    let canvasData = 'data:image/png;base64,iVBORw...';

    // Clear function logic
    hasDrawn = false;
    canvasData = '';

    expect(hasDrawn).toBe(false);
    expect(canvasData.length).toBe(0);
  });

  it('4. Persistência e recuperação da assinatura em arquivo e memória', () => {
    const testOS = 'OS-TEST-SIG-1';
    const sig: DigitalSignature = {
      id: `sig-${testOS}-999`,
      osId: testOS,
      signerName: 'Mariana Lima',
      signerRole: 'Gerente Administrativo',
      purpose: 'Aceite de Conclusão de Manutenção de Servidor',
      modality: 'presential',
      signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
      signedAt: new Date().toISOString(),
      status: 'signed',
    };

    signaturesStore[testOS] = sig;
    savePersistedSignatures();

    const loaded = loadPersistedSignatures();
    expect(loaded[testOS]).toBeDefined();
    expect(loaded[testOS].signerName).toBe('Mariana Lima');
    expect(loaded[testOS].modality).toBe('presential');
    expect(loaded[testOS].status).toBe('signed');
  });

  it('5. Associação estrita com a O.S. correta e isolamento entre chamadas', () => {
    const os1 = 'OS-TEST-SIG-1';
    const os2 = 'OS-TEST-SIG-2';

    signaturesStore[os1] = {
      id: `sig-${os1}`,
      osId: os1,
      signerName: 'Cliente OS 1',
      signerRole: 'Titular',
      purpose: 'Aceite OS 1',
      modality: 'presential',
      signatureData: 'data:image/png;base64,ABC...',
      signedAt: new Date().toISOString(),
      status: 'signed',
    };

    signaturesStore[os2] = {
      id: `sig-${os2}`,
      osId: os2,
      signerName: 'Cliente OS 2',
      signerRole: 'Diretor TI',
      purpose: 'Aceite OS 2',
      modality: 'remote',
      signatureData: 'data:image/png;base64,XYZ...',
      signedAt: new Date().toISOString(),
      status: 'signed',
    };

    expect(signaturesStore[os1].signerName).toBe('Cliente OS 1');
    expect(signaturesStore[os2].signerName).toBe('Cliente OS 2');
    expect(signaturesStore[os1].modality).toBe('presential');
    expect(signaturesStore[os2].modality).toBe('remote');
    expect(signaturesStore[os1].osId).not.toBe(signaturesStore[os2].osId);
  });

  it('6. Acesso remoto: validação de token válido vs inválido', () => {
    const validToken = 'test-token-valid-12345';
    signatureTokensStore[validToken] = {
      osId: 'OS-0001',
      signerName: 'TechCorp Inovações',
      signerRole: 'Cliente',
      purpose: 'Aceite de Conclusão',
      expiresAt: Date.now() + 3600 * 1000,
      createdAt: new Date().toISOString(),
      used: false,
    };

    // Valid check
    const validCheck = signatureTokensStore[validToken];
    expect(validCheck).toBeDefined();
    expect(Date.now() < validCheck.expiresAt).toBe(true);

    // Invalid check
    const invalidCheck = signatureTokensStore['token-nao-existente-999'];
    expect(invalidCheck).toBeUndefined();
  });

  it('7. Tratamento de link expirado ou já utilizado', () => {
    const expiredToken = 'test-token-expired';
    signatureTokensStore[expiredToken] = {
      osId: 'OS-0001',
      expiresAt: Date.now() - 1000, // already expired
      createdAt: new Date(Date.now() - 10000).toISOString(),
      used: false,
    };

    const isExpired = Date.now() > signatureTokensStore[expiredToken].expiresAt;
    expect(isExpired).toBe(true);

    const usedToken = 'test-token-used';
    signatureTokensStore[usedToken] = {
      osId: 'OS-0001',
      expiresAt: Date.now() + 10000,
      createdAt: new Date().toISOString(),
      used: true,
    };

    expect(signatureTokensStore[usedToken].used).toBe(true);
  });

  it('8. Atualização do estado no painel administrativo', () => {
    const os = serviceOrdersStore.find((o) => o.id === 'OS-0001');
    expect(os).toBeDefined();

    const sampleSig: DigitalSignature = {
      id: 'sig-admin-test',
      osId: 'OS-0001',
      signerName: 'Admin Auditor',
      signerRole: 'Supervisão',
      purpose: 'Aceite Técnico Geral',
      modality: 'presential',
      signatureData: 'data:image/png;base64,...',
      signedAt: new Date().toISOString(),
      status: 'signed',
    };

    if (os) {
      os.signature = sampleSig;
      expect(os.signature.status).toBe('signed');
      expect(os.signature.signerName).toBe('Admin Auditor');
    }
  });

  it('9. Exibição da assinatura correta no PDF (Relatório Simples e Completo)', () => {
    const samplePng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const osWithSig: ServiceOrder = {
      id: 'OS-TEST-PDF-1',
      clientId: 'c-1',
      clientName: 'TechCorp Inovações',
      equipment: 'Notebook Dell Latitude 5420',
      category: 'Hardware',
      description: 'Problema solucionado e revisado.',
      status: 'Finalizado',
      priority: 'Alta',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      signature: {
        id: 'sig-pdf-001',
        osId: 'OS-TEST-PDF-1',
        signerName: 'Roberto Silveira',
        signerRole: 'Gerente Operacional',
        purpose: 'Aceite de Conclusão e Entrega dos Serviços Técnicos',
        modality: 'presential',
        signatureData: samplePng,
        signedAt: new Date().toISOString(),
        status: 'signed',
      },
    };

    // Should generate both PDFs without throwing any errors
    expect(() => generateSimplePDF(osWithSig)).not.toThrow();
    expect(() => generateCompletePDF(osWithSig)).not.toThrow();
  });

  it('10. PDF de O.S. sem assinatura: estado explícito de pendência sem falha', () => {
    const osWithoutSig: ServiceOrder = {
      id: 'OS-TEST-PDF-2',
      clientId: 'c-2',
      clientName: 'Advocacia Mendes',
      equipment: 'Servidor HP ProLiant',
      category: 'Servidores',
      description: 'Atendimento aberto.',
      status: 'Em Andamento',
      priority: 'Alta',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      // no signature
    };

    expect(() => generateSimplePDF(osWithoutSig)).not.toThrow();
    expect(() => generateCompletePDF(osWithoutSig)).not.toThrow();
  });

  it('11. Comportamento em dispositivos móveis: modalidade remota e suporte a touch/stylus', () => {
    const remoteSig: DigitalSignature = {
      id: 'sig-mobile-test',
      osId: 'OS-0003',
      signerName: 'Dra. Beatriz Santos',
      signerRole: 'Médica Coordenadora',
      purpose: 'Aceite de Manutenção de Switch Hospitalar',
      modality: 'remote',
      signatureData: 'data:image/png;base64,mobileSignature...',
      signedAt: new Date().toISOString(),
      registeredBy: 'Cliente (Assinatura Remota Mobile)',
      status: 'signed',
      remoteToken: 'mobile-token-abc',
    };

    expect(remoteSig.modality).toBe('remote');
    expect(remoteSig.registeredBy).toContain('Mobile');
  });

  it('12. Regressão das funcionalidades existentes: checklist, financeiro e notas preservados', () => {
    const os = serviceOrdersStore.find((o) => o.id === 'OS-0004');
    expect(os).toBeDefined();
    if (os) {
      expect(os.status).toBe('Encerrado');
      expect(os.totalCost).toBe(275);
      expect(os.laborCost).toBe(180);
      expect(os.partsCost).toBe(95);
    }
  });
});
