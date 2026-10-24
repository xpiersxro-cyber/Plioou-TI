import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertTriangle,
  History,
  FileText,
  Download,
  Printer,
  DollarSign,
  CreditCard,
  Lock,
  Sparkles,
  Check,
  MessageSquare,
  Plus,
  ShoppingBag,
  Share2,
  ExternalLink,
  Phone,
  Building,
  Eye,
  Copy,
  Calculator,
  Maximize2,
  Minimize2,
  Navigation,
  Map,
  Compass,
  MapPin,
  Loader2,
  Bot,
  PenTool,
  ShieldCheck,
  Camera,
  Calendar,
} from 'lucide-react';
import { ServiceOrder, OSStatus, OSPriority, User as UserType, Client, QuoteItem, QuoteHistoryItem, ChecklistItem, DigitalSignature, ServiceOrderPhoto } from '../types';
import { generateSimplePDF, generateCompletePDF, generateQuotePDF } from '../utils/pdfGenerator';
import { getGoogleMapsUrl, getWazeUrl } from '../utils/gpsUtils';
import { ChecklistPanel } from './ChecklistPanel';
import { SignaturePanel } from './SignaturePanel';
import { ClientRemoteSignView } from './ClientRemoteSignView';
import { ServicePhotosPanel } from './ServicePhotosPanel';

interface OSDetailDrawerProps {
  os: ServiceOrder | null;
  onClose: () => void;
  technicians: UserType[];
  clients?: Client[];
  currentUser: UserType;
  token?: string | null;
  onUpdateStatus: (
    osId: string,
    status?: OSStatus,
    technicianId?: string,
    additionalData?: Partial<ServiceOrder>
  ) => void;
  onAddNote: (osId: string, noteContent: string) => void;
  onDeleteOS?: (osId: string) => void;
  onUpdateChecklist?: (osId: string, checklist: ChecklistItem[]) => void;
  onUpdateSignature?: (osId: string, signature: DigitalSignature) => void;
  onUpdatePhotos?: (osId: string, photos: ServiceOrderPhoto[]) => void;
}

export const OSDetailDrawer: React.FC<OSDetailDrawerProps> = ({
  os,
  onClose,
  technicians,
  clients = [],
  currentUser,
  token,
  onUpdateStatus,
  onAddNote,
  onDeleteOS,
  onUpdateChecklist,
  onUpdateSignature,
  onUpdatePhotos,
}) => {
  const [noteText, setNoteText] = useState('');
  const [selectedTech, setSelectedTech] = useState<string>('');

  // Drawer Navigation Tab & Full Screen State
  const [drawerTab, setDrawerTab] = useState<'geral' | 'orcamento' | 'financeiro' | 'historico' | 'assinatura' | 'fotos'>('geral');
  const [showQuotePreviewModal, setShowQuotePreviewModal] = useState<boolean>(false);
  const [showClientSignModal, setShowClientSignModal] = useState<boolean>(false);
  const [previewSignToken, setPreviewSignToken] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isModalFullScreen, setIsModalFullScreen] = useState<boolean>(false);

  // Financial States (Admin)
  const [laborCost, setLaborCost] = useState<number | string>('');
  const [partsCost, setPartsCost] = useState<number | string>('');
  const [discountCost, setDiscountCost] = useState<number | string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [financialNotes, setFinancialNotes] = useState<string>('');
  const [technicalSolution, setTechnicalSolution] = useState<string>('');

  // Pre-Budget / Quote States
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [quoteStatus, setQuoteStatus] = useState<'Pendente' | 'Enviado' | 'Aprovado' | 'Rejeitado' | 'Recusado'>('Pendente');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [quoteHistory, setQuoteHistory] = useState<QuoteHistoryItem[]>([]);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<number | string>(1);
  const [newItemPrice, setNewItemPrice] = useState<number | string>('');

  // Checklist State
  const [currentChecklist, setCurrentChecklist] = useState<ChecklistItem[]>(os?.checklist || []);

  // Photos State
  const [currentPhotos, setCurrentPhotos] = useState<ServiceOrderPhoto[]>(os?.photos || []);

  // UI Feedback & Report Generating State
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<'simple' | 'complete' | null>(null);

  // Tech Finish Modal
  const [showTechModal, setShowTechModal] = useState<boolean>(false);

  // AI Assistant States (Gemini via server API_KEY)
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSolutionLoading, setAiSolutionLoading] = useState<boolean>(false);

  const handleGenerateDiagnosis = async () => {
    if (!os) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-user-id': currentUser.id,
      };
      const storedToken = localStorage.getItem('plioou_jwt');
      if (storedToken && storedToken !== 'demo_token') {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          osId: os.id,
          equipment: os.equipment,
          category: os.category,
          description: os.description,
          notes: os.notes?.map((n) => n.content).join('; ') || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || 'Não foi possível gerar o diagnóstico com IA.');
      } else {
        setAiDiagnosis(data.diagnosis);
      }
    } catch (err: any) {
      setAiError(err.message || 'Falha de comunicação com o servidor ao consultar IA.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateSolution = async () => {
    if (!os) return;
    setAiSolutionLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-dev-user-id': currentUser.id,
      };
      const storedToken = localStorage.getItem('plioou_jwt');
      if (storedToken && storedToken !== 'demo_token') {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch('/api/ai/generate-solution', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          equipment: os.equipment,
          category: os.category,
          problemDescription: os.description,
          technicalNotes: technicalSolution || os.notes?.map((n) => n.content).join('; ') || 'Serviço executado com sucesso.',
        }),
      });

      const data = await res.json();
      if (res.ok && data.solution) {
        setTechnicalSolution(data.solution);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err: any) {
      alert('Erro ao consultar IA: ' + (err.message || 'Falha de conexão.'));
    } finally {
      setAiSolutionLoading(false);
    }
  };

  useEffect(() => {
    if (os) {
      setLaborCost(os.laborCost !== undefined ? os.laborCost : '');
      setPartsCost(os.partsCost !== undefined ? os.partsCost : '');
      setDiscountCost(os.discountCost !== undefined ? os.discountCost : '');
      setPaymentMethod(os.paymentMethod || 'Pix');
      setFinancialNotes(os.financialNotes || '');
      setTechnicalSolution(os.technicalSolution || '');
      setSelectedTech(os.technicianId || '');

      // Load Quote
      setQuoteItems(os.quoteItems || []);
      setQuoteStatus(os.quoteStatus || 'Pendente');
      setQuoteNotes(os.quoteNotes || '');
      setQuoteHistory(os.quoteHistory || []);

      // Load Checklist
      setCurrentChecklist(os.checklist || []);

      // Load Photos
      setCurrentPhotos(os.photos || []);
    }
  }, [os]);

  const handleChecklistUpdated = (items: ChecklistItem[]) => {
    setCurrentChecklist(items);
    if (onUpdateChecklist && os) {
      onUpdateChecklist(os.id, items);
    }
  };

  const handleSignatureSaved = (signature: DigitalSignature) => {
    if (os) {
      os.signature = signature;
    }
    if (onUpdateSignature && os) {
      onUpdateSignature(os.id, signature);
    }
    setSaveFeedback('Assinatura de aceite registrada e vinculada com sucesso à O.S.!');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handlePhotosUpdated = (photos: ServiceOrderPhoto[]) => {
    setCurrentPhotos(photos);
    if (os) {
      os.photos = photos;
    }
    if (onUpdatePhotos && os) {
      onUpdatePhotos(os.id, photos);
    }
  };

  const handleGenerateReportPDF = async (type: 'simple' | 'complete') => {
    if (!os) return;
    setGeneratingPdf(type);
    try {
      // Direct query to the backend for the authoritative persisted data of this exact OS
      let reportOS: ServiceOrder = {
        ...os,
        checklist: currentChecklist,
        photos: currentPhotos,
      };

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (currentUser?.id) headers['x-dev-user-id'] = currentUser.id;
        const effectiveToken = token || localStorage.getItem('plioou_jwt');
        if (effectiveToken && effectiveToken !== 'demo_token') headers['Authorization'] = `Bearer ${effectiveToken}`;

        const res = await fetch(`/api/service-orders/${os.id}`, { headers });
        if (res.ok) {
          const freshData = await res.json();
          if (freshData && freshData.id === os.id) {
            reportOS = freshData;
            if (freshData.checklist && Array.isArray(freshData.checklist)) {
              setCurrentChecklist(freshData.checklist);
            }
            if (freshData.photos && Array.isArray(freshData.photos)) {
              setCurrentPhotos(freshData.photos);
              reportOS.photos = freshData.photos;
            }
          }
        }
      } catch (networkErr) {
        console.warn('Falha na sincronização remota, utilizando dados locais para validação:', networkErr);
      }

      // Fallback check on checklist endpoint if not present
      if (!reportOS.checklist || reportOS.checklist.length === 0) {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (currentUser?.id) headers['x-dev-user-id'] = currentUser.id;
          const effectiveToken = token || localStorage.getItem('plioou_jwt');
          if (effectiveToken && effectiveToken !== 'demo_token') headers['Authorization'] = `Bearer ${effectiveToken}`;

          const chkRes = await fetch(`/api/service-orders/${os.id}/checklist`, { headers });
          if (chkRes.ok) {
            const chkData = await chkRes.json();
            if (Array.isArray(chkData) && chkData.length > 0) {
              reportOS.checklist = chkData;
              setCurrentChecklist(chkData);
            }
          }
        } catch (chkErr) {
          console.error('Erro ao consultar endpoint de checklist:', chkErr);
        }
      }

      // Requirement 10: Validate data integrity before emitting document
      if (!reportOS.checklist || reportOS.checklist.length === 0) {
        alert(`Falha na validação do relatório: Não foi possível recuperar a lista de verificação técnica da ${os.id}. O relatório não foi gerado para impedir a emissão de um documento incompleto.`);
        return;
      }

      // Preload photo base64 data for PDF inclusion if not already cached
      if (reportOS.photos && reportOS.photos.length > 0) {
        for (const p of reportOS.photos) {
          if (!p.base64Data && p.fileUrl) {
            try {
              const res = await fetch(p.fileUrl);
              if (res.ok) {
                const blob = await res.blob();
                p.base64Data = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                });
              }
            } catch (imgLoadErr) {
              console.warn('Não foi possível pré-carregar imagem para o PDF:', imgLoadErr);
            }
          }
        }
      }

      // Generate the requested PDF
      if (type === 'complete') {
        generateCompletePDF(reportOS);
      } else {
        generateSimplePDF(reportOS);
      }
    } catch (err: any) {
      console.error('Erro ao emitir relatório técnico:', err);
      alert(`Falha ao emitir relatório técnico: ${err.message || 'Erro inesperado.'}`);
    } finally {
      setGeneratingPdf(null);
    }
  };

  if (!os) return null;

  // Find Client Data for WhatsApp
  const clientObj = clients.find(
    (c) => c.id === os.clientId || c.name.toLowerCase() === os.clientName.toLowerCase()
  );
  const clientPhone = clientObj?.phone || '';

  const getWhatsAppUrl = (phoneStr: string, textStr: string) => {
    let cleanDigits = phoneStr.replace(/\D/g, '');
    if (!cleanDigits) return '#';
    if (!cleanDigits.startsWith('55') && cleanDigits.length <= 11) {
      cleanDigits = '55' + cleanDigits;
    }
    return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(textStr)}`;
  };

  const numLabor = parseFloat(String(laborCost)) || 0;
  const numParts = parseFloat(String(partsCost)) || 0;
  const numDiscount = parseFloat(String(discountCost)) || 0;
  const totalCalculated = Math.max(0, numLabor + numParts - numDiscount);

  const quoteTotal = quoteItems.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

  const handleStatusChange = (newStatus: OSStatus) => {
    onUpdateStatus(os.id, newStatus, selectedTech || os.technicianId);
  };

  const handleTechChange = (newTechId: string) => {
    setSelectedTech(newTechId);
    onUpdateStatus(os.id, os.status, newTechId);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    onAddNote(os.id, noteText);
    setNoteText('');
  };

  const handleSaveFinancials = () => {
    onUpdateStatus(os.id, os.status, selectedTech || os.technicianId, {
      laborCost: numLabor,
      partsCost: numParts,
      discountCost: numDiscount,
      totalCost: totalCalculated,
      paymentMethod,
      financialNotes,
    });
    setSaveFeedback('Financeiro salvo com sucesso!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleCloseOSByAdmin = () => {
    onUpdateStatus(os.id, 'Encerrado', selectedTech || os.technicianId, {
      laborCost: numLabor,
      partsCost: numParts,
      discountCost: numDiscount,
      totalCost: totalCalculated,
      paymentMethod,
      financialNotes,
      closedAt: new Date().toISOString(),
      closedBy: currentUser.name,
    });
    setSaveFeedback('O.S. encerrada e faturada com sucesso!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleFinishTechService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!technicalSolution.trim()) return;

    onUpdateStatus(os.id, 'Finalizado pelo Técnico', selectedTech || os.technicianId, {
      technicalSolution,
    });

    setShowTechModal(false);
  };

  // Quote Item Handlers
  const handleAddQuoteItem = () => {
    if (!newItemName.trim()) return;
    const qty = parseInt(String(newItemQty)) || 1;
    const price = parseFloat(String(newItemPrice)) || 0;

    const newItem: QuoteItem = {
      id: `q-${Date.now()}`,
      name: newItemName.trim(),
      quantity: qty,
      unitPrice: price,
    };

    const updatedList = [...quoteItems, newItem];
    setQuoteItems(updatedList);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice('');

    // Auto update parts cost
    const newQuoteSum = updatedList.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    setPartsCost(newQuoteSum);
  };

  const handleRemoveQuoteItem = (id: string) => {
    const updatedList = quoteItems.filter((i) => i.id !== id);
    setQuoteItems(updatedList);
    const newQuoteSum = updatedList.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
    setPartsCost(newQuoteSum);
  };

  const handleUpdateQuoteStatus = (
    newStatus: 'Pendente' | 'Enviado' | 'Aprovado' | 'Rejeitado' | 'Recusado',
    customNote?: string
  ) => {
    setQuoteStatus(newStatus);

    const historyItem: QuoteHistoryItem = {
      id: `qh-${Date.now()}`,
      status: newStatus,
      updatedBy: currentUser.name,
      updatedRole: currentUser.role,
      createdAt: new Date().toISOString(),
      note: customNote || (
        newStatus === 'Aprovado'
          ? 'Aceite do orçamento registrado com sucesso.'
          : newStatus === 'Rejeitado' || newStatus === 'Recusado'
          ? 'Proposta de orçamento rejeitada pelo cliente.'
          : newStatus === 'Enviado'
          ? 'Orçamento enviado para aprovação do cliente.'
          : 'Status do orçamento retornado para Pendente.'
      ),
    };

    const updatedHistory = [historyItem, ...quoteHistory];
    setQuoteHistory(updatedHistory);

    const newPartsCost = quoteItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);

    onUpdateStatus(os.id, os.status, selectedTech || os.technicianId, {
      quoteItems,
      quoteStatus: newStatus,
      quoteNotes,
      quoteHistory: updatedHistory,
      partsCost: newPartsCost,
    });

    setSaveFeedback(`Status do orçamento atualizado para "${newStatus}"!`);
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const handleSaveQuote = () => {
    const newPartsCost = quoteItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);

    let updatedHistory = [...quoteHistory];
    if (quoteStatus !== os.quoteStatus) {
      const historyItem: QuoteHistoryItem = {
        id: `qh-${Date.now()}`,
        status: quoteStatus,
        updatedBy: currentUser.name,
        updatedRole: currentUser.role,
        createdAt: new Date().toISOString(),
        note: `Status alterado para ${quoteStatus}`,
      };
      updatedHistory = [historyItem, ...updatedHistory];
      setQuoteHistory(updatedHistory);
    }

    onUpdateStatus(os.id, os.status, selectedTech || os.technicianId, {
      quoteItems,
      quoteStatus,
      quoteNotes,
      quoteHistory: updatedHistory,
      partsCost: newPartsCost,
    });

    setSaveFeedback('Cotação e Orçamento salvos com sucesso!');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  const buildQuoteWhatsAppMessage = () => {
    let msg = `📋 *PRÉ-ORÇAMENTO / COTAÇÃO DE PEÇAS*\n`;
    msg += `🏢 *Cliente:* ${os.clientName}\n`;
    msg += `🛠️ *O.S.:* ${os.id} | *Equipamento:* ${os.equipment}\n\n`;

    if (quoteItems.length > 0) {
      msg += `*Peças / Componentes Necessários:*\n`;
      quoteItems.forEach((item) => {
        msg += `• ${item.name} (${item.quantity}x) - ${item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
      });
      msg += `\n💰 *Total das Peças:* ${quoteTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
    }

    if (numLabor > 0) {
      msg += `🔧 *Mão de Obra Estimada:* ${numLabor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
      msg += `🏷️ *Valor Total Estimado:* ${totalCalculated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n`;
    }

    if (quoteNotes.trim()) {
      msg += `\n📝 *Observações:* ${quoteNotes}\n`;
    }

    msg += `\nPor favor, responda a esta mensagem com *APROVADO* para autorizarmos a compra e manutenção.\n`;
    msg += `_Plioou TI & Serviços_`;
    return msg;
  };

  const handleCopyQuoteText = () => {
    const text = buildQuoteWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const buildStatusWhatsAppMessage = () => {
    let msg = `📢 *ATUALIZAÇÃO DE O.S. ${os.id}*\n`;
    msg += `Olá, *${os.clientName}*!\n\n`;
    msg += `Seu atendimento técnico referente ao equipamento *${os.equipment}* teve atualização de status:\n`;
    msg += `📌 *Status Atual:* ${os.status}\n`;

    if (os.status === 'Finalizado pelo Técnico' || os.status === 'Finalizado' || os.status === 'Encerrado') {
      msg += `✅ *Resumo do Serviço:* ${os.technicalSolution || 'Atendimento concluído com sucesso.'}\n`;
      if (os.totalCost && os.totalCost > 0) {
        msg += `💵 *Valor Total:* ${os.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${os.paymentMethod || 'A combinar'})\n`;
      }
      msg += `\nEquipamento liberado e pronto para retirada/faturamento.\n`;
    }

    msg += `\nQualquer dúvida estamos à disposição!\n_Plioou TI & Serviços_`;
    return msg;
  };

  const statusOptions: OSStatus[] = [
    'Aberta',
    'Em Andamento',
    'Aguardando Peças',
    'Aguardando Cliente',
    'Finalizado pelo Técnico',
    'Encerrado',
  ];

  const stepperSteps = [
    { label: 'Aberta' },
    { label: 'Em Andamento' },
    { label: 'Aguardando Peças / Cliente' },
    { label: 'Finalizado Técnico' },
    { label: 'Encerrado & Faturado' },
  ];

  const getCurrentStepIndex = () => {
    if (os.status === 'Aberta') return 0;
    if (os.status === 'Em Andamento') return 1;
    if (os.status === 'Aguardando Peças' || os.status === 'Aguardando Cliente') return 2;
    if (os.status === 'Finalizado pelo Técnico' || os.status === 'Finalizado') return 3;
    if (os.status === 'Encerrado') return 4;
    return 0;
  };

  const currentStepIdx = getCurrentStepIndex();

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-200">
      <div className={`bg-white w-full h-full shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${isFullScreen ? 'max-w-full' : 'max-w-5xl'}`}>
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white">{os.id}</h2>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    os.status === 'Encerrado'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : os.status === 'Finalizado pelo Técnico' || os.status === 'Finalizado'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : os.status === 'Em Andamento'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  }`}
                >
                  {os.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium flex items-center gap-2">
                <span>Cliente: <strong className="text-slate-200">{os.clientName}</strong></span>
                {clientPhone && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {clientPhone}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct WhatsApp Button */}
            {clientPhone ? (
              <a
                href={getWhatsAppUrl(clientPhone, buildStatusWhatsAppMessage())}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                title="Abrir WhatsApp diretamente com o número do cliente"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            ) : (
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                Sem celular cadastrado
              </span>
            )}

            {onDeleteOS && currentUser.role === 'admin' && (
              <button
                onClick={() => {
                  if (confirm(`Tem certeza que deseja excluir permanentemente a O.S. ${os.id}?`)) {
                    onDeleteOS(os.id);
                    onClose();
                  }
                }}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
                title="Excluir O.S. (Apenas Admin)"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title={isFullScreen ? 'Reduzir Tamanho (Visualizador Padrão)' : 'Expandir para Tela Cheia (Full Viewer)'}
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5 text-indigo-400" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Banner if saved */}
        {saveFeedback && (
          <div className="bg-emerald-600 text-white px-6 py-2 text-xs font-bold flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {saveFeedback}
            </span>
            <button onClick={() => setSaveFeedback(null)} className="opacity-80 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Visual Workflow Stepper Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 shrink-0">
          <div className="relative flex items-center justify-between max-w-3xl mx-auto">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-800 z-0" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-500 transition-all duration-300 z-0"
              style={{
                width: `${(currentStepIdx / (stepperSteps.length - 1)) * 100}%`,
              }}
            />

            {stepperSteps.map((step, idx) => {
              const isDone = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step.label} className="relative z-10 flex flex-col items-center gap-1 group">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isDone
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : isCurrent
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20 font-extrabold scale-110 shadow-lg'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-bold text-center ${
                      isCurrent
                        ? 'text-emerald-400 font-extrabold'
                        : isDone
                        ? 'text-slate-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drawer Navigation Tabs Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5 py-2">
            <button
              type="button"
              onClick={() => setDrawerTab('geral')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                drawerTab === 'geral'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Geral & Checklist</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerTab('orcamento')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                drawerTab === 'orcamento'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Orçamentos & Cotação</span>
              {quoteItems.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-400/30 text-indigo-200 font-extrabold">
                  {quoteItems.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDrawerTab('financeiro')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                drawerTab === 'financeiro'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Financeiro & Faturamento</span>
              {currentUser.role !== 'admin' && (
                <Lock className="w-3 h-3 text-amber-400 ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setDrawerTab('historico')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                drawerTab === 'historico'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Apontamentos ({os.notes?.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerTab('assinatura')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                drawerTab === 'assinatura'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Assinatura Digital</span>
              {os.signature && os.signature.status === 'signed' ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-400/30 text-emerald-200 font-extrabold flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Assinado
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 font-bold">
                  Pendente
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setDrawerTab('fotos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                drawerTab === 'fotos'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Fotos</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-400/30 text-blue-200 font-extrabold">
                {currentPhotos.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowQuotePreviewModal(true)}
            className="hidden md:flex px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-bold items-center gap-1.5 transition cursor-pointer"
            title="Visualizar proposta comercial formatada para o cliente"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ver Proposta do Cliente</span>
          </button>
        </div>

        {/* SLA Stalled Alert */}
        {(os.stalledHours || 0) >= 48 && os.status !== 'Encerrado' && (
          <div className="bg-rose-600 text-white px-6 py-2 flex items-center gap-2 text-xs font-bold shrink-0">
            <AlertTriangle className="w-4 h-4 animate-bounce shrink-0" />
            <span>Alerta de SLA: Chamado sem movimentação há {os.stalledHours} horas.</span>
          </div>
        )}

        {/* Technician Completed Banner Notice for Admin */}
        {(os.status === 'Finalizado pelo Técnico' || os.status === 'Finalizado') && (
          <div className="bg-cyan-900/90 text-cyan-100 border-b border-cyan-800 px-6 py-3 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse shrink-0" />
              <div>
                <p className="text-cyan-200">
                  <strong className="text-white">Atendimento Técnico Concluído!</strong> O técnico responsável finalizou os trabalhos.
                </p>
                <p className="text-[11px] text-cyan-300 font-medium">
                  Confira os valores no bloco financeiro abaixo e clique em <strong className="text-white">Encerrar O.S. (Faturar)</strong>.
                </p>
              </div>
            </div>
            {currentUser.role === 'admin' && (
              <button
                onClick={() => {
                  const el = document.getElementById('financial-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition shrink-0 cursor-pointer"
              >
                Ir ao Financeiro
              </button>
            )}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/50">
          {/* Claim OS Button if unassigned */}
          {(!os.technicianId || os.technicianId !== currentUser.id) && os.status !== 'Encerrado' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-600" />
                  {!os.technicianId ? 'O.S. Aberta - Sem Técnico Atribuído' : `Atribuída a: ${os.technicianName}`}
                </h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {!os.technicianId
                    ? 'Clique no botão ao lado para assumir a responsabilidade e iniciar o atendimento.'
                    : 'Deseja transferir/assumir este atendimento para o seu usuário?'}
                </p>
              </div>
              <button
                onClick={() => {
                  const targetStatus = os.status === 'Aberta' ? 'Em Andamento' : os.status;
                  onUpdateStatus(os.id, targetStatus, currentUser.id);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition shrink-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Assumir Atendimento</span>
              </button>
            </div>
          )}

          {/* ASSINATURA DIGITAL TAB VIEW */}
          {drawerTab === 'assinatura' ? (
            <div className="max-w-4xl mx-auto py-2">
              <SignaturePanel
                os={os}
                currentUser={currentUser}
                token={token}
                clientPhone={clientPhone}
                onSignatureSaved={handleSignatureSaved}
                onOpenClientView={(tok) => {
                  setPreviewSignToken(tok);
                  setShowClientSignModal(true);
                }}
              />
            </div>
          ) : drawerTab === 'fotos' ? (
            <div className="max-w-4xl mx-auto py-2">
              <ServicePhotosPanel
                os={os}
                currentUser={currentUser}
                token={token}
                onPhotosUpdated={handlePhotosUpdated}
              />
            </div>
          ) : (
            /* Main 2-Column Responsive Layout */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Call Info, Actions, Pre-Budget, Checklist */}
            <div className="lg:col-span-7 space-y-6">
              {/* Details Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Informações Gerais do Chamado</span>
                  </h3>

                  {clientPhone && (
                    <a
                      href={getWhatsAppUrl(clientPhone, `Olá ${os.clientName}, referente ao equipamento ${os.equipment} (O.S. ${os.id}):`)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Cliente</span>
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Equipamento / Ativo:</span>
                    <span className="font-bold text-slate-800 text-sm">{os.equipment}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Categoria:</span>
                    <span className="font-bold text-slate-800 text-sm">{os.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Origem do Atendimento:</span>
                    <span className="font-bold text-slate-800">{os.origin || 'Interna'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Data de Abertura:</span>
                    <span className="font-bold text-slate-800">
                      {new Date(os.createdAt).toLocaleDateString()} às{' '}
                      {new Date(os.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Agenda / Agendamento do Atendimento */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Agenda / Agendamento do Atendimento
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {os.scheduledDate
                          ? `Agendado para: ${os.scheduledDate} ${os.scheduledTime || ''}`
                          : 'Nenhum agendamento definido para este atendimento.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newDate = prompt('Informe a data do agendamento (Ex: DD/MM/AAAA ou AAAA-MM-DD):', os.scheduledDate || '');
                      if (newDate !== null) {
                        onUpdateStatus(os.id, os.status, selectedTech || os.technicianId, {
                          scheduledDate: newDate,
                        } as any);
                        setSaveFeedback('Agendamento salvo com sucesso!');
                        setTimeout(() => setSaveFeedback(null), 3000);
                      }
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{os.scheduledDate ? 'Alterar Data' : 'Agendar Data'}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block text-xs font-medium mb-1">Descrição do Problema:</span>
                  <p className="p-3.5 bg-slate-50 rounded-xl text-slate-700 text-xs leading-relaxed font-normal border border-slate-200/80">
                    {os.description}
                  </p>
                </div>

                {/* AI Diagnostic Assistant (Powered by server-side API_KEY) */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-indigo-900 font-extrabold text-xs flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span>Diagnóstico Inteligente com IA</span>
                    </span>
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={handleGenerateDiagnosis}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span>Analisando com IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{aiDiagnosis ? 'Recalcular Diagnóstico' : 'Diagnosticar com IA'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {aiError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                      {aiError}
                    </div>
                  )}

                  {aiDiagnosis && (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                      <div className="text-slate-800 text-xs whitespace-pre-line leading-relaxed font-normal">
                        {aiDiagnosis}
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-indigo-100">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(aiDiagnosis);
                            alert('Diagnóstico copiado para a área de transferência!');
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTechnicalSolution((prev) => (prev ? `${prev}\n\n${aiDiagnosis}` : aiDiagnosis));
                            alert('Diagnóstico inserido no Laudo Técnico!');
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Inserir no Laudo</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {os.technicalSolution && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-cyan-700 font-bold block text-xs mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Laudo / Solução Executada pelo Técnico:</span>
                    </span>
                    <p className="p-3.5 bg-cyan-50/60 rounded-xl text-slate-800 text-xs leading-relaxed border border-cyan-200/80 font-medium">
                      {os.technicalSolution}
                    </p>
                  </div>
                )}
              </div>

              {/* Módulo FOTOS & ANEXOS Conforme Padrão de Referência */}
              <ServicePhotosPanel
                os={os}
                currentUser={currentUser}
                token={token}
                onPhotosUpdated={handlePhotosUpdated}
              />

              {/* GPS Address & Navigation Card */}
              {(() => {
                const clientObj = clients?.find(
                  (c) => c.id === os.clientId || c.name.toLowerCase() === os.clientName.toLowerCase()
                );
                const addressText = clientObj?.address
                  ? `${clientObj.address}${clientObj.neighborhood ? ` - ${clientObj.neighborhood}` : ''}${clientObj.city ? `, ${clientObj.city}` : ''}`
                  : null;
                const gpsCoords =
                  os.coordinates ||
                  (os.latitude && os.longitude ? `${os.latitude}, ${os.longitude}` : null) ||
                  clientObj?.coordinates ||
                  (clientObj?.latitude && clientObj?.longitude ? `${clientObj.latitude}, ${clientObj.longitude}` : null);

                return (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <span>Localização & Navegação GPS do Cliente</span>
                      </h3>
                      {gpsCoords && (
                        <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-[10px] font-bold rounded-lg flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-indigo-600" />
                          <span>{gpsCoords}</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-700 space-y-1">
                      <p className="font-bold text-slate-800">
                        {os.clientName} {clientObj?.cnpjOrCpf ? `(${clientObj.cnpjOrCpf})` : ''}
                      </p>
                      <p className="text-slate-600 font-medium">
                        {addressText || 'Endereço não cadastrado detalhadamente.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={getGoogleMapsUrl(gpsCoords || addressText || os.clientName)}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                      >
                        <Map className="w-4 h-4 text-blue-600" />
                        <span>Abrir no Google Maps</span>
                      </a>
                      <a
                        href={getWazeUrl(gpsCoords || addressText || os.clientName)}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2 px-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                      >
                        <Compass className="w-4 h-4 text-cyan-600" />
                        <span>Abrir no Waze</span>
                      </a>
                    </div>
                  </div>
                );
              })()}

              {/* Status & Technician Selector */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Alterar Status da O.S.
                  </label>
                  <select
                    value={os.status}
                    onChange={(e) => handleStatusChange(e.target.value as OSStatus)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  >
                    {statusOptions.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Técnico Responsável
                  </label>
                  <select
                    value={os.technicianId || ''}
                    onChange={(e) => handleTechChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  >
                    <option value="">Sem técnico definido</option>
                    {technicians
                      .filter((t) => t.role === 'technician')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* PRE-BUDGET & PARTS QUOTE SECTION */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
                {/* Header & Status Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        Orçamentos & Cotação de Peças
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Gestão de valores, peças e aceite do cliente
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                        quoteStatus === 'Aprovado'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : quoteStatus === 'Enviado'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : quoteStatus === 'Rejeitado' || quoteStatus === 'Recusado'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {quoteStatus === 'Aprovado' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {quoteStatus === 'Enviado' && <Send className="w-3.5 h-3.5 text-blue-600" />}
                      {(quoteStatus === 'Rejeitado' || quoteStatus === 'Recusado') && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                      {quoteStatus === 'Pendente' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                      <span>
                        {quoteStatus === 'Aprovado'
                          ? 'Orçamento Aprovado'
                          : quoteStatus === 'Enviado'
                          ? 'Enviado ao Cliente'
                          : quoteStatus === 'Rejeitado' || quoteStatus === 'Recusado'
                          ? 'Orçamento Rejeitado'
                          : 'Aguardando Aprovação (Pendente)'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Quick Status Change & Client Acceptance Bar */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Registrar Resposta / Aceite do Cliente:</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Clique no status para gravar no histórico
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuoteStatus('Aprovado')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        quoteStatus === 'Aprovado'
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aprovado (Aceite Dado)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateQuoteStatus('Rejeitado')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        quoteStatus === 'Rejeitado' || quoteStatus === 'Recusado'
                          ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rejeitado pelo Cliente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateQuoteStatus('Enviado')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        quoteStatus === 'Enviado'
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>Marcar como Enviado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateQuoteStatus('Pendente')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        quoteStatus === 'Pendente'
                          ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Marcar Pendente</span>
                    </button>
                  </div>
                </div>

                {/* Form to Add Quote Item */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Adicionar Peça / Insumo ao Orçamento:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Ex: SSD NVMe 500GB Kingston / Memória RAM 16GB DDR4"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="sm:col-span-6 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qtd"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      className="sm:col-span-2 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-center"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Valor Un. (R$)"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="sm:col-span-3 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleAddQuoteItem}
                      className="sm:col-span-1 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center transition cursor-pointer font-bold"
                      title="Adicionar item"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                {quoteItems.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs shadow-2xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Item / Descrição da Peça</th>
                          <th className="p-3 text-center">Qtd</th>
                          <th className="p-3 text-right">Valor Un.</th>
                          <th className="p-3 text-right">Subtotal</th>
                          <th className="p-3 text-center">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {quoteItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                            <td className="p-3 text-center font-bold text-slate-700">{item.quantity}</td>
                            <td className="p-3 text-right text-slate-600 font-medium">
                              {item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-900">
                              {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveQuoteItem(item.id)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 transition rounded-lg hover:bg-rose-50 cursor-pointer"
                                title="Remover peça"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                    Nenhuma peça adicionada a este orçamento ainda. Use o formulário acima para adicionar componentes.
                  </div>
                )}

                {/* Financial Totals Summary Box */}
                <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white rounded-xl space-y-2 border border-slate-800 shadow-sm text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal Peças / Insumos:</span>
                    <span className="font-bold text-white">{quoteTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Mão de Obra Técnica Estimada:</span>
                    <span className="font-bold text-white">{numLabor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700/80 flex justify-between items-center text-sm">
                    <span className="font-extrabold text-white">Investimento Total Estimado:</span>
                    <span className="font-black text-emerald-400 text-base">{totalCalculated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>

                {/* Quote Notes Input */}
                <div className="space-y-1 text-xs">
                  <label className="block font-bold text-slate-700">Observações / Condições do Orçamento:</label>
                  <input
                    type="text"
                    placeholder="Ex: Garantia de 90 dias. Prazo de entrega de 3 dias úteis..."
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
                  />
                </div>

                {/* HISTÓRICO DE ALTERAÇÕES DO ORÇAMENTO (QUOTE HISTORY TIMELINE) */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        Histórico de Alterações & Aceite do Cliente
                      </h4>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600">
                      {quoteHistory.length} registro(s)
                    </span>
                  </div>

                  {quoteHistory.length > 0 ? (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {quoteHistory.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition shadow-2xs ${
                            item.status === 'Aprovado'
                              ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-950'
                              : item.status === 'Rejeitado' || item.status === 'Recusado'
                              ? 'bg-rose-50/80 border-rose-200/90 text-rose-950'
                              : item.status === 'Enviado'
                              ? 'bg-blue-50/80 border-blue-200/90 text-blue-950'
                              : 'bg-amber-50/50 border-amber-200/80 text-amber-950'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {item.status === 'Aprovado' ? (
                              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            ) : item.status === 'Rejeitado' || item.status === 'Recusado' ? (
                              <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
                                <XCircle className="w-4 h-4" />
                              </div>
                            ) : item.status === 'Enviado' ? (
                              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                                <Send className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                                <Clock className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs">
                                  {item.status === 'Aprovado'
                                    ? 'ACEITE REGISTRADO: Orçamento Aprovado'
                                    : item.status === 'Rejeitado' || item.status === 'Recusado'
                                    ? 'Orçamento Rejeitado'
                                    : item.status === 'Enviado'
                                    ? 'Orçamento Enviado ao Cliente'
                                    : 'Status: Pendente'}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/80 border border-slate-200 text-slate-700">
                                  {item.updatedBy} ({item.updatedRole === 'technician' ? 'Técnico' : item.updatedRole === 'admin' ? 'Admin' : 'Cliente'})
                                </span>
                              </div>

                              <span className="text-[10px] font-mono text-slate-500">
                                {new Date(item.createdAt).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {item.note && (
                              <p className="text-[11px] text-slate-700 font-medium leading-relaxed bg-white/60 p-2 rounded-lg border border-slate-200/50">
                                {item.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-medium">
                      Nenhum registro de aceite no histórico ainda. Quando o status do orçamento for atualizado (Ex: Aprovado ou Rejeitado), o técnico verá o registro com data e hora aqui.
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveQuote}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                    >
                      Salvar Cotação & Histórico
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQuotePreviewModal(true)}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-indigo-600" />
                      <span>Ver Proposta do Cliente</span>
                    </button>
                  </div>

                  {clientPhone && (
                    <a
                      href={getWhatsAppUrl(clientPhone, buildQuoteWhatsAppMessage())}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => handleUpdateQuoteStatus('Enviado')}
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Enviar Orçamento no WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Device Checklist Panel */}
              <ChecklistPanel
                osId={os.id}
                deviceType={os.equipment}
                currentUser={currentUser}
                token={token}
                onChecklistUpdated={handleChecklistUpdated}
              />

              {/* Quick Digital Signature Card in General View */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-emerald-600" />
                    <span>Assinatura Digital de Aceite</span>
                  </h3>
                  {os.signature && os.signature.status === 'signed' ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Assinado
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-200">
                      Pendente
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {os.signature && os.signature.status === 'signed'
                    ? `Aceite assinado formalmente por ${os.signature.signerName} (${os.signature.modality === 'presential' ? 'Presencial no Balcão' : 'Remota via Celular'}).`
                    : 'Colete a assinatura presencial no balcão ou envie o link de assinatura remota no WhatsApp do cliente.'}
                </p>
                <button
                  type="button"
                  onClick={() => setDrawerTab('assinatura')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PenTool className="w-4 h-4" />
                  <span>{os.signature && os.signature.status === 'signed' ? 'Ver / Atualizar Assinatura' : 'Abrir Módulo de Assinatura'}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Financials (Admin Only) & Notes */}
            <div className="lg:col-span-5 space-y-6">
              {/* FINANCEIRO / ORÇAMENTO CARD (Strictly Admin Only for Edits) */}
              <div
                id="financial-section"
                className={`border rounded-2xl p-5 shadow-md space-y-4 transition ${
                  currentUser.role !== 'admin'
                    ? 'bg-slate-50 text-slate-800 border-slate-200'
                    : os.status === 'Finalizado pelo Técnico'
                    ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white border-indigo-500/50 ring-2 ring-indigo-500/30'
                    : 'bg-white text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200/20 pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className={`w-5 h-5 ${currentUser.role === 'admin' && os.status === 'Finalizado pelo Técnico' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider">
                      Financeiro / Faturamento
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      currentUser.role === 'admin'
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {currentUser.role === 'admin' ? 'ACESSO EXCLUSIVO ADMIN' : 'RESTRITO A ADMIN'}
                  </span>
                </div>

                {/* IF NOT ADMIN: Display Restricted Banner Notice */}
                {currentUser.role !== 'admin' ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-900 text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-900">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Gestão Financeira Restrita a Administradores</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      O lançamento de valores, descontos, forma de pagamento e o encerramento comercial são realizados exclusivamente pelos Administradores do sistema.
                    </p>
                    {os.totalCost && os.totalCost > 0 ? (
                      <div className="pt-2 border-t border-amber-200/60 font-bold flex justify-between items-center text-xs">
                        <span>Valor Total Cadastrado:</span>
                        <span className="text-emerald-700 text-sm">
                          {os.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* IF ADMIN: Full Interactive Financial Management Form */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold opacity-75 mb-1">
                          Mão de Obra (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={laborCost}
                          onChange={(e) => setLaborCost(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            os.status === 'Finalizado pelo Técnico'
                              ? 'bg-slate-800 text-white border-slate-700'
                              : 'bg-slate-50 text-slate-800 border-slate-200'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold opacity-75 mb-1">
                          Peças / Insumos (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={partsCost}
                          onChange={(e) => setPartsCost(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            os.status === 'Finalizado pelo Técnico'
                              ? 'bg-slate-800 text-white border-slate-700'
                              : 'bg-slate-50 text-slate-800 border-slate-200'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold opacity-75 mb-1">
                          Desconto (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={discountCost}
                          onChange={(e) => setDiscountCost(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            os.status === 'Finalizado pelo Técnico'
                              ? 'bg-slate-800 text-white border-slate-700'
                              : 'bg-slate-50 text-slate-800 border-slate-200'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold opacity-75 mb-1">
                          Forma de Pagamento
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            os.status === 'Finalizado pelo Técnico'
                              ? 'bg-slate-800 text-white border-slate-700'
                              : 'bg-slate-50 text-slate-800 border-slate-200'
                          }`}
                        >
                          <option value="Pix">Pix</option>
                          <option value="Boleto Bancário">Boleto Bancário</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Faturado 30 Dias">Faturado 30 Dias</option>
                          <option value="Garantia / Cortesia">Garantia / Cortesia</option>
                        </select>
                      </div>
                    </div>

                    {/* Total Calculated Banner */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                          Total Calculado da O.S.
                        </span>
                        <span className="text-[10px] opacity-75 block">
                          Mão de Obra + Peças - Desconto
                        </span>
                      </div>
                      <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {totalCalculated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    {/* Financial Notes */}
                    <div>
                      <label className="block text-[11px] font-bold opacity-75 mb-1">
                        Observações Financeiras / Faturamento
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Detalhamento das peças, condições de pagamento ou observações para o cliente..."
                        value={financialNotes}
                        onChange={(e) => setFinancialNotes(e.target.value)}
                        className={`w-full p-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                          os.status === 'Finalizado pelo Técnico'
                            ? 'bg-slate-800 text-white border-slate-700'
                            : 'bg-slate-50 text-slate-800 border-slate-200'
                        }`}
                      />
                    </div>

                    {/* Action Buttons for Admin */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveFinancials}
                        className="w-full py-2.5 px-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Salvar Orçamento</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCloseOSByAdmin}
                        disabled={os.status === 'Encerrado'}
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Encerrar O.S. (Faturar)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* PDF Report Export Section */}
              <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                      Exportar Relatório em PDF
                    </h3>
                  </div>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                    PDF Automático
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  <button
                    onClick={() => handleGenerateReportPDF('simple')}
                    disabled={generatingPdf !== null}
                    className="p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-left transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white group-hover:text-blue-300 transition">
                        <Printer className="w-3.5 h-3.5 text-blue-400" />
                        <span>Relatório Simples</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Resumo com laudo técnico e valores
                      </span>
                    </div>
                    {generatingPdf === 'simple' ? (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                    ) : (
                      <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-300 transition shrink-0" />
                    )}
                  </button>

                  <button
                    onClick={() => handleGenerateReportPDF('complete')}
                    disabled={generatingPdf !== null}
                    className="p-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-left transition flex items-center justify-between group shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <FileText className="w-3.5 h-3.5 text-blue-200" />
                        <span>Relatório Completo</span>
                      </div>
                      <span className="text-[10px] text-blue-100 block mt-0.5">
                        Histórico técnico integral com notas
                      </span>
                    </div>
                    {generatingPdf === 'complete' ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
                    ) : (
                      <Download className="w-4 h-4 text-white transition shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Timeline Notes & Updates */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>Andamentos & Apontamentos</span>
                  </h3>
                  <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {os.notes?.length || 0}
                  </span>
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNoteSubmit} className="space-y-2">
                  <textarea
                    placeholder="Escreva um novo apontamento técnico ou atualização do atendimento..."
                    rows={2}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Registrar Apontamento</span>
                    </button>
                  </div>
                </form>

                {/* Notes List */}
                <div className="space-y-2.5 pt-2 max-h-[380px] overflow-y-auto pr-1">
                  {(!os.notes || os.notes.length === 0) ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      Nenhum apontamento técnico registrado ainda.
                    </div>
                  ) : (
                    os.notes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-500 font-medium">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <User className="w-3 h-3 text-blue-600" />
                            {n.authorName} ({n.authorRole})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-snug pt-1">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            {/* Technician Finish Service Button */}
            {os.status !== 'Finalizado pelo Técnico' && os.status !== 'Finalizado' && os.status !== 'Encerrado' && (
              <button
                type="button"
                onClick={() => setShowTechModal(true)}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalizar Atendimento Técnico</span>
              </button>
            )}

            {/* Admin Close OS Button */}
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={handleCloseOSByAdmin}
                disabled={os.status === 'Encerrado'}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Encerrar O.S. (Faturar)</span>
              </button>
            )}
          </div>
        </div>

        {/* Technician Finish Service Modal Dialog */}
        {showTechModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-600" />
                  <h3 className="font-bold text-base text-slate-800">Concluir Atendimento Técnico</h3>
                </div>
                <button
                  onClick={() => setShowTechModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Você está finalizando a parte técnica do chamado <strong className="text-slate-900">{os.id}</strong>.
                Após esta ação, a O.S. mudará para <strong className="text-cyan-700">"Finalizado pelo Técnico"</strong> e ficará disponível para o Administrador lançar os valores e realizar o encerramento financeiro.
              </p>

              <form onSubmit={handleFinishTechService} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Resumo do Serviço / Laudo da Solução Executada:
                    </label>
                    <button
                      type="button"
                      disabled={aiSolutionLoading}
                      onClick={handleGenerateSolution}
                      className="text-[11px] font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {aiSolutionLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin text-cyan-600" />
                          <span>Gerando laudo...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-cyan-600" />
                          <span>Sugerir Laudo com IA</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    required
                    rows={4}
                    placeholder="Descreva detalhadamente o que foi feito (ex: Efetuada a substituição da fonte de alimentação, testes de estresse de memória e limpeza do sistema de refrigeração)..."
                    value={technicalSolution}
                    onChange={(e) => setTechnicalSolution(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:bg-white transition"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTechModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Conclusão Técnica</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Client Proposal Preview Modal Dialog */}
        {showQuotePreviewModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
            <div className={`bg-white rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col border border-slate-200 transition-all duration-300 ${isModalFullScreen ? 'max-w-6xl h-[96vh]' : 'max-w-2xl max-h-[92vh]'}`}>
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-800/50 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                      Proposta Comercial de Orçamento
                    </h3>
                    <p className="text-[11px] text-indigo-200">
                      Visualização para envio ao cliente • OS #{os.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalFullScreen(!isModalFullScreen)}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-indigo-800/50 rounded-xl transition cursor-pointer"
                    title={isModalFullScreen ? 'Reduzir Modal' : 'Expandir para Tela Cheia (Full Viewer)'}
                  >
                    {isModalFullScreen ? <Minimize2 className="w-5 h-5 text-indigo-300" /> : <Maximize2 className="w-5 h-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQuotePreviewModal(false)}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-indigo-800/50 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Printable Card Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-slate-50">
                {/* Letterhead Paper Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
                  {/* Document Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-700 font-black text-lg">
                        <Building className="w-5 h-5" />
                        <span>PLIOOU TI & SERVIÇOS</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Soluções em TI, Manutenção e Infraestrutura
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="inline-block text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                        Orçamento #{os.id}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Data: {new Date().toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Client & Asset Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-slate-400 font-medium block">Cliente:</span>
                      <span className="font-bold text-slate-800 text-sm">{os.clientName}</span>
                      {clientPhone && (
                        <span className="text-slate-500 block text-[11px] mt-0.5">
                          Telefone: {clientPhone}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium block">Equipamento / Ativo:</span>
                      <span className="font-bold text-slate-800 text-sm">{os.equipment}</span>
                      <span className="text-slate-500 block text-[11px] mt-0.5">
                        Categoria: {os.category}
                      </span>
                    </div>
                  </div>

                  {/* Problem / Diagnosis */}
                  {os.description && (
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Diagnóstico / Motivo do Orçamento:
                      </span>
                      <p className="p-3 bg-slate-50 text-slate-700 text-xs rounded-xl border border-slate-200/60 leading-relaxed">
                        {os.description}
                      </p>
                    </div>
                  )}

                  {/* Itemized Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Discriminação dos Itens & Serviços:
                    </span>

                    {quoteItems.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-3">Item / Descrição</th>
                              <th className="p-3 text-center">Qtd</th>
                              <th className="p-3 text-right">Valor Un.</th>
                              <th className="p-3 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {quoteItems.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                                <td className="p-3 text-center font-bold text-slate-700">{item.quantity}</td>
                                <td className="p-3 text-right text-slate-600">
                                  {item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900">
                                  {(item.quantity * item.unitPrice).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                        Sem itens de peças adicionados especificamente.
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-slate-50 to-emerald-50/50 border border-indigo-100 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Peças / Insumos:</span>
                      <span className="font-bold text-slate-800">
                        {quoteTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Mão de Obra Técnica Estimada:</span>
                      <span className="font-bold text-slate-800">
                        {numLabor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    {numDiscount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Desconto Especial:</span>
                        <span className="font-bold">
                          - {numDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-indigo-200/60 flex justify-between items-center text-sm">
                      <span className="font-extrabold text-slate-800">INVESTIMENTO TOTAL ESTIMADO:</span>
                      <span className="font-black text-emerald-600 text-lg">
                        {totalCalculated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  {/* Budget Notes & Validity */}
                  <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                    <span className="font-bold text-slate-700 block">Condições da Proposta:</span>
                    <p className="leading-relaxed">
                      {quoteNotes || 'Garantia de 90 dias nas peças e serviços. Validade da proposta de 7 dias úteis.'}
                    </p>
                  </div>

                  {/* Client Acceptance Status Badge & Log */}
                  <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                    quoteStatus === 'Aprovado'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : quoteStatus === 'Rejeitado' || quoteStatus === 'Recusado'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : quoteStatus === 'Enviado'
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        {quoteStatus === 'Aprovado' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {quoteStatus === 'Enviado' && <Send className="w-4 h-4 text-blue-600" />}
                        {(quoteStatus === 'Rejeitado' || quoteStatus === 'Recusado') && <XCircle className="w-4 h-4 text-rose-600" />}
                        {quoteStatus === 'Pendente' && <Clock className="w-4 h-4 text-amber-600" />}
                        <span>Status Atual da Proposta:</span>
                      </span>
                      <span className="font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-white/80 border border-current">
                        {quoteStatus}
                      </span>
                    </div>

                    {quoteHistory.length > 0 && (
                      <div className="pt-2 border-t border-current/20 space-y-1 text-[11px]">
                        <span className="font-bold block opacity-80">Última atualização de aceite:</span>
                        <p className="font-medium">
                          {quoteHistory[0].updatedBy} ({quoteHistory[0].updatedRole}) em{' '}
                          {new Date(quoteHistory[0].createdAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(quoteHistory[0].createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {quoteHistory[0].note ? ` - "${quoteHistory[0].note}"` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyQuoteText}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>{copiedText ? 'Texto Copiado!' : 'Copiar Texto'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => generateQuotePDF(os)}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Baixar PDF Orçamento</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {clientPhone && (
                    <a
                      href={getWhatsAppUrl(clientPhone, buildQuoteWhatsAppMessage())}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        setQuoteStatus('Enviado');
                        handleSaveQuote();
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Enviar via WhatsApp</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowQuotePreviewModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Remote Sign Preview Modal */}
        {showClientSignModal && previewSignToken && (
          <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <ClientRemoteSignView
                token={previewSignToken}
                onClose={() => setShowClientSignModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
