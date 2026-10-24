export type Role = 'admin' | 'technician';

export type OSStatus =
  | 'Aberta'
  | 'Em Andamento'
  | 'Aguardando Peças'
  | 'Aguardando Cliente'
  | 'Finalizado pelo Técnico'
  | 'Finalizado'
  | 'Encerrado';

export type OSPriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
}

export interface Client {
  id: string;
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
  activeOrdersCount?: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  icon?: string;
  required?: boolean;
  notes?: string;
}

export interface QuoteItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ServiceOrderNote {
  id: string;
  authorName: string;
  authorRole: Role;
  content: string;
  createdAt: string;
}

export interface QuoteHistoryItem {
  id: string;
  status: 'Pendente' | 'Enviado' | 'Aprovado' | 'Rejeitado' | 'Recusado';
  updatedBy: string;
  updatedRole?: Role | 'cliente';
  createdAt: string;
  note?: string;
}

export interface ServiceOrder {
  id: string; // e.g. "OS-0095"
  clientId: string;
  clientName: string;
  equipment: string; // e.g. "Servidor", "Notebook HP", "Impressora", "Outro"
  category: string;
  description: string;
  origin?: 'Interna' | 'Externa';
  attendanceType?: 'remote' | 'presential' | 'collect';
  status: OSStatus;
  priority: OSPriority;
  technicianId?: string;
  technicianName?: string;
  openedBy?: string;
  openedById?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: string;
  stalledHours?: number; // Calculated hours without update
  createdAt: string;
  updatedAt: string;
  notes: ServiceOrderNote[];
  checklist?: ChecklistItem[];
  // Financial & Technical Solution Fields
  laborCost?: number;
  partsCost?: number;
  discountCost?: number;
  totalCost?: number;
  paymentMethod?: string;
  financialNotes?: string;
  technicalSolution?: string;
  closedAt?: string;
  closedBy?: string;
  quoteItems?: QuoteItem[];
  quoteStatus?: 'Pendente' | 'Enviado' | 'Aprovado' | 'Rejeitado' | 'Recusado';
  quoteNotes?: string;
  quoteHistory?: QuoteHistoryItem[];
  signature?: DigitalSignature;
  photos?: ServiceOrderPhoto[];
}

export type PhotoCategory =
  | 'Equipamento / Entrada'
  | 'Durante Atendimento'
  | 'Solução / Finalização'
  | 'Outros / Geral'
  | 'Estado inicial do equipamento'
  | 'Diagnóstico técnico'
  | 'Durante o reparo'
  | 'Peças e componentes'
  | 'Estado final do equipamento'
  | 'Entrega ao cliente'
  | 'Outros registros';

export interface ServiceOrderPhoto {
  id: string; // e.g. "photo-OS-0001-177178..."
  osId: string;
  filePath?: string; // disk storage path
  fileName?: string; // safe stored filename
  fileUrl?: string; // e.g. /api/service-orders/:id/photos/:photoId/file
  thumbnailUrl?: string;
  originalName?: string;
  contentType?: string; // "image/jpeg", "image/png", "image/webp"
  mimeType?: string;
  fileSize?: number; // bytes
  description: string;
  category: PhotoCategory;
  createdAt?: string; // ISO
  uploadedAt: string;
  uploadedBy: string;
  uploadedById?: string;
  createdById?: string;
  createdByName?: string;
  url?: string;
  base64Data?: string;
}

export interface DigitalSignature {
  id: string;
  osId: string;
  signerName: string;
  signerRole: string;
  purpose: string;
  modality: 'presential' | 'remote';
  signatureData: string; // base64 data URL da imagem PNG da assinatura
  signedAt: string;
  registeredBy?: string;
  status: 'pending' | 'signed';
  remoteToken?: string;
  remoteTokenExpiresAt?: string;
  remoteAccessCount?: number;
  ipAddress?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string; // e.g., "CRIAR_OS", "ATUALIZAR_STATUS", "REATRIBUIR_TECNICO"
  targetId: string;
  details: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string; // 'all' or specific user ID
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  osId?: string;
  read: boolean;
  createdAt: string;
}

export interface TechProductivity {
  technicianId: string;
  technicianName: string;
  totalAssigned: number;
  inProgressCount: number;
  completedCount: number;
  avgResolutionHours: number;
}

export interface DashboardStats {
  totalOS: number;
  abertas: number;
  emAndamento: number;
  aguardandoCliente: number;
  finalizadas: number;
  atendimentoExterno: number;
  stalledOrders: ServiceOrder[];
  productivity: TechProductivity[];
}
