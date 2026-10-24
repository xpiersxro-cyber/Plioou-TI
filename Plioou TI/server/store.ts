import { User, Client, ServiceOrder, AuditLog, Notification, DashboardStats, TechProductivity, ChecklistItem, DigitalSignature, ServiceOrderPhoto } from '../src/types.js';
import pg from 'pg';
import dns from 'dns';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const dnsLookup = promisify(dns.lookup);
const { Pool } = pg;

export let pgPool: pg.Pool | null = null;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CHECKLISTS_FILE = path.join(DATA_DIR, 'checklists.json');
const SIGNATURES_FILE = path.join(DATA_DIR, 'signatures.json');
const SIGNATURE_TOKENS_FILE = path.join(DATA_DIR, 'signature_tokens.json');
const PHOTOS_FILE = path.join(DATA_DIR, 'photos.json');
export const UPLOADS_PHOTOS_DIR = path.resolve(DATA_DIR, 'uploads', 'photos');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_PHOTOS_DIR)) {
      fs.mkdirSync(UPLOADS_PHOTOS_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Erro ao verificar diretório data:', err);
  }
}

export function loadPersistedChecklists(): Record<string, ChecklistItem[]> {
  try {
    ensureDataDir();
    if (fs.existsSync(CHECKLISTS_FILE)) {
      const data = fs.readFileSync(CHECKLISTS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar checklists persistidos:', err);
  }
  return {};
}

export function savePersistedChecklists() {
  try {
    ensureDataDir();
    fs.writeFileSync(CHECKLISTS_FILE, JSON.stringify(checklistsStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar checklists em arquivo:', err);
  }
}

export function loadPersistedSignatures(): Record<string, DigitalSignature> {
  try {
    ensureDataDir();
    if (fs.existsSync(SIGNATURES_FILE)) {
      const data = fs.readFileSync(SIGNATURES_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar assinaturas persistidas:', err);
  }
  return {};
}

export function savePersistedSignatures() {
  try {
    ensureDataDir();
    fs.writeFileSync(SIGNATURES_FILE, JSON.stringify(signaturesStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar assinaturas em arquivo:', err);
  }
}

export interface SignatureTokenData {
  osId: string;
  signerName?: string;
  signerRole?: string;
  purpose?: string;
  expiresAt: number;
  createdAt: string;
  used: boolean;
}

export function loadPersistedSignatureTokens(): Record<string, SignatureTokenData> {
  try {
    ensureDataDir();
    if (fs.existsSync(SIGNATURE_TOKENS_FILE)) {
      const data = fs.readFileSync(SIGNATURE_TOKENS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar tokens de assinatura:', err);
  }
  return {};
}

export function savePersistedSignatureTokens() {
  try {
    ensureDataDir();
    fs.writeFileSync(SIGNATURE_TOKENS_FILE, JSON.stringify(signatureTokensStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar tokens de assinatura em arquivo:', err);
  }
}

export function loadPersistedPhotos(): Record<string, ServiceOrderPhoto[]> {
  try {
    ensureDataDir();
    if (fs.existsSync(PHOTOS_FILE)) {
      const data = fs.readFileSync(PHOTOS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao carregar fotos persistidas:', err);
  }
  return {};
}

export function savePersistedPhotos() {
  try {
    ensureDataDir();
    fs.writeFileSync(PHOTOS_FILE, JSON.stringify(photosStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Erro ao salvar fotos em arquivo:', err);
  }
}

export const CHECKLIST_TEMPLATES: Record<string, { icon: string; label: string; required: boolean }[]> = {
  'Notebook': [
    { icon: '🔌', label: 'Verificar fonte de alimentação / carregador', required: true },
    { icon: '🔋', label: 'Testar saúde da bateria', required: true },
    { icon: '🧠', label: 'Verificar memória RAM', required: true },
    { icon: '💾', label: 'Testar HD/SSD e integridade S.M.A.R.T.', required: true },
    { icon: '🖥️', label: 'Verificar tela e cabo flat', required: true },
    { icon: '⌨️', label: 'Testar todas as teclas do teclado', required: false },
    { icon: '🖱️', label: 'Testar touchpad e gestos', required: false },
    { icon: '🔌', label: 'Verificar portas USB e HDMI', required: false },
    { icon: '📶', label: 'Testar conectividade Wi-Fi e Bluetooth', required: false },
    { icon: '🔄', label: 'Verificar ativação e updates do SO', required: false },
  ],
  'Desktop': [
    { icon: '🔌', label: 'Verificar fonte de alimentação', required: true },
    { icon: '🧠', label: 'Verificar módulos de memória RAM', required: true },
    { icon: '💾', label: 'Testar HD/SSD', required: true },
    { icon: '🖥️', label: 'Verificar placa de vídeo / saída de vídeo', required: true },
    { icon: '🔌', label: 'Testar portas USB frontais e traseiras', required: false },
    { icon: '🔄', label: 'Verificar integridade do Sistema Operacional', required: false },
    { icon: '🖱️', label: 'Testar periféricos', required: false },
  ],
  'All-in-One': [
    { icon: '🔌', label: 'Verificar fonte de alimentação externa', required: true },
    { icon: '🖥️', label: 'Testar tela / Touchscreen', required: true },
    { icon: '🧠', label: 'Verificar memória RAM', required: true },
    { icon: '💾', label: 'Testar HD/SSD', required: true },
    { icon: '📶', label: 'Testar Wi-Fi e Bluetooth', required: false },
    { icon: '🔄', label: 'Verificar sistema operacional', required: false },
  ],
  'Impressora': [
    { icon: '🔌', label: 'Verificar cabo de alimentação e fusível', required: true },
    { icon: '🔌', label: 'Verificar cabo USB / Comunicação de Rede', required: true },
    { icon: '🖨️', label: 'Testar impressão de página de teste', required: true },
    { icon: '💧', label: 'Verificar nível de toner / cartucho de tinta', required: true },
    { icon: '🧹', label: 'Limpeza de cabeçote e roletes de tracionamento', required: false },
    { icon: '📄', label: 'Verificar sensores e bandeja de papel', required: false },
    { icon: '📷', label: 'Testar scanner / Digitalização', required: false },
    { icon: '🔄', label: 'Verificar drivers instalados no cliente', required: false },
  ],
  'Monitor': [
    { icon: '🔌', label: 'Verificar cabo de alimentação e fonte', required: true },
    { icon: '🔌', label: 'Verificar cabo de vídeo (HDMI/DisplayPort)', required: true },
    { icon: '🖥️', label: 'Testar entrada de vídeo e sinal', required: true },
    { icon: '🔘', label: 'Verificar botões de menu/OSD', required: false },
    { icon: '📐', label: 'Testar resolução máxima suportada', required: false },
    { icon: '🔍', label: 'Verificar dead pixels e vazamento de luz', required: false },
  ],
  'Servidor': [
    { icon: '🔌', label: 'Verificar redundância de fontes de alimentação', required: true },
    { icon: '🌀', label: 'Verificar ventoinhas / coolers e temperatura', required: true },
    { icon: '💾', label: 'Testar discos em arranjo RAID / SSD', required: true },
    { icon: '🧠', label: 'Verificar erros de memória ECC', required: true },
    { icon: '🔄', label: 'Verificar logs do SO e hipervisor', required: true },
    { icon: '🌐', label: 'Testar interfaces de rede (NIC Teaming/iDRAC)', required: false },
    { icon: '💾', label: 'Verificar rotinas de backup ativo', required: false },
  ],
  'Switch/Roteador': [
    { icon: '🔌', label: 'Verificar fonte de alimentação / PoE', required: true },
    { icon: '🔌', label: 'Testar portas RJ45 / SFP', required: true },
    { icon: '🔌', label: 'Verificar cabeamento estruturado', required: true },
    { icon: '🌐', label: 'Testar throughput e latência de rede', required: true },
    { icon: '⚙️', label: 'Verificar firmware e configurações de VLAN', required: false },
    { icon: '📶', label: 'Testar Wi-Fi e SSIDs corporativos', required: false },
  ],
  'Tablet': [
    { icon: '🔌', label: 'Verificar carregador e conector USB', required: true },
    { icon: '🔋', label: 'Testar carga da bateria', required: true },
    { icon: '🖥️', label: 'Verificar tela e vidro', required: true },
    { icon: '👆', label: 'Testar sensibilidade do touch', required: true },
    { icon: '📶', label: 'Testar Wi-Fi e 4G/5G', required: false },
    { icon: '🔄', label: 'Verificar sistema operacional', required: false },
  ],
  'Celular': [
    { icon: '🔌', label: 'Verificar carregador e cabo', required: true },
    { icon: '🔋', label: 'Testar retenção de carga da bateria', required: true },
    { icon: '🖥️', label: 'Verificar tela e display', required: true },
    { icon: '👆', label: 'Testar touch screen e biometria', required: true },
    { icon: '📶', label: 'Testar Wi-Fi e sinal de celular', required: false },
    { icon: '📷', label: 'Testar câmeras frontal e traseira', required: false },
    { icon: '🔊', label: 'Testar alto-falantes e microfone', required: false },
  ],
  'Outro': [
    { icon: '🔌', label: 'Verificar fonte de alimentação e cabos', required: true },
    { icon: '⚙️', label: 'Testar funcionamento básico do equipamento', required: true },
    { icon: '🔧', label: 'Verificar componentes físicos e avarias', required: false },
    { icon: '🌐', label: 'Testar conectividade / comunicação', required: false },
  ],
};

export function getMatchingTemplateKey(deviceType?: string): string {
  if (!deviceType) return 'Outro';
  const norm = deviceType.toLowerCase();
  if (norm.includes('notebook') || norm.includes('laptop')) return 'Notebook';
  if (norm.includes('desktop') || norm.includes('pc') || norm.includes('computador')) return 'Desktop';
  if (norm.includes('all-in-one') || norm.includes('aio')) return 'All-in-One';
  if (norm.includes('impressora') || norm.includes('multifuncional')) return 'Impressora';
  if (norm.includes('monitor') || norm.includes('tela')) return 'Monitor';
  if (norm.includes('servidor') || norm.includes('server')) return 'Servidor';
  if (norm.includes('switch') || norm.includes('roteador') || norm.includes('router') || norm.includes('modem')) return 'Switch/Roteador';
  if (norm.includes('tablet') || norm.includes('ipad')) return 'Tablet';
  if (norm.includes('celular') || norm.includes('smartphone') || norm.includes('phone')) return 'Celular';
  return 'Outro';
}

export function generateDefaultChecklistForOS(osId: string, deviceType?: string): ChecklistItem[] {
  const categoryKey = getMatchingTemplateKey(deviceType);
  const template = CHECKLIST_TEMPLATES[categoryKey] || CHECKLIST_TEMPLATES['Outro'];
  return template.map((item, index) => ({
    id: `${osId}-chk-${index}`,
    label: item.label,
    checked: false,
    icon: item.icon,
    required: item.required,
    notes: '',
  }));
}

export function getOrCreateChecklistForOS(os: ServiceOrder): ChecklistItem[] {
  if (checklistsStore[os.id] && Array.isArray(checklistsStore[os.id]) && checklistsStore[os.id].length > 0) {
    return checklistsStore[os.id];
  }
  const defaultItems = generateDefaultChecklistForOS(os.id, os.equipment);
  checklistsStore[os.id] = defaultItems;
  os.checklist = defaultItems;
  savePersistedChecklists();
  return defaultItems;
}

/**
 * Faz o parse seguro da connection string do PostgreSQL, inclusive quando
 * senhas possuem caracteres especiais (@, /, etc.).
 */
function parseDatabaseConfig(rawUrl?: string) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  try {
    const match = rawUrl.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^:/@]+)(?::(\d+))?\/([^?]+)/);
    if (match) {
      const [, user, password, host, port, database] = match;
      return {
        user,
        password,
        host,
        port: port ? parseInt(port, 10) : 5432,
        database: database.split('?')[0],
      };
    }

    const parsed = new URL(rawUrl);
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
      database: parsed.pathname.replace(/^\//, '').split('?')[0],
    };
  } catch {
    return null;
  }
}

// Initial seed data matching the user's screenshot exact OS codes, clients, and stats!
export const usersStore: User[] = [
  {
    id: 'u-1',
    name: 'Técnico Rogério',
    email: 'rogerio@plioou.com',
    role: 'technician',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'u-2',
    name: 'Admin Silva',
    email: 'admin@plioou.com',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
];

export const clientsStore: Client[] = [
  {
    id: 'c-1',
    name: 'TechCorp Inovações',
    cnpjOrCpf: '12.345.678/0001-90',
    email: 'contato@techcorp.com.br',
    phone: '(11) 98765-4321',
    city: 'São Paulo',
    address: 'Av. Paulista, 1000',
    neighborhood: 'Bela Vista',
    zipCode: '01310-100',
    activeOrdersCount: 2,
  },
  {
    id: 'c-2',
    name: 'Advocacia Mendes & Associados',
    cnpjOrCpf: '98.765.432/0001-10',
    email: 'ti@mendesadv.com.br',
    phone: '(11) 91234-5678',
    city: 'São Paulo',
    address: 'Rua da Consolação, 500',
    neighborhood: 'Consolação',
    zipCode: '01302-000',
    activeOrdersCount: 2,
  },
  {
    id: 'c-3',
    name: 'Hospital São Lucas Diagnósticos',
    cnpjOrCpf: '45.678.901/0001-23',
    email: 'suporte@saolucas.com.br',
    phone: '(11) 99887-7665',
    city: 'São Paulo',
    address: 'Rua Vergueiro, 1500',
    neighborhood: 'Vila Mariana',
    zipCode: '04101-000',
    activeOrdersCount: 2,
  },
];

export const checklistsStore: Record<string, ChecklistItem[]> = loadPersistedChecklists();
export const signaturesStore: Record<string, DigitalSignature> = loadPersistedSignatures();
export const signatureTokensStore: Record<string, SignatureTokenData> = loadPersistedSignatureTokens();
export const photosStore: Record<string, ServiceOrderPhoto[]> = loadPersistedPhotos();

// Função auxiliar para datas relativas seguras
const nowMs = Date.now();
const hMs = 3600 * 1000;
const dMs = 24 * hMs;

export const serviceOrdersStore: ServiceOrder[] = [
  // --- HOJE (Dia) ---
  {
    id: 'OS-0001',
    clientId: 'c-1',
    clientName: 'TechCorp Inovações',
    equipment: 'Notebook Dell Latitude 5420',
    category: 'Hardware',
    description: 'Equipamento não inicializa após atualização de firmware.',
    origin: 'Interna',
    attendanceType: 'remote',
    status: 'Aberta',
    priority: 'Alta',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 2,
    createdAt: new Date(nowMs - 2 * hMs).toISOString(),
    updatedAt: new Date(nowMs - 2 * hMs).toISOString(),
    notes: [],
  },
  {
    id: 'OS-0002',
    clientId: 'c-2',
    clientName: 'Advocacia Mendes & Associados',
    equipment: 'Servidor HP ProLiant ML350',
    category: 'Servidores',
    description: 'Lentidão no compartilhamento de arquivos em rede e alerta de disco degradado no RAID.',
    origin: 'Externa',
    attendanceType: 'presential',
    status: 'Em Andamento',
    priority: 'Crítica',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 4,
    createdAt: new Date(nowMs - 5 * hMs).toISOString(),
    updatedAt: new Date(nowMs - 3 * hMs).toISOString(),
    notes: [],
  },
  {
    id: 'OS-0003',
    clientId: 'c-3',
    clientName: 'Hospital São Lucas Diagnósticos',
    equipment: 'Switch Cisco Catalyst 2960',
    category: 'Redes',
    description: 'Queda intermitente na VLAN dos aparelhos de ultrassonografia.',
    origin: 'Externa',
    attendanceType: 'presential',
    status: 'Finalizado',
    priority: 'Alta',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 0,
    technicalSolution: 'Substituição do módulo SFP com falha de atenuação ótica e reorganização do patch panel.',
    createdAt: new Date(nowMs - 7 * hMs).toISOString(),
    updatedAt: new Date(nowMs - 1 * hMs).toISOString(),
    notes: [],
  },
  {
    id: 'OS-0004',
    clientId: 'c-1',
    clientName: 'TechCorp Inovações',
    equipment: 'Impressora Laser HP LaserJet Pro',
    category: 'Impressora',
    description: 'Atolamento constante de papel na bandeja principal e sujeira no cilindro toner.',
    origin: 'Interna',
    attendanceType: 'collect',
    status: 'Encerrado',
    priority: 'Média',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 0,
    technicalSolution: 'Troca dos roletes de tração (pick-up rollers) e limpeza geral interna.',
    laborCost: 180,
    partsCost: 95,
    totalCost: 275,
    paymentMethod: 'Pix',
    closedAt: new Date(nowMs - 1 * hMs).toISOString(),
    createdAt: new Date(nowMs - 9 * hMs).toISOString(),
    updatedAt: new Date(nowMs - 1 * hMs).toISOString(),
    notes: [],
  },

  // --- ESTA SEMANA (Semana) ---
  {
    id: 'OS-0005',
    clientId: 'c-2',
    clientName: 'Advocacia Mendes & Associados',
    equipment: 'Roteador MikroTik RB3011',
    category: 'Redes',
    description: 'Configuração de túnel VPN IPsec para advogados em home office.',
    origin: 'Interna',
    attendanceType: 'remote',
    status: 'Aberta',
    priority: 'Média',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 12,
    createdAt: new Date(nowMs - 2 * dMs).toISOString(),
    updatedAt: new Date(nowMs - 2 * dMs).toISOString(),
    notes: [],
  },
  {
    id: 'OS-0006',
    clientId: 'c-3',
    clientName: 'Hospital São Lucas Diagnósticos',
    equipment: 'Estação de Trabalho Recepção 02',
    category: 'Software',
    description: 'Travamento no sistema PEP (Prontuário Eletrônico) após atualização do Windows.',
    origin: 'Interna',
    attendanceType: 'remote',
    status: 'Em Andamento',
    priority: 'Alta',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 8,
    createdAt: new Date(nowMs - 3 * dMs).toISOString(),
    updatedAt: new Date(nowMs - 3 * dMs).toISOString(),
    notes: [],
  },
  {
    id: 'OS-0007',
    clientId: 'c-1',
    clientName: 'TechCorp Inovações',
    equipment: 'Firewall FortiGate 60F',
    category: 'Segurança',
    description: 'Renovação e aplicação de certificado SSL nos portais internos.',
    origin: 'Interna',
    attendanceType: 'remote',
    status: 'Finalizado',
    priority: 'Alta',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 0,
    technicalSolution: 'Certificado Let’s Encrypt renovado e associado às interfaces virtuais com sucesso.',
    createdAt: new Date(nowMs - 4 * dMs).toISOString(),
    updatedAt: new Date(nowMs - 3 * dMs).toISOString(),
    notes: [],
  },

  // --- ESTE MÊS (Mês) ---
  {
    id: 'OS-0008',
    clientId: 'c-2',
    clientName: 'Advocacia Mendes & Associados',
    equipment: 'Nobreak SMS Sinus Triad 3kVA',
    category: 'Infraestrutura',
    description: 'Baterias acusando fim de vida útil e sinal sonoro constante.',
    origin: 'Externa',
    attendanceType: 'presential',
    status: 'Em Andamento',
    priority: 'Média',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 24,
    createdAt: new Date(nowMs - 8 * dMs).toISOString(),
    updatedAt: new Date(nowMs - 7 * dMs).toISOString(),
    notes: [],
  },
  {
    id: 'OS-0009',
    clientId: 'c-3',
    clientName: 'Hospital São Lucas Diagnósticos',
    equipment: 'Notebook Lenovo ThinkPad T14',
    category: 'Hardware',
    description: 'Tela piscando ao movimentar a tampa articulada.',
    origin: 'Interna',
    attendanceType: 'collect',
    status: 'Finalizado',
    priority: 'Média',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 0,
    technicalSolution: 'Cabo flat EDP substituído e conexões protegidas.',
    createdAt: new Date(nowMs - 12 * dMs).toISOString(),
    updatedAt: new Date(nowMs - 11 * dMs).toISOString(),
    notes: [],
  },
  {
    id: 'OS-0010',
    clientId: 'c-1',
    clientName: 'TechCorp Inovações',
    equipment: 'Servidor Dell PowerEdge R740',
    category: 'Servidores',
    description: 'Upgrade de memória RAM para 128GB e atualização de firmware iDRAC9.',
    origin: 'Externa',
    attendanceType: 'presential',
    status: 'Encerrado',
    priority: 'Alta',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 0,
    technicalSolution: 'Memórias instaladas em canais balanceados e diagnósticos de hardware 100% aprovados.',
    laborCost: 450,
    partsCost: 1200,
    totalCost: 1650,
    paymentMethod: 'Boleto 30 dias',
    closedAt: new Date(nowMs - 14 * dMs).toISOString(),
    createdAt: new Date(nowMs - 15 * dMs).toISOString(),
    updatedAt: new Date(nowMs - 14 * dMs).toISOString(),
    notes: [],
  },

  // --- ESTE ANO (Ano) ---
  {
    id: 'OS-0011',
    clientId: 'c-2',
    clientName: 'Advocacia Mendes & Associados',
    equipment: 'Infraestrutura de Cabeamento Cat6',
    category: 'Redes',
    description: 'Certificação de 24 pontos de rede no novo andar da diretoria.',
    origin: 'Externa',
    attendanceType: 'presential',
    status: 'Encerrado',
    priority: 'Média',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 0,
    technicalSolution: 'Pontos certificados com Fluke Networks e relatório entregue ao gestor.',
    laborCost: 1200,
    totalCost: 1200,
    paymentMethod: 'Transferência',
    closedAt: new Date(nowMs - 40 * dMs).toISOString(),
    createdAt: new Date(nowMs - 45 * dMs).toISOString(),
    updatedAt: new Date(nowMs - 40 * dMs).toISOString(),
    notes: [],
  },
  {
    id: 'OS-0012',
    clientId: 'c-3',
    clientName: 'Hospital São Lucas Diagnósticos',
    equipment: 'Storage SAN QNAP Enterprise',
    category: 'Storage',
    description: 'Expansão de pool de armazenamento iSCSI para imagens DICOM.',
    origin: 'Externa',
    attendanceType: 'presential',
    status: 'Finalizado',
    priority: 'Alta',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 0,
    technicalSolution: 'Pool expandido com 4x discos Seagate Enterprise 16TB.',
    createdAt: new Date(nowMs - 60 * dMs).toISOString(),
    updatedAt: new Date(nowMs - 58 * dMs).toISOString(),
    notes: [],
  },
  {
    id: 'OS-0013',
    clientId: 'c-1',
    clientName: 'TechCorp Inovações',
    equipment: 'Rotina de Backup Cloud / Veeam',
    category: 'Segurança',
    description: 'Auditoria e teste de Disaster Recovery em ambiente de homologação.',
    origin: 'Interna',
    attendanceType: 'remote',
    status: 'Encerrado',
    priority: 'Alta',
    technicianId: 'u-1',
    technicianName: 'Técnico Rogério',
    stalledHours: 0,
    technicalSolution: 'Simulação de restauração concluída em 38 minutos com integridade total.',
    laborCost: 800,
    totalCost: 800,
    paymentMethod: 'Pix',
    closedAt: new Date(nowMs - 88 * dMs).toISOString(),
    createdAt: new Date(nowMs - 90 * dMs).toISOString(),
    updatedAt: new Date(nowMs - 88 * dMs).toISOString(),
    notes: [],
  },
];

// Attach persisted checklists or initialize default equipment checklist for each service order
for (const order of serviceOrdersStore) {
  if (!checklistsStore[order.id] || checklistsStore[order.id].length === 0) {
    checklistsStore[order.id] = generateDefaultChecklistForOS(order.id, order.equipment);
  }
  order.checklist = checklistsStore[order.id];
}
savePersistedChecklists();

export const auditLogsStore: AuditLog[] = [];

export const notificationsStore: Notification[] = [];

// Helper database functions
export async function initializeDatabase() {
  const dbConfig = parseDatabaseConfig(process.env.DATABASE_URL);
  if (!dbConfig) {
    console.log('Armazenamento: Sistema operando em modo store em memória de alta performance.');
    return;
  }

  // Valida se o host do banco de dados é resolvível antes de tentar conexão
  try {
    if (dbConfig.host) {
      await dnsLookup(dbConfig.host);
    }
  } catch {
    console.log(`Host de banco '${dbConfig.host}' não localizado no ambiente atual. Utilizando armazenamento em memória.`);
    return;
  }

  try {
    pgPool = new Pool({
      user: dbConfig.user,
      password: dbConfig.password,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      ssl: process.env.NODE_ENV === 'production' && dbConfig.host !== 'localhost' && dbConfig.host !== 'postgres' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 2000,
    });

    const client = await pgPool.connect();
    console.log('Connected to PostgreSQL successfully. Creating tables if needed...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL,
        avatar TEXT
      );

      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        cnpj_or_cpf VARCHAR(30),
        email VARCHAR(100),
        phone VARCHAR(30),
        city VARCHAR(100),
        address VARCHAR(200),
        neighborhood VARCHAR(100),
        zip_code VARCHAR(30)
      );

      CREATE TABLE IF NOT EXISTS service_orders (
        id VARCHAR(50) PRIMARY KEY,
        client_id VARCHAR(50) REFERENCES clients(id),
        client_name VARCHAR(150),
        equipment VARCHAR(100),
        category VARCHAR(100),
        description TEXT,
        status VARCHAR(30),
        priority VARCHAR(20),
        technician_id VARCHAR(50) REFERENCES users(id),
        technician_name VARCHAR(100),
        stalled_hours INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50),
        user_name VARCHAR(100),
        user_role VARCHAR(20),
        action VARCHAR(50),
        target_id VARCHAR(50),
        details TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS service_order_checklists (
        os_id VARCHAR(50) PRIMARY KEY,
        checklist_data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS service_order_signatures (
        os_id VARCHAR(50) PRIMARY KEY,
        signature_data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS service_order_photos (
        id VARCHAR(80) PRIMARY KEY,
        os_id VARCHAR(50) NOT NULL,
        photo_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    client.release();
    console.log('PostgreSQL schema initialized.');
  } catch {
    console.log('PostgreSQL não conectado. Operando com armazenamento em memória.');
    pgPool = null;
  }
}

export function getDashboardStats(): DashboardStats {
  const totalOS = serviceOrdersStore.length;
  const abertas = serviceOrdersStore.filter((os) => os.status === 'Aberta').length;
  const emAndamento = serviceOrdersStore.filter((os) => os.status === 'Em Andamento').length;
  const aguardandoCliente = serviceOrdersStore.filter((os) => os.status === 'Aguardando Cliente' || os.status === 'Aguardando Peças').length;
  const finalizadas = serviceOrdersStore.filter((os) => os.status === 'Finalizado' || os.status === 'Encerrado').length;
  const atendimentoExterno = serviceOrdersStore.filter((os) => os.origin === 'Externa' || os.category === 'Redes' || os.equipment?.toLowerCase().includes('switch') || os.equipment?.toLowerCase().includes('roteador')).length;

  const stalledOrders = serviceOrdersStore
    .filter((os) => (os.stalledHours || 0) >= 48 && os.status !== 'Finalizado' && os.status !== 'Encerrado')
    .sort((a, b) => (b.stalledHours || 0) - (a.stalledHours || 0));

  const technicians = usersStore.filter((u) => u.role === 'technician');
  const productivity: TechProductivity[] = technicians.map((tech) => {
    const techOrders = serviceOrdersStore.filter((os) => os.technicianId === tech.id);
    const inProgressCount = techOrders.filter((os) => os.status === 'Em Andamento' || os.status === 'Aberta').length;
    const completedCount = techOrders.filter((os) => os.status === 'Finalizado' || os.status === 'Encerrado').length;
    return {
      technicianId: tech.id,
      technicianName: tech.name,
      totalAssigned: techOrders.length,
      inProgressCount,
      completedCount,
      avgResolutionHours: Math.floor(1.5 + Math.random() * 3),
    };
  });

  return {
    totalOS,
    abertas,
    emAndamento,
    aguardandoCliente,
    finalizadas,
    atendimentoExterno,
    stalledOrders,
    productivity,
  };
}
