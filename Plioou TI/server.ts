import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  usersStore,
  clientsStore,
  serviceOrdersStore,
  auditLogsStore,
  notificationsStore,
  checklistsStore,
  signaturesStore,
  signatureTokensStore,
  photosStore,
  savePersistedPhotos,
  UPLOADS_PHOTOS_DIR,
  getDashboardStats,
  initializeDatabase,
  savePersistedChecklists,
  savePersistedSignatures,
  savePersistedSignatureTokens,
  getOrCreateChecklistForOS,
  pgPool,
} from './server/store.js';
import { User, Role, ServiceOrder, AuditLog, Notification, ServiceOrderNote, Client, ChecklistItem, DigitalSignature, ServiceOrderPhoto, PhotoCategory } from './src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'plioou_ti_jwt_secret_key_2026';
const PORT = 3000;

/**
 * Utilitário seguro para inicialização do Google GenAI com a chave API_KEY do ambiente.
 * Valida a presença da secret antes de qualquer execução sem solicitar input ao usuário
 * e sem expor a chave para o cliente ou no código.
 */
function getGeminiClient(): { client: GoogleGenAI | null; error?: string } {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return {
      client: null,
      error: 'A chave secreta API_KEY não está configurada nas variáveis de ambiente do servidor.',
    };
  }

  const client = new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return { client };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
  };
}

async function startServer() {
  await initializeDatabase();

  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Socket.io connections & rooms
  io.on('connection', (socket) => {
    console.log('Client connected to real-time socket:', socket.id);

    socket.on('join_user', (userId: string) => {
      socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected from real-time socket:', socket.id);
    });
  });

  // Helper to emit real-time updates and create notifications
  function notifyAll(title: string, message: string, type: 'info' | 'warning' | 'success' | 'alert', osId?: string) {
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: 'all',
      title,
      message,
      type,
      osId,
      read: false,
      createdAt: new Date().toISOString(),
    };
    notificationsStore.unshift(notif);
    io.emit('notification', notif);
    io.emit('os_updated');
  }

  // Authentication Middleware
  function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const devUserId = req.headers['x-dev-user-id'] as string;

    if (token && token !== 'demo_token') {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: Role; name: string };
        req.user = decoded;
        return next();
      } catch {
        if (!devUserId) {
          return res.status(403).json({ error: 'Token inválido ou expirado.' });
        }
      }
    }

    if (devUserId) {
      const found = usersStore.find((u) => u.id === devUserId);
      if (found) {
        req.user = { id: found.id, email: found.email, role: found.role, name: found.name };
        return next();
      }
      return res.status(401).json({ error: 'Identificador de usuário inválido.' });
    }

    return res.status(401).json({ error: 'Acesso não autorizado. Credenciais ausentes.' });
  }

  // Auth Routes
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    const cleanInput = (email || '').trim().toLowerCase();

    const user = usersStore.find((u) => {
      const uEmail = u.email.toLowerCase();
      const uName = u.name.toLowerCase();
      const uRole = u.role.toLowerCase();
      return (
        uEmail === cleanInput ||
        uEmail.startsWith(cleanInput) ||
        uName.includes(cleanInput) ||
        (cleanInput === 'admin' && uRole === 'admin') ||
        (cleanInput === 'tecnico' && uRole === 'technician') ||
        (cleanInput === 'seu.usuario' && uRole === 'technician')
      );
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuário ou e-mail não encontrado.' });
    }

    // Flexible password check for demo/testing
    if (password && password.length < 2) {
      return res.status(401).json({ error: 'Por favor, informe uma senha válida.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user,
    });
  });

  app.get('/api/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
    const user = usersStore.find((u) => u.id === req.user?.id);
    if (!user) {
      return res.status(444).json({ error: 'Usuário não encontrado.' });
    }
    res.json(user);
  });

  // Users endpoints
  app.get('/api/users', authenticateToken, (req: Request, res: Response) => {
    res.json(usersStore);
  });

  app.post('/api/users', authenticateToken, (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem cadastrar novos usuários.' });
    }
    const { name, email, role } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
    }
    const existing = usersStore.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }
    const newUser: User = {
      id: `u-${Date.now()}`,
      name,
      email: email.trim().toLowerCase(),
      role: role === 'admin' ? 'admin' : 'technician',
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    };
    usersStore.push(newUser);

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user?.id || 'admin',
      userName: req.user?.name || 'Administrador',
      userRole: req.user?.role || 'admin',
      action: 'USUARIO_CRIADO',
      targetId: newUser.id,
      details: `Novo usuário criado: ${name} (${role}) - E-mail: ${email}`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    res.json(newUser);
  });

  // Service Orders Endpoints
  app.get('/api/service-orders', authenticateToken, (req: AuthRequest, res: Response) => {
    const { techId, status, search, stalledOnly, scope } = req.query;
    let orders = [...serviceOrdersStore];

    // Filter by technician if Technician role or techId requested
    const targetTechId = (techId as string) || (req.user?.role === 'technician' ? req.user.id : undefined);

    if (targetTechId && targetTechId !== 'all') {
      if (scope === 'mine_only') {
        orders = orders.filter((os) => os.technicianId === targetTechId);
      } else {
        // Technicians see:
        // 1. Service orders assigned to them
        // 2. ALL newly opened orders (status === 'Aberta')
        // 3. ALL unassigned orders (!os.technicianId)
        orders = orders.filter(
          (os) =>
            os.technicianId === targetTechId ||
            os.status === 'Aberta' ||
            !os.technicianId ||
            os.technicianId === ''
        );
      }
    }

    if (status) {
      orders = orders.filter((os) => os.status === status);
    }

    if (stalledOnly === 'true') {
      orders = orders.filter((os) => (os.stalledHours || 0) >= 48 && os.status !== 'Finalizado' && os.status !== 'Encerrado');
    }

    if (search) {
      const q = (search as string).toLowerCase();
      orders = orders.filter(
        (os) =>
          os.id.toLowerCase().includes(q) ||
          os.clientName.toLowerCase().includes(q) ||
          os.equipment.toLowerCase().includes(q) ||
          (os.technicianName && os.technicianName.toLowerCase().includes(q))
      );
    }

    // Sort by id descending
    orders.sort((a, b) => b.id.localeCompare(a.id));

    // Ensure every order contains its associated checklist, digital signature and photos
    const ordersWithChecklist = orders.map((os) => ({
      ...os,
      checklist: getOrCreateChecklistForOS(os),
      signature: signaturesStore[os.id] || os.signature || undefined,
      photos: photosStore[os.id] || os.photos || [],
    }));

    res.json(ordersWithChecklist);
  });

  app.get('/api/service-orders/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const os = serviceOrdersStore.find((item) => item.id === id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }
    const fullOS = {
      ...os,
      checklist: getOrCreateChecklistForOS(os),
      signature: signaturesStore[os.id] || os.signature || undefined,
      photos: photosStore[os.id] || os.photos || [],
    };
    res.json(fullOS);
  });

  app.post('/api/service-orders', authenticateToken, (req: AuthRequest, res: Response) => {
    const { clientId, clientName, equipment, category, description, priority, origin, attendanceType, technicianId } = req.body;

    if (!clientName || !equipment || !description) {
      return res.status(400).json({ error: 'Campos obrigatórios: Cliente, Equipamento e Descrição.' });
    }

    // If no technicianId specified, default to creating user if user is a technician
    const effectiveTechId = technicianId || (req.user?.role === 'technician' ? req.user.id : undefined);
    const tech = usersStore.find((u) => u.id === effectiveTechId);

    // Generate OS code starting from OS-0001
    const lastNum = serviceOrdersStore.reduce((max, os) => {
      const match = os.id.match(/OS-(\d+)/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);

    const nextId = `OS-${(lastNum + 1).toString().padStart(4, '0')}`;

    const newOS: ServiceOrder = {
      id: nextId,
      clientId: clientId || `c-${Date.now()}`,
      clientName,
      equipment,
      category: category || 'Geral',
      description,
      origin: origin || 'Interna',
      attendanceType: attendanceType || (origin === 'Externa' ? 'presential' : 'remote'),
      status: 'Aberta',
      priority: priority || 'Média',
      technicianId: tech ? tech.id : undefined,
      technicianName: tech ? tech.name : undefined,
      openedBy: req.user?.name || 'Sistema',
      openedById: req.user?.id,
      stalledHours: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: [],
    };

    // Attach and persist default equipment checklist
    newOS.checklist = getOrCreateChecklistForOS(newOS);

    serviceOrdersStore.unshift(newOS);

    // Add Audit Log
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user?.id || 'sys',
      userName: req.user?.name || 'Sistema',
      userRole: req.user?.role || 'technician',
      action: 'CRIAR_OS',
      targetId: newOS.id,
      details: `Criou nova OS para o cliente ${clientName} (${equipment}) - Aberta por ${req.user?.name || 'Usuário'} (${req.user?.role === 'technician' ? 'Técnico' : 'Administrador'})`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    notifyAll(
      `Nova Chamado ${newOS.id}`,
      `O.S. ${newOS.id} criada para ${clientName}${tech ? ` - Atribuída a ${tech.name}` : ''}`,
      'info',
      newOS.id
    );

    res.status(201).json(newOS);
  });

  app.put('/api/service-orders/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const {
      status,
      priority,
      technicianId,
      description,
      scheduledDate,
      scheduledTime,
      laborCost,
      partsCost,
      discountCost,
      totalCost,
      paymentMethod,
      financialNotes,
      technicalSolution,
      quoteItems,
      quoteStatus,
      quoteNotes,
    } = req.body;

    const os = serviceOrdersStore.find((item) => item.id === id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    // RBAC: Técnicos não podem alterar informações financeiras restritas
    if (req.user?.role !== 'admin') {
      if (
        laborCost !== undefined ||
        discountCost !== undefined ||
        totalCost !== undefined ||
        paymentMethod !== undefined ||
        financialNotes !== undefined
      ) {
        return res.status(403).json({
          error: 'Acesso negado: Apenas administradores podem acessar ou alterar informações financeiras restritas.',
        });
      }

      // Técnicos não podem faturar/encerrar definitivamente a OS (status Encerrado)
      if (status === 'Encerrado') {
        return res.status(403).json({
          error: 'Acesso negado: Apenas administradores podem realizar o encerramento definitivo e faturamento de uma O.S.',
        });
      }
    }

    const oldStatus = os.status;
    const oldTechName = os.technicianName;

    if (status) os.status = status;
    if (priority) os.priority = priority;
    if (description) os.description = description;
    if (scheduledDate !== undefined) os.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) os.scheduledTime = scheduledTime;

    if (laborCost !== undefined) os.laborCost = Number(laborCost);
    if (partsCost !== undefined) os.partsCost = Number(partsCost);
    if (discountCost !== undefined) os.discountCost = Number(discountCost);
    if (totalCost !== undefined) os.totalCost = Number(totalCost);
    if (paymentMethod !== undefined) os.paymentMethod = paymentMethod;
    if (financialNotes !== undefined) os.financialNotes = financialNotes;
    if (technicalSolution !== undefined) os.technicalSolution = technicalSolution;
    if (quoteItems !== undefined) os.quoteItems = quoteItems;
    if (quoteStatus !== undefined) os.quoteStatus = quoteStatus;
    if (quoteNotes !== undefined) os.quoteNotes = quoteNotes;
    if (req.body.quoteHistory !== undefined) os.quoteHistory = req.body.quoteHistory;

    if (req.body.checklist !== undefined && Array.isArray(req.body.checklist)) {
      checklistsStore[id] = req.body.checklist;
      os.checklist = req.body.checklist;
      savePersistedChecklists();
    }

    if (technicianId !== undefined) {
      const tech = usersStore.find((u) => u.id === technicianId);
      os.technicianId = tech ? tech.id : undefined;
      os.technicianName = tech ? tech.name : undefined;
    }

    // Auto-generate system note when status changes to Finalizado pelo Técnico
    if (status && status !== oldStatus && (status === 'Finalizado pelo Técnico' || status === 'Finalizado')) {
      const solutionText = technicalSolution ? ` Resumo do serviço: "${technicalSolution}".` : '';
      os.notes.unshift({
        id: `n-${Date.now()}`,
        authorName: req.user?.name || 'Técnico',
        authorRole: req.user?.role || 'technician',
        content: ` Atendimento técnico concluído com sucesso.${solutionText} Chamado encaminhado para revisão e encerramento financeiro pelo Administrador.`,
        createdAt: new Date().toISOString(),
      });
    }

    // Auto-generate system note when status changes to Encerrado
    if (status && status !== oldStatus && status === 'Encerrado') {
      os.closedAt = new Date().toISOString();
      os.closedBy = req.user?.name || 'Administrador';
      const formattedTotal = (os.totalCost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      os.notes.unshift({
        id: `n-${Date.now()}`,
        authorName: req.user?.name || 'Administrador',
        authorRole: 'admin',
        content: ` OS encerrada e faturada com sucesso pelo Administrador. Valor Total: ${formattedTotal} (${os.paymentMethod || 'A combinar'}).`,
        createdAt: new Date().toISOString(),
      });
    }

    os.updatedAt = new Date().toISOString();
    os.stalledHours = 0; // Reset stalled timer on update

    // Audit Log
    const changes: string[] = [];
    if (status && status !== oldStatus) changes.push(`Status: ${oldStatus} ➔ ${status}`);
    if (os.technicianName !== oldTechName) changes.push(`Técnico: ${oldTechName || 'Nenhum'} ➔ ${os.technicianName || 'Nenhum'}`);
    if (totalCost !== undefined) changes.push(`Valor Total: R$ ${totalCost}`);

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user?.id || 'sys',
      userName: req.user?.name || 'Sistema',
      userRole: req.user?.role || 'admin',
      action: status === 'Encerrado' ? 'ENCERRAR_OS' : 'ATUALIZAR_OS',
      targetId: os.id,
      details: changes.length ? changes.join(' | ') : `Atualizou informações da ${os.id}`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    notifyAll(
      `Atualização na ${os.id}`,
      `Status: ${os.status} | Cliente: ${os.clientName}`,
      status === 'Encerrado' ? 'success' : 'info',
      os.id
    );

    const responseOS = {
      ...os,
      checklist: checklistsStore[os.id] || os.checklist || [],
    };

    res.json(responseOS);
  });

  app.post('/api/service-orders/:id/notes', authenticateToken, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'O conteúdo da nota é obrigatório.' });
    }

    const os = serviceOrdersStore.find((item) => item.id === id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    const newNote: ServiceOrderNote = {
      id: `n-${Date.now()}`,
      authorName: req.user?.name || 'Técnico',
      authorRole: req.user?.role || 'technician',
      content,
      createdAt: new Date().toISOString(),
    };

    os.notes.unshift(newNote);
    os.updatedAt = new Date().toISOString();
    os.stalledHours = 0; // Activity resets stalled status

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user?.id || 'sys',
      userName: req.user?.name || 'Técnico',
      userRole: req.user?.role || 'technician',
      action: 'NOVA_NOTA',
      targetId: os.id,
      details: `Adicionou um apontamento/andamento na ${os.id}`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    notifyAll(`Novo Apontamento na ${os.id}`, `${req.user?.name}: ${content.substring(0, 60)}...`, 'info', os.id);

    res.status(201).json(newNote);
  });

  // Checklist Endpoints (Supporting both /api/service-orders/:id/checklist and /api/os/:id/checklist)
  const getChecklistHandler = (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const os = serviceOrdersStore.find((o) => o.id === id);
    const checklist = os ? getOrCreateChecklistForOS(os) : (checklistsStore[id] || []);
    res.json(checklist);
  };

  const saveChecklistHandler = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const os = serviceOrdersStore.find((o) => o.id === id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    const checklistData = req.body.checklist || req.body;
    if (!Array.isArray(checklistData)) {
      return res.status(400).json({ error: 'Formato inválido. O checklist deve ser uma lista de itens.' });
    }

    // Validate and sanitize each item, strictly bound to this OS
    const sanitizedChecklist: ChecklistItem[] = checklistData
      .map((item: any, idx: number) => ({
        id: String(item.id || `${id}-chk-${idx}-${Date.now()}`),
        label: String(item.label || '').trim(),
        checked: Boolean(item.checked),
        icon: item.icon ? String(item.icon) : undefined,
        required: Boolean(item.required),
        notes: item.notes !== undefined && item.notes !== null ? String(item.notes).trim() : '',
      }))
      .filter((item) => item.label.length > 0);

    // Persist in memory store
    checklistsStore[id] = sanitizedChecklist;
    os.checklist = sanitizedChecklist;
    os.updatedAt = new Date().toISOString();

    // Persist to disk file
    savePersistedChecklists();

    // Persist to PostgreSQL if connected
    if (pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO service_order_checklists (os_id, checklist_data, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (os_id) DO UPDATE SET checklist_data = $2, updated_at = NOW()`,
          [id, JSON.stringify(sanitizedChecklist)]
        );
      } catch (e) {
        console.error('Erro ao persistir checklist no Postgres:', e);
      }
    }

    const checkedCount = sanitizedChecklist.filter((i) => i.checked).length;
    const totalCount = sanitizedChecklist.length;

    // Add Audit Log
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user?.id || 'sys',
      userName: req.user?.name || 'Técnico',
      userRole: req.user?.role || 'technician',
      action: 'ATUALIZAR_CHECKLIST',
      targetId: id,
      details: `Atualizou checklist da ${id}: ${checkedCount}/${totalCount} itens verificados`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    notifyAll(`Checklist Atualizado na ${id}`, `${checkedCount}/${totalCount} itens verificados`, 'info', id);

    res.json({
      success: true,
      osId: id,
      checklist: sanitizedChecklist,
      updatedAt: os.updatedAt,
    });
  };

  app.get('/api/service-orders/:id/checklist', authenticateToken, getChecklistHandler);
  app.get('/api/os/:id/checklist', authenticateToken, getChecklistHandler);
  app.post('/api/service-orders/:id/checklist', authenticateToken, saveChecklistHandler);
  app.post('/api/os/:id/checklist', authenticateToken, saveChecklistHandler);

  // ==========================================
  // DIGITAL SIGNATURE ENDPOINTS
  // ==========================================

  // Get Signature for a specific OS
  app.get('/api/service-orders/:id/signature', authenticateToken, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const os = serviceOrdersStore.find((item) => item.id === id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }
    const signature = signaturesStore[id] || os.signature;
    if (!signature) {
      return res.status(404).json({ error: 'Nenhuma assinatura registrada para esta O.S.' });
    }
    res.json(signature);
  });

  // Save In-Person Signature
  app.post('/api/service-orders/:id/signature', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const os = serviceOrdersStore.find((item) => item.id === id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    const { signerName, signerRole, purpose, signatureData, registeredBy } = req.body;

    if (!signerName || typeof signerName !== 'string' || signerName.trim().length === 0) {
      return res.status(400).json({ error: 'Nome do signatário é obrigatório.' });
    }

    if (!signatureData || typeof signatureData !== 'string' || signatureData.trim().length < 50) {
      return res.status(400).json({ error: 'Traçado de assinatura inválido ou vazio.' });
    }

    const newSignature: DigitalSignature = {
      id: `sig-${id}-${Date.now()}`,
      osId: id,
      signerName: signerName.trim(),
      signerRole: (signerRole && typeof signerRole === 'string' ? signerRole.trim() : 'Cliente / Responsável Legal'),
      purpose: (purpose && typeof purpose === 'string' ? purpose.trim() : 'Aceite de Conclusão e Entrega dos Serviços Técnicos'),
      modality: 'presential',
      signatureData: signatureData.trim(),
      signedAt: new Date().toISOString(),
      registeredBy: registeredBy || (req.user ? `${req.user.name} (${req.user.role})` : 'Técnico'),
      status: 'signed',
    };

    // Store in memory & OS
    signaturesStore[id] = newSignature;
    os.signature = newSignature;
    os.updatedAt = new Date().toISOString();

    // Persist to file
    savePersistedSignatures();

    // Persist to Postgres if available
    if (pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO service_order_signatures (os_id, signature_data, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (os_id) DO UPDATE SET signature_data = $2, updated_at = NOW()`,
          [id, JSON.stringify(newSignature)]
        );
      } catch (e) {
        console.error('Erro ao persistir assinatura no Postgres:', e);
      }
    }

    // Audit Log
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user?.id || 'sys',
      userName: req.user?.name || 'Técnico',
      userRole: req.user?.role || 'technician',
      action: 'REGISTRAR_ASSINATURA',
      targetId: id,
      details: `Registrou assinatura presencial de ${newSignature.signerName} (${newSignature.signerRole})`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    notifyAll(
      `Assinatura Registrada na ${id}`,
      `Assinatura presencial vinculada por ${newSignature.signerName}`,
      'success',
      id
    );

    res.json({
      success: true,
      osId: id,
      signature: newSignature,
    });
  });

  // Generate / Retrieve Remote Signature Link Token
  app.post('/api/service-orders/:id/signature-link', authenticateToken, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const os = serviceOrdersStore.find((item) => item.id === id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    const { signerName, signerRole, purpose } = req.body;
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 3600 * 1000; // 7 days expiration

    signatureTokensStore[token] = {
      osId: id,
      signerName: signerName ? String(signerName).trim() : undefined,
      signerRole: signerRole ? String(signerRole).trim() : undefined,
      purpose: purpose ? String(purpose).trim() : undefined,
      expiresAt,
      createdAt: new Date().toISOString(),
      used: false,
    };

    savePersistedSignatureTokens();

    res.json({
      success: true,
      token,
      osId: id,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  });

  // Public Endpoint: Retrieve sanitized OS details for remote signature view
  app.get('/api/public/signature/:token', (req: Request, res: Response) => {
    const { token } = req.params;
    const tokenData = signatureTokensStore[token];
    if (!tokenData) {
      return res.status(404).json({ error: 'Link de assinatura inválido ou não encontrado.' });
    }

    if (Date.now() > tokenData.expiresAt) {
      return res.status(410).json({ error: 'Este link de assinatura expirou.' });
    }

    const os = serviceOrdersStore.find((item) => item.id === tokenData.osId);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço associada não encontrada.' });
    }

    const existingSig = signaturesStore[os.id] || os.signature;

    res.json({
      id: os.id,
      clientName: os.clientName,
      equipment: os.equipment,
      category: os.category,
      description: os.description,
      technicianName: os.technicianName,
      technicalSolution: os.technicalSolution,
      totalCost: os.totalCost,
      paymentMethod: os.paymentMethod,
      purpose: tokenData.purpose || 'Aceite de Conclusão e Entrega dos Serviços Técnicos',
      signerName: tokenData.signerName || os.clientName,
      signerRole: tokenData.signerRole || 'Cliente / Responsável Legal',
      alreadySigned: Boolean(existingSig && existingSig.status === 'signed'),
      signedAt: existingSig?.signedAt,
    });
  });

  // Public Endpoint: Submit Remote Signature
  app.post('/api/public/signature/:token', async (req: Request, res: Response) => {
    const { token } = req.params;
    const tokenData = signatureTokensStore[token];
    if (!tokenData) {
      return res.status(404).json({ error: 'Link de assinatura inválido.' });
    }

    if (Date.now() > tokenData.expiresAt) {
      return res.status(410).json({ error: 'Este link de assinatura expirou.' });
    }

    const os = serviceOrdersStore.find((item) => item.id === tokenData.osId);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço associada não encontrada.' });
    }

    const existingSig = signaturesStore[os.id] || os.signature;
    if (existingSig && existingSig.status === 'signed') {
      return res.status(409).json({ error: 'Esta Ordem de Serviço já possui uma assinatura de aceite registrada.' });
    }

    const { signerName, signerRole, signatureData } = req.body;

    if (!signerName || typeof signerName !== 'string' || signerName.trim().length === 0) {
      return res.status(400).json({ error: 'Nome do signatário é obrigatório.' });
    }

    if (!signatureData || typeof signatureData !== 'string' || signatureData.trim().length < 50) {
      return res.status(400).json({ error: 'Traçado de assinatura inválido ou vazio.' });
    }

    const newSignature: DigitalSignature = {
      id: `sig-rem-${os.id}-${Date.now()}`,
      osId: os.id,
      signerName: signerName.trim(),
      signerRole: (signerRole && typeof signerRole === 'string' ? signerRole.trim() : tokenData.signerRole || 'Cliente / Responsável Legal'),
      purpose: tokenData.purpose || 'Aceite de Conclusão e Entrega dos Serviços Técnicos',
      modality: 'remote',
      signatureData: signatureData.trim(),
      signedAt: new Date().toISOString(),
      registeredBy: 'Cliente (Assinatura Remota Mobile)',
      status: 'signed',
      remoteToken: token,
      ipAddress: req.ip,
    };

    // Store in memory & OS
    signaturesStore[os.id] = newSignature;
    os.signature = newSignature;
    os.updatedAt = new Date().toISOString();
    tokenData.used = true;

    // Persist to file
    savePersistedSignatures();
    savePersistedSignatureTokens();

    // Persist to Postgres if available
    if (pgPool) {
      try {
        await pgPool.query(
          `INSERT INTO service_order_signatures (os_id, signature_data, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (os_id) DO UPDATE SET signature_data = $2, updated_at = NOW()`,
          [os.id, JSON.stringify(newSignature)]
        );
      } catch (e) {
        console.error('Erro ao persistir assinatura no Postgres:', e);
      }
    }

    // Audit Log
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: 'remote-client',
      userName: signerName.trim(),
      userRole: 'technician',
      action: 'REGISTRAR_ASSINATURA_REMOTA',
      targetId: os.id,
      details: `Cliente ${signerName.trim()} realizou assinatura digital remota de aceite pelo celular`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    notifyAll(
      `Assinatura Remota Recebida na ${os.id}`,
      `Cliente ${signerName.trim()} assinou o aceite pelo smartphone`,
      'success',
      os.id
    );

    res.json({
      success: true,
      osId: os.id,
      signature: newSignature,
      signedAt: newSignature.signedAt,
    });
  });

  // ==========================================
  // SERVICE ORDER PHOTOS ENDPOINTS ("Fotos do Atendimento")
  // ==========================================

  const VALID_PHOTO_CATEGORIES: PhotoCategory[] = [
    'Equipamento / Entrada',
    'Durante Atendimento',
    'Solução / Finalização',
    'Outros / Geral',
    'Estado inicial do equipamento',
    'Diagnóstico técnico',
    'Durante o reparo',
    'Peças e componentes',
    'Estado final do equipamento',
    'Entrega ao cliente',
    'Outros registros',
  ];

  // List photos for a specific OS
  app.get('/api/service-orders/:id/photos', authenticateToken, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const os = serviceOrdersStore.find((item) => item.id === id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }
    const photos = photosStore[id] || [];
    res.json(photos);
  });

  // Upload photo for an OS (supports camera capture & gallery images via base64)
  app.post('/api/service-orders/:id/photos', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const os = serviceOrdersStore.find((item) => item.id === id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    const { imageData, category, description, originalName } = req.body;

    if (!imageData || typeof imageData !== 'string' || imageData.trim().length === 0) {
      return res.status(400).json({ error: 'A imagem da foto é obrigatória.' });
    }

    if (!category || !VALID_PHOTO_CATEGORIES.includes(category as PhotoCategory)) {
      return res.status(400).json({
        error: `Categoria inválida. Categorias permitidas: ${VALID_PHOTO_CATEGORIES.join(', ')}`,
      });
    }

    try {
      // Decode base64 image data
      let base64Data = imageData;
      let mimeType = 'image/jpeg';
      let extension = 'jpg';

      if (imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
          if (mimeType.includes('png')) extension = 'png';
          else if (mimeType.includes('webp')) extension = 'webp';
          else if (mimeType.includes('gif')) extension = 'gif';
          else extension = 'jpg';
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length === 0) {
        return res.status(400).json({ error: 'Arquivo de imagem inválido ou corrompido.' });
      }

      // Max file size check (15MB)
      if (buffer.length > 15 * 1024 * 1024) {
        return res.status(400).json({ error: 'Arquivo excede o tamanho máximo de 15MB.' });
      }

      // Generate unique photo ID & file path
      const photoId = `photo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const fileName = `${photoId}.${extension}`;
      const filePath = path.join(UPLOADS_PHOTOS_DIR, fileName);

      // Write file to disk
      fs.writeFileSync(filePath, buffer);

      const fileUrl = `/api/service-orders/${id}/photos/${photoId}/file`;

      const newPhoto: ServiceOrderPhoto = {
        id: photoId,
        osId: id,
        fileUrl,
        filePath,
        thumbnailUrl: fileUrl,
        category: category as PhotoCategory,
        description: description && typeof description === 'string' ? description.trim() : '',
        uploadedAt: new Date().toISOString(),
        uploadedBy: req.user?.name || 'Técnico Responsável',
        uploadedById: req.user?.id,
        fileSize: buffer.length,
        mimeType,
        originalName: originalName || fileName,
      };

      if (!photosStore[id]) {
        photosStore[id] = [];
      }
      photosStore[id].unshift(newPhoto);
      os.photos = photosStore[id];
      savePersistedPhotos();

      // Persist to Postgres if available
      if (pgPool) {
        try {
          await pgPool.query(
            `INSERT INTO service_order_photos (id, os_id, photo_data, created_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (id) DO UPDATE SET photo_data = $3`,
            [photoId, id, JSON.stringify(newPhoto)]
          );
        } catch (e) {
          console.error('Erro ao persistir foto no Postgres:', e);
        }
      }

      // Audit Log
      const audit: AuditLog = {
        id: `log-${Date.now()}`,
        userId: req.user?.id || 'sys',
        userName: req.user?.name || 'Técnico',
        userRole: req.user?.role || 'technician',
        action: 'REGISTRAR_FOTO',
        targetId: id,
        details: `Registrou fotografia do atendimento (${category}) na OS ${id}: ${newPhoto.description || 'Sem descrição'}`,
        createdAt: new Date().toISOString(),
      };
      auditLogsStore.unshift(audit);

      notifyAll(
        `Foto Adicionada na ${id}`,
        `${req.user?.name || 'Técnico'} registrou uma foto: "${category}"`,
        'info',
        id
      );

      res.status(201).json(newPhoto);
    } catch (err: any) {
      console.error('Erro ao salvar foto:', err);
      res.status(500).json({ error: 'Erro interno ao processar e salvar a fotografia: ' + err.message });
    }
  });

  // Serve photo file binary
  app.get('/api/service-orders/:id/photos/:photoId/file', (req: Request, res: Response) => {
    const { id, photoId } = req.params;
    const osPhotos = photosStore[id] || [];
    const photo = osPhotos.find((p) => p.id === photoId);

    if (!photo || !photo.filePath || !fs.existsSync(photo.filePath)) {
      return res.status(404).json({ error: 'Arquivo de imagem não encontrado.' });
    }

    res.setHeader('Content-Type', photo.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(photo.filePath);
  });

  // Delete photo
  app.delete('/api/service-orders/:id/photos/:photoId', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { id, photoId } = req.params;
    const os = serviceOrdersStore.find((item) => item.id === id);
    if (!os) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    const osPhotos = photosStore[id] || [];
    const photoIndex = osPhotos.findIndex((p) => p.id === photoId);
    if (photoIndex === -1) {
      return res.status(404).json({ error: 'Fotografia não encontrada nesta O.S.' });
    }

    const photo = osPhotos[photoIndex];

    // Authorization: admin or user who uploaded or assigned technician
    const isAdmin = req.user?.role === 'admin';
    const isUploader = req.user?.id && photo.uploadedById === req.user.id;
    const isAssignedTech = req.user?.id && os.technicianId === req.user.id;
    if (!isAdmin && !isUploader && !isAssignedTech) {
      return res.status(403).json({ error: 'Sem permissão para excluir esta fotografia do atendimento.' });
    }

    // Delete file from disk
    try {
      if (photo.filePath && fs.existsSync(photo.filePath)) {
        fs.unlinkSync(photo.filePath);
      }
    } catch (err) {
      console.warn('Aviso: falha ao remover arquivo de imagem do disco:', err);
    }

    // Remove from store
    osPhotos.splice(photoIndex, 1);
    photosStore[id] = osPhotos;
    os.photos = osPhotos;
    savePersistedPhotos();

    // Delete from Postgres if available
    if (pgPool) {
      try {
        await pgPool.query('DELETE FROM service_order_photos WHERE id = $1', [photoId]);
      } catch (e) {
        console.error('Erro ao excluir foto no Postgres:', e);
      }
    }

    // Audit Log
    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user?.id || 'sys',
      userName: req.user?.name || 'Usuário',
      userRole: req.user?.role || 'technician',
      action: 'EXCLUIR_FOTO',
      targetId: id,
      details: `Excluiu fotografia (${photo.category}) da OS ${id}`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    notifyAll(
      `Foto Removida da ${id}`,
      `Fotografia (${photo.category}) excluída por ${req.user?.name}`,
      'info',
      id
    );

    res.json({ success: true, message: 'Fotografia excluída com sucesso.', photoId });
  });

  app.delete('/api/service-orders/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem excluir chamados.' });
    }

    const { id } = req.params;
    const index = serviceOrdersStore.findIndex((os) => os.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
    }

    const removed = serviceOrdersStore.splice(index, 1)[0];

    // Clean up associated photos
    if (photosStore[id]) {
      for (const p of photosStore[id]) {
        try {
          if (p.filePath && fs.existsSync(p.filePath)) fs.unlinkSync(p.filePath);
        } catch {}
      }
      delete photosStore[id];
      savePersistedPhotos();
    }

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EXCLUIR_OS',
      targetId: id,
      details: `Excluiu a ordem de serviço ${id} do cliente ${removed.clientName}`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    notifyAll(`Exclusão de OS`, `A ${id} foi removida pelo Administrador`, 'warning');

    res.json({ message: `Ordem de serviço ${id} excluída com sucesso.` });
  });

  // Admin Reset Database Endpoint
  app.post('/api/admin/reset-database', authenticateToken, (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem zerar o banco de dados.' });
    }
    serviceOrdersStore.length = 0;
    clientsStore.length = 0;
    auditLogsStore.length = 0;
    Object.keys(checklistsStore).forEach((key) => delete checklistsStore[key]);
    Object.keys(signaturesStore).forEach((key) => delete signaturesStore[key]);
    Object.keys(signatureTokensStore).forEach((key) => delete signatureTokensStore[key]);
    savePersistedChecklists();
    savePersistedSignatures();
    savePersistedSignatureTokens();

    notifyAll('Banco Zerado', 'Todas as Ordens de Serviço e Clientes foram removidos. O sistema foi reiniciado.', 'warning');
    res.json({ message: 'Banco de dados zerado com sucesso. Próxima OS iniciará como OS-0001.' });
  });

  // Clients Endpoints
  app.get('/api/clients', authenticateToken, (req: Request, res: Response) => {
    clientsStore.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    res.json(clientsStore);
  });

  app.post('/api/clients', authenticateToken, (req: AuthRequest, res: Response) => {
    const { name, cnpjOrCpf, email, phone, city, address, neighborhood, zipCode, latitude, longitude, coordinates } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
    }

    const newClient: Client = {
      id: `c-${Date.now()}`,
      name,
      cnpjOrCpf: cnpjOrCpf || '',
      email: email || '',
      phone: phone || '',
      city: city || '',
      address: address || '',
      neighborhood: neighborhood || '',
      zipCode: zipCode || '',
      latitude: latitude !== undefined ? latitude : undefined,
      longitude: longitude !== undefined ? longitude : undefined,
      coordinates: coordinates || undefined,
      activeOrdersCount: 0,
    };

    clientsStore.push(newClient);
    clientsStore.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user?.id || 'sys',
      userName: req.user?.name || 'Sistema',
      userRole: req.user?.role || 'admin',
      action: 'CRIAR_CLIENTE',
      targetId: newClient.id,
      details: `Cadastrou novo cliente: ${name}`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    res.status(201).json(newClient);
  });

  app.put('/api/clients/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const clientIndex = clientsStore.findIndex((c) => c.id === id);

    if (clientIndex === -1) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const { name, cnpjOrCpf, email, phone, city, address, neighborhood, zipCode, latitude, longitude, coordinates } = req.body;

    const existing = clientsStore[clientIndex];
    const updatedClient: Client = {
      ...existing,
      name: name !== undefined ? name : existing.name,
      cnpjOrCpf: cnpjOrCpf !== undefined ? cnpjOrCpf : existing.cnpjOrCpf,
      email: email !== undefined ? email : existing.email,
      phone: phone !== undefined ? phone : existing.phone,
      city: city !== undefined ? city : existing.city,
      address: address !== undefined ? address : existing.address,
      neighborhood: neighborhood !== undefined ? neighborhood : existing.neighborhood,
      zipCode: zipCode !== undefined ? zipCode : existing.zipCode,
      latitude: latitude !== undefined ? latitude : existing.latitude,
      longitude: longitude !== undefined ? longitude : existing.longitude,
      coordinates: coordinates !== undefined ? coordinates : existing.coordinates,
    };

    clientsStore[clientIndex] = updatedClient;
    clientsStore.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

    // Update client name in active/existing orders if changed
    if (name && name !== existing.name) {
      serviceOrdersStore.forEach((o) => {
        if (o.clientId === id) {
          o.clientName = name;
        }
      });
    }

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user?.id || 'sys',
      userName: req.user?.name || 'Sistema',
      userRole: req.user?.role || 'admin',
      action: 'EDITAR_CLIENTE',
      targetId: id,
      details: `Atualizou dados do cliente: ${updatedClient.name}`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    res.json(updatedClient);
  });

  app.delete('/api/clients/:id', authenticateToken, (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Acesso negado: Apenas administradores têm permissão para excluir clientes definitivamente.',
      });
    }

    const { id } = req.params;
    const clientIndex = clientsStore.findIndex((c) => c.id === id);
    if (clientIndex === -1) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const removed = clientsStore.splice(clientIndex, 1)[0];

    const audit: AuditLog = {
      id: `log-${Date.now()}`,
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'EXCLUIR_CLIENTE',
      targetId: id,
      details: `Excluiu cliente ${removed.name} (${removed.cnpjOrCpf || 'Sem documento'})`,
      createdAt: new Date().toISOString(),
    };
    auditLogsStore.unshift(audit);

    res.json({ message: `Cliente ${removed.name} excluído com sucesso.` });
  });

  // Dashboard Stats
  app.get('/api/dashboard/stats', authenticateToken, (req: Request, res: Response) => {
    const stats = getDashboardStats();
    res.json(stats);
  });

  // Audit Logs
  const getLogsHandler = (req: Request, res: Response) => {
    res.json(auditLogsStore.slice(0, 50));
  };
  app.get('/api/logs', authenticateToken, getLogsHandler);
  app.get('/api/audit-logs', authenticateToken, getLogsHandler);

  // Notifications
  app.get('/api/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
    const userNotifs = notificationsStore.filter(
      (n) => n.userId === 'all' || n.userId === req.user?.id
    );
    res.json(userNotifs.slice(0, 20));
  });

  app.put('/api/notifications/read-all', authenticateToken, (req: AuthRequest, res: Response) => {
    notificationsStore.forEach((n) => {
      if (n.userId === 'all' || n.userId === req.user?.id) {
        n.read = true;
      }
    });
    res.json({ success: true });
  });

  // ========================================================
  // Reports API - EXCLUSIVO PARA PERFIL ADMIN
  // Controle de O.S. com métricas por status e filtros por período
  // ========================================================
  app.get('/api/reports/os-summary', authenticateToken, (req: AuthRequest, res: Response) => {
    // Validação estrita de autorização RBAC
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Acesso restrito: Apenas usuários administradores têm permissão para acessar relatórios.',
      });
    }

    const period = (req.query.period as string) || 'month'; // 'day' | 'week' | 'month' | 'year'
    const dateParam = (req.query.date as string) || '';
    const tzOffsetParam = req.query.tzOffset ? parseInt(req.query.tzOffset as string, 10) : undefined;
    const hasTz = tzOffsetParam !== undefined && !isNaN(tzOffsetParam);

    let base = new Date();
    if (dateParam) {
      const parts = dateParam.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          base = new Date(y, m, d);
        }
      } else {
        const parsed = new Date(dateParam);
        if (!isNaN(parsed.getTime())) base = parsed;
      }
    }

    let start: Date;
    let end: Date;

    const y = base.getFullYear();
    const m = base.getMonth();
    const d = base.getDate();

    if (period === 'day') {
      if (hasTz) {
        start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) + tzOffsetParam * 60000);
        end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) + tzOffsetParam * 60000);
      } else {
        start = new Date(y, m, d, 0, 0, 0, 0);
        end = new Date(y, m, d, 23, 59, 59, 999);
      }
    } else if (period === 'week') {
      // Semana iniciando sempre na Segunda-feira (00:00:00) e encerrando no Domingo (23:59:59)
      const dayOfWeek = base.getDay();
      const diffToMonday = d - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      if (hasTz) {
        const mondayStart = new Date(Date.UTC(y, m, diffToMonday, 0, 0, 0, 0) + tzOffsetParam * 60000);
        start = mondayStart;
        end = new Date(start.getTime() + (7 * 24 * 3600 * 1000) - 1);
      } else {
        const mondayStart = new Date(y, m, diffToMonday, 0, 0, 0, 0);
        start = mondayStart;
        end = new Date(start.getTime() + (7 * 24 * 3600 * 1000) - 1);
      }
    } else if (period === 'month') {
      // Primeiro ao último dia do mês (00:00:00 até 23:59:59)
      if (hasTz) {
        start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) + tzOffsetParam * 60000);
        const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
        end = new Date(Date.UTC(y, m, lastDayOfMonth, 23, 59, 59, 999) + tzOffsetParam * 60000);
      } else {
        start = new Date(y, m, 1, 0, 0, 0, 0);
        end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      }
    } else {
      // Ano completo: 1º de janeiro (00:00:00) a 31 de dezembro (23:59:59)
      if (hasTz) {
        start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0) + tzOffsetParam * 60000);
        end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999) + tzOffsetParam * 60000);
      } else {
        start = new Date(y, 0, 1, 0, 0, 0, 0);
        end = new Date(y, 11, 31, 23, 59, 59, 999);
      }
    }

    const startTime = start.getTime();
    const endTime = end.getTime();

    // Filtra as O.S. do sistema pelo intervalo de tempo do período selecionado
    const filteredOrders = serviceOrdersStore.filter((os) => {
      const t = new Date(os.createdAt).getTime();
      return !isNaN(t) && t >= startTime && t <= endTime;
    });

    // Contagem rigorosa por status
    const abertas = filteredOrders.filter((os) => os.status === 'Aberta').length;
    const emAndamento = filteredOrders.filter(
      (os) =>
        os.status === 'Em Andamento' ||
        os.status === 'Aguardando Peças' ||
        os.status === 'Aguardando Cliente' ||
        os.status === 'Finalizado pelo Técnico'
    ).length;
    const finalizadas = filteredOrders.filter((os) => os.status === 'Finalizado').length;
    const encerradas = filteredOrders.filter((os) => os.status === 'Encerrado').length;
    const total = filteredOrders.length;

    const statusBreakdown = [
      {
        status: 'Abertas',
        count: abertas,
        percentage: total > 0 ? Math.round((abertas / total) * 100) : 0,
        color: '#2563eb', // blue-600
      },
      {
        status: 'Em andamento',
        count: emAndamento,
        percentage: total > 0 ? Math.round((emAndamento / total) * 100) : 0,
        color: '#f59e0b', // amber-500
      },
      {
        status: 'Finalizadas',
        count: finalizadas,
        percentage: total > 0 ? Math.round((finalizadas / total) * 100) : 0,
        color: '#10b981', // emerald-500
      },
      {
        status: 'Encerradas',
        count: encerradas,
        percentage: total > 0 ? Math.round((encerradas / total) * 100) : 0,
        color: '#6366f1', // indigo-500
      },
    ];

    // Ordenação decrescente de criação
    const sortedOrders = [...filteredOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({
      period,
      referenceDate: base.toISOString(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      summary: {
        total,
        abertas,
        emAndamento,
        finalizadas,
        encerradas,
      },
      statusBreakdown,
      orders: sortedOrders,
    });
  });

  // ========================================================
  // AI Endpoints (Google GenAI - Gemini 3.8 Flash)
  // Utiliza a variável de ambiente API_KEY com validação prévia.
  // ========================================================

  app.get('/api/ai/status', authenticateToken, (req: Request, res: Response) => {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);
    res.json({ configured: isConfigured });
  });

  app.post('/api/ai/diagnose', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { client, error } = getGeminiClient();
    if (!client) {
      return res.status(503).json({
        error: error || 'A variável de ambiente API_KEY não está configurada no servidor.',
      });
    }

    const { osId, equipment, category, description, notes } = req.body;
    if (!equipment && !description) {
      return res.status(400).json({ error: 'Equipamento ou descrição do problema são necessários para o diagnóstico.' });
    }

    try {
      const prompt = `Você é um assistente de inteligência artificial especializado em suporte e engenharia de TI para Ordens de Serviço.
Com base nos dados a seguir, elabore um diagnóstico técnico preliminar, estruturado e objetivo:

Identificador da O.S.: ${osId || 'N/A'}
Equipamento: ${equipment || 'Não especificado'}
Categoria: ${category || 'TI'}
Descrição do Problema: ${description || 'Sem detalhes fornecidos'}
${notes ? `Histórico/Notas adicionais: ${notes}` : ''}

Forneça sua resposta em tópicos claros:
1. 🔍 Prováveis Causas Raiz
2. 🛠️ Procedimentos de Teste e Validação
3. 📦 Componentes/Peças Suspeitas
4. 📝 Sugestão de Laudo Técnico Preliminar`;

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      res.json({
        diagnosis: response.text,
      });
    } catch (err: any) {
      console.error('Erro ao executar diagnóstico com Gemini API:', err);
      res.status(500).json({
        error: 'Erro ao processar diagnóstico com IA: ' + (err.message || 'Falha de comunicação com o serviço de IA.'),
      });
    }
  });

  app.post('/api/ai/generate-solution', authenticateToken, async (req: AuthRequest, res: Response) => {
    const { client, error } = getGeminiClient();
    if (!client) {
      return res.status(503).json({
        error: error || 'A variável de ambiente API_KEY não está configurada no servidor.',
      });
    }

    const { equipment, category, problemDescription, technicalNotes } = req.body;
    if (!technicalNotes && !problemDescription) {
      return res.status(400).json({ error: 'Informe anotações técnicas para gerar o laudo.' });
    }

    try {
      const prompt = `Você é um redator técnico e especialista em TI. Formate um Laudo Técnico de Resolução formal para encerramento de Ordem de Serviço com base nas informações:

Equipamento: ${equipment || 'Equipamento de TI'}
Categoria: ${category || 'TI'}
Problema Original: ${problemDescription || 'Manutenção'}
Anotações do Técnico: ${technicalNotes || 'Serviço realizado conforme normas.'}

Gere um texto profissional, conciso e claro para constar no comprovante do cliente e no histórico do sistema.`;

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      res.json({
        solution: response.text,
      });
    } catch (err: any) {
      console.error('Erro ao gerar laudo com Gemini API:', err);
      res.status(500).json({
        error: 'Erro ao gerar laudo com IA: ' + (err.message || 'Falha no processamento.'),
      });
    }
  });

  // Serve Frontend Assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Pliioou TI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
