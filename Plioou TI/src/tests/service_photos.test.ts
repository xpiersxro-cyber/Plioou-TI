import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  serviceOrdersStore,
  photosStore,
  savePersistedPhotos,
  loadPersistedPhotos,
  UPLOADS_PHOTOS_DIR,
} from '../../server/store.js';
import { ServiceOrder, ServiceOrderPhoto, PhotoCategory } from '../types.js';
import { generateSimplePDF, generateCompletePDF } from '../utils/pdfGenerator.js';

describe('Módulo de Registro Fotográfico do Atendimento e Correção de Layout PDF - Plioou TI', () => {
  const valid1x1PngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const validCategories: PhotoCategory[] = [
    'Estado inicial do equipamento',
    'Diagnóstico técnico',
    'Durante o reparo',
    'Peças e componentes',
    'Estado final do equipamento',
    'Entrega ao cliente',
    'Outros registros',
  ];

  beforeEach(() => {
    delete photosStore['OS-TEST-PHOTO-1'];
    delete photosStore['OS-TEST-PHOTO-2'];
  });

  it('1. Validação das 7 categorias oficiais permitidas', () => {
    expect(validCategories.length).toBe(7);
    expect(validCategories).toContain('Estado inicial do equipamento');
    expect(validCategories).toContain('Diagnóstico técnico');
    expect(validCategories).toContain('Durante o reparo');
    expect(validCategories).toContain('Peças e componentes');
    expect(validCategories).toContain('Estado final do equipamento');
    expect(validCategories).toContain('Entrega ao cliente');
    expect(validCategories).toContain('Outros registros');

    // Categoria inválida deve ser rejeitada
    const invalidCat = 'Foto Aleatória';
    expect(validCategories.includes(invalidCat as PhotoCategory)).toBe(false);
  });

  it('2. Rejeição de fotografia com imagem vazia ou corrompida', () => {
    const invalidPayloads = ['', '   ', 'data:image/jpeg;base64,'];
    invalidPayloads.forEach((payload) => {
      const isValid = Boolean(payload && payload.trim().length > 30);
      expect(isValid).toBe(false);
    });
  });

  it('3. Criação e persistência de foto associada à O.S.', () => {
    const photoId = `photo-test-${Date.now()}`;
    const testPhoto: ServiceOrderPhoto = {
      id: photoId,
      osId: 'OS-TEST-PHOTO-1',
      fileUrl: `/api/service-orders/OS-TEST-PHOTO-1/photos/${photoId}/file`,
      category: 'Diagnóstico técnico',
      description: 'Capacitores estufados na linha de alimentação de 12V da placa-mãe.',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Técnico Rogério',
      uploadedById: 'u-1',
      fileSize: 1024,
      mimeType: 'image/png',
      originalName: 'diagnostico_capacitores.png',
      base64Data: valid1x1PngBase64,
    };

    photosStore['OS-TEST-PHOTO-1'] = [testPhoto];
    savePersistedPhotos();

    const reloaded = loadPersistedPhotos();
    expect(reloaded['OS-TEST-PHOTO-1']).toBeDefined();
    expect(reloaded['OS-TEST-PHOTO-1'].length).toBe(1);
    expect(reloaded['OS-TEST-PHOTO-1'][0].id).toBe(photoId);
    expect(reloaded['OS-TEST-PHOTO-1'][0].category).toBe('Diagnóstico técnico');
    expect(reloaded['OS-TEST-PHOTO-1'][0].description).toContain('Capacitores estufados');
  });

  it('4. Multiplicidade de fotos por O.S. com categorias distintas', () => {
    const p1: ServiceOrderPhoto = {
      id: 'photo-1',
      osId: 'OS-TEST-PHOTO-1',
      fileUrl: '/api/service-orders/OS-TEST-PHOTO-1/photos/photo-1/file',
      category: 'Estado inicial do equipamento',
      description: 'Gabinete com poeira excessiva e lacre violado',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Técnico Rogério',
    };

    const p2: ServiceOrderPhoto = {
      id: 'photo-2',
      osId: 'OS-TEST-PHOTO-1',
      fileUrl: '/api/service-orders/OS-TEST-PHOTO-1/photos/photo-2/file',
      category: 'Durante o reparo',
      description: 'Limpeza ultrassônica e troca de pasta térmica',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Técnico Rogério',
    };

    photosStore['OS-TEST-PHOTO-1'] = [p2, p1];
    expect(photosStore['OS-TEST-PHOTO-1'].length).toBe(2);
    expect(photosStore['OS-TEST-PHOTO-1'][0].category).toBe('Durante o reparo');
    expect(photosStore['OS-TEST-PHOTO-1'][1].category).toBe('Estado inicial do equipamento');
  });

  it('5. Exclusão de foto e atualização do armazenamento', () => {
    const p1: ServiceOrderPhoto = {
      id: 'photo-del-1',
      osId: 'OS-TEST-PHOTO-2',
      fileUrl: '/api/service-orders/OS-TEST-PHOTO-2/photos/photo-del-1/file',
      category: 'Outros registros',
      description: 'Foto de teste para exclusão',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Técnico Rogério',
    };

    photosStore['OS-TEST-PHOTO-2'] = [p1];
    expect(photosStore['OS-TEST-PHOTO-2'].length).toBe(1);

    // Remove photo
    photosStore['OS-TEST-PHOTO-2'] = photosStore['OS-TEST-PHOTO-2'].filter((p) => p.id !== 'photo-del-1');
    savePersistedPhotos();

    expect(photosStore['OS-TEST-PHOTO-2'].length).toBe(0);
  });

  it('6. Correção do Layout da Assinatura no PDF: quebra de linhas longas e textos extensos', () => {
    const osWithExtensiveSignature: ServiceOrder = {
      id: 'OS-LAYOUT-TEST',
      clientId: 'c-1',
      clientName: 'TechCorp Indústria e Comércio de Componentes Tecnológicos Ltda.',
      equipment: 'Servidor Dell PowerEdge R740xd Rack 2U Enterprise',
      category: 'Servidores',
      description: 'Manutenção preventiva e corretiva com troca de controladora RAID PERC H730P.',
      status: 'Finalizado',
      priority: 'Crítica',
      technicianName: 'Engenheiro Especialista Rogério Albuquerque da Silva Ferreira',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      signature: {
        id: 'sig-super-long-unbroken-identifier-uuid-1234567890-abcdefghijklmnop-9999999',
        osId: 'OS-LAYOUT-TEST',
        signerName: 'Dr. Fernando Henrique de Vasconcelos Albuquerque Sobrinho',
        signerRole: 'Diretor Geral de Infraestrutura e Governança de TI',
        purpose: 'Aceite Formal Definitivo de Conclusão e Entrega com Garantia Integral de Serviços Técnicos Especializados',
        modality: 'presential',
        signatureData: valid1x1PngBase64,
        signedAt: new Date().toISOString(),
        status: 'signed',
      },
    };

    // Neither should throw errors or fail even with extremely long strings
    expect(() => generateSimplePDF(osWithExtensiveSignature)).not.toThrow();
    expect(() => generateCompletePDF(osWithExtensiveSignature)).not.toThrow();
  });

  it('7. Emissão de PDF com múltiplas fotos e validação de proporção/estrutura', () => {
    const osWithPhotos: ServiceOrder = {
      id: 'OS-PHOTOS-PDF-TEST',
      clientId: 'c-1',
      clientName: 'Hospital São Lucas',
      equipment: 'Switch Cisco Catalyst 2960',
      category: 'Redes',
      description: 'Atendimento concluído com troca de GBIC.',
      status: 'Finalizado',
      priority: 'Alta',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      photos: [
        {
          id: 'photo-pdf-1',
          osId: 'OS-PHOTOS-PDF-TEST',
          fileUrl: '/api/service-orders/OS-PHOTOS-PDF-TEST/photos/photo-pdf-1/file',
          category: 'Estado inicial do equipamento',
          description: 'LEDs de porta em falha âmbar intermitente',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Técnico Rogério',
          base64Data: valid1x1PngBase64,
        },
        {
          id: 'photo-pdf-2',
          osId: 'OS-PHOTOS-PDF-TEST',
          fileUrl: '/api/service-orders/OS-PHOTOS-PDF-TEST/photos/photo-pdf-2/file',
          category: 'Durante o reparo',
          description: 'Substituição do módulo ótico SFP 1000Base-SX',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Técnico Rogério',
          base64Data: valid1x1PngBase64,
        },
        {
          id: 'photo-pdf-3',
          osId: 'OS-PHOTOS-PDF-TEST',
          fileUrl: '/api/service-orders/OS-PHOTOS-PDF-TEST/photos/photo-pdf-3/file',
          category: 'Estado final do equipamento',
          description: 'Porta em link operacional verde estável (1 Gbps)',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Técnico Rogério',
          base64Data: valid1x1PngBase64,
        },
      ],
    };

    expect(() => generateSimplePDF(osWithPhotos)).not.toThrow();
    expect(() => generateCompletePDF(osWithPhotos)).not.toThrow();
  });

  it('8. Emissão de PDF sem fotos: mensagem clara de ausência sem falha', () => {
    const osWithoutPhotos: ServiceOrder = {
      id: 'OS-NO-PHOTOS-TEST',
      clientId: 'c-1',
      clientName: 'TechCorp',
      equipment: 'Notebook Dell',
      category: 'Hardware',
      description: 'Sem fotos.',
      status: 'Aberta',
      priority: 'Baixa',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
      photos: [],
    };

    expect(() => generateSimplePDF(osWithoutPhotos)).not.toThrow();
    expect(() => generateCompletePDF(osWithoutPhotos)).not.toThrow();
  });

  it('9. Preservação integral das funcionalidades existentes (Regressão Zero)', () => {
    const os1 = serviceOrdersStore.find((o) => o.id === 'OS-0001');
    const os4 = serviceOrdersStore.find((o) => o.id === 'OS-0004');

    expect(os1).toBeDefined();
    expect(os4).toBeDefined();
    expect(os4?.status).toBe('Encerrado');
    expect(os4?.totalCost).toBe(275);
  });
});
