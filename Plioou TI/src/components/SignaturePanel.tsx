import React, { useRef, useState, useEffect } from 'react';
import {
  PenTool,
  RotateCcw,
  CheckCircle2,
  Share2,
  Copy,
  Eye,
  MessageSquare,
  AlertCircle,
  Loader2,
  Check,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Lock,
} from 'lucide-react';
import { ServiceOrder, DigitalSignature, User as UserType } from '../types';

interface SignaturePanelProps {
  os: ServiceOrder;
  currentUser: UserType;
  token?: string | null;
  clientPhone?: string;
  onSignatureSaved: (signature: DigitalSignature) => void;
  onOpenClientView?: (signToken: string) => void;
}

export const SignaturePanel: React.FC<SignaturePanelProps> = ({
  os,
  currentUser,
  token,
  clientPhone,
  onSignatureSaved,
  onOpenClientView,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState(os.signature?.signerName || os.clientName || '');
  const [signerRole, setSignerRole] = useState(os.signature?.signerRole || 'Cliente / Responsável Legal');
  const [purpose, setPurpose] = useState(
    os.signature?.purpose || 'Aceite de Conclusão e Entrega dos Serviços Técnicos'
  );
  const [saving, setSaving] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [remoteToken, setRemoteToken] = useState<string | null>(os.signature?.remoteToken || null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-dev-user-id': currentUser.id,
    };
    const effectiveToken = token || (typeof window !== 'undefined' ? localStorage.getItem('plioou_jwt') : null);
    if (effectiveToken && effectiveToken !== 'demo_token') {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
    }
    return headers;
  };

  // Configure high-DPI canvas
  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Deep slate ink color
  };

  useEffect(() => {
    setupCanvas();
    const handleResize = () => {
      // Only re-setup if not already drawn to preserve signature
      if (!hasDrawn) {
        setupCanvas();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasDrawn]);

  // Canvas drawing handlers
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
    setErrorMsg(null);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignored
      }
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
    setErrorMsg(null);
  };

  // Save In-Person Signature
  const handleSavePresential = async () => {
    if (!signerName.trim()) {
      setErrorMsg('Por favor, informe o nome do cliente ou responsável legal antes de salvar.');
      return;
    }

    if (!hasDrawn) {
      setErrorMsg('O quadro de assinatura está vazio. O cliente deve desenhar a assinatura antes de salvar.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL('image/png');

    setSaving(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const payload = {
        signerName: signerName.trim(),
        signerRole: signerRole.trim() || 'Cliente / Responsável Legal',
        purpose: purpose.trim() || 'Aceite de Conclusão e Entrega dos Serviços Técnicos',
        modality: 'presential',
        signatureData,
        registeredBy: `${currentUser.name} (${currentUser.role})`,
      };

      const res = await fetch(`/api/service-orders/${os.id}/signature`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.signature) {
        onSignatureSaved(data.signature);
        setIsEditingExisting(false);
        setStatusMsg('Assinatura presencial registrada e vinculada com sucesso à O.S.!');
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Erro ao salvar assinatura presencial:', err);
      setErrorMsg(err.message || 'Falha ao salvar assinatura no servidor. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Obtain or generate Remote Signature Token
  const getOrCreateRemoteToken = async (): Promise<string | null> => {
    if (remoteToken) return remoteToken;
    setGeneratingLink(true);
    try {
      const res = await fetch(`/api/service-orders/${os.id}/signature-link`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          signerName: signerName.trim() || os.clientName,
          signerRole,
          purpose,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao gerar link de assinatura remota.');
      }

      const data = await res.json();
      if (data.token) {
        setRemoteToken(data.token);
        return data.token;
      }
      return null;
    } catch (err: any) {
      console.error('Erro ao gerar link remoto:', err);
      setErrorMsg(err.message || 'Não foi possível gerar o link de assinatura remota.');
      return null;
    } finally {
      setGeneratingLink(false);
    }
  };

  const getFullRemoteUrl = (tokenStr: string): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/?signToken=${tokenStr}`;
  };

  // Copy remote link
  const handleCopyLink = async () => {
    setErrorMsg(null);
    const tokenStr = await getOrCreateRemoteToken();
    if (!tokenStr) return;

    const url = getFullRemoteUrl(tokenStr);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setStatusMsg('Link seguro de assinatura copiado para a área de transferência!');
      setTimeout(() => {
        setCopiedLink(false);
        setStatusMsg(null);
      }, 3500);
    } catch {
      setErrorMsg('Não foi possível copiar automaticamente. Utilize o link: ' + url);
    }
  };

  // Open Client View
  const handleOpenClientView = async () => {
    setErrorMsg(null);
    const tokenStr = await getOrCreateRemoteToken();
    if (!tokenStr) return;

    if (onOpenClientView) {
      onOpenClientView(tokenStr);
    } else {
      const url = getFullRemoteUrl(tokenStr);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Send WhatsApp Link
  const handleSendWhatsApp = async () => {
    setErrorMsg(null);
    const tokenStr = await getOrCreateRemoteToken();
    if (!tokenStr) return;

    const url = getFullRemoteUrl(tokenStr);
    const cleanPhone = (clientPhone || '').replace(/\D/g, '');

    const message =
      `Olá, *${os.clientName}*! Tudo bem?\n\n` +
      `Seu atendimento referente ao equipamento *${os.equipment}* (Ordem de Serviço *${os.id}*) está pronto para aceite formal.\n\n` +
      `Por favor, acesse o link seguro abaixo para realizar a sua *Assinatura Digital de Aceite* diretamente pelo seu celular:\n` +
      `🔗 ${url}\n\n` +
      `_Plioou TI & Gestão Técnica_`;

    let waUrl = `https://wa.me/`;
    if (cleanPhone) {
      let fullDigits = cleanPhone;
      if (!fullDigits.startsWith('55') && fullDigits.length <= 11) {
        fullDigits = '55' + fullDigits;
      }
      waUrl += `${fullDigits}?text=${encodeURIComponent(message)}`;
    } else {
      waUrl += `?text=${encodeURIComponent(message)}`;
    }

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setStatusMsg('WhatsApp aberto com a mensagem e o link de assinatura!');
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const hasSavedSignature = Boolean(os.signature && os.signature.status === 'signed' && !isEditingExisting);

  return (
    <div className="space-y-6">
      {/* Informative Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg border border-slate-700/60 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Assinatura Digital de Aceite do Cliente</span>
                {hasSavedSignature && (
                  <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Concluído & Registrado
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl font-medium">
                Colete a assinatura formal de encerramento do chamado diretamente no balcão (modo presencial)
                ou gere um link seguro para o cliente assinar na tela do próprio celular via WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <span className="text-[11px] font-bold bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              Auditoria de O.S. {os.id}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl animate-in fade-in flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* IF ALREADY SIGNED: Display Registered Signature Card */}
      {hasSavedSignature && os.signature && (
        <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500/40 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Check className="w-5 h-5 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Assinatura Formal Registrada
                </h4>
                <p className="text-xs text-slate-500">
                  Registrada em{' '}
                  <strong className="text-slate-700">
                    {new Date(os.signature.signedAt).toLocaleString('pt-BR')}
                  </strong>{' '}
                  ({os.signature.modality === 'presential' ? 'Presencial no Balcão' : 'Remota via Celular'})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Deseja abrir o quadro para registrar uma nova assinatura e substituir a atual?')) {
                  setIsEditingExisting(true);
                  setTimeout(() => setupCanvas(), 50);
                }
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 self-start sm:self-auto py-1 px-3 rounded-lg hover:bg-blue-50 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Assinar Novamente</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Signature Image Preview */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col items-center justify-center">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 mb-2 tracking-wider">
                Traçado Autenticado do Signatário
              </span>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-inner w-full max-w-sm flex items-center justify-center min-h-[140px]">
                <img
                  src={os.signature.signatureData}
                  alt="Assinatura do Cliente"
                  className="max-h-28 max-w-full object-contain"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-2 font-mono">
                ID da Assinatura: {os.signature.id}
              </span>
            </div>

            {/* Signature Metadata Details */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Nome do Signatário:</span>
                  <strong className="text-slate-800 font-bold">{os.signature.signerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Vínculo / Cargo:</span>
                  <strong className="text-slate-700 font-bold">{os.signature.signerRole}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Modalidade de Coleta:</span>
                  <span className="font-bold text-blue-600">
                    {os.signature.modality === 'presential' ? 'Presencial (Dispositivo Técnico)' : 'Remota (Link Web Móvel)'}
                  </span>
                </div>
                {os.signature.registeredBy && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Testemunhado / Registrado por:</span>
                    <strong className="text-slate-700">{os.signature.registeredBy}</strong>
                  </div>
                )}
                <div className="pt-1.5 border-t border-slate-200 flex justify-between">
                  <span className="text-slate-500 font-medium">Finalidade do Aceite:</span>
                  <span className="text-slate-800 font-semibold text-right">{os.signature.purpose}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Esta assinatura está sincronizada e será impressa automaticamente no Relatório Técnico PDF.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIGNATURE CAPTURE & REMOTE WORKFLOW (Visible if not signed or if editing) */}
      {(!hasSavedSignature || isEditingExisting) && (
        <div className="space-y-6">
          {/* Signer Identity Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              1. Identificação do Signatário e Finalidade
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Cliente ou Responsável Legal <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Ex: João da Silva / Mariana Oliveira"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cargo / Relação com o Equipamento
                </label>
                <input
                  type="text"
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  placeholder="Ex: Titular / Responsável Legal / Gerente TI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Finalidade / Declaração de Aceite
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Ex: Aceite de Conclusão e Entrega dos Serviços Técnicos"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* PRESENTIAL CANVAS CAPTURE */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-blue-600" />
                  2. Captura Presencial (Assinar no Dispositivo)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Utilize o mouse, dedo na tela sensível ao toque ou caneta stylus para desenhar a assinatura no quadro.
                </p>
              </div>

              <button
                type="button"
                onClick={clearCanvas}
                className="self-start sm:self-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Limpar o quadro para desenhar novamente"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Limpar Quadro</span>
              </button>
            </div>

            {/* Canvas Box */}
            <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-2xl overflow-hidden bg-white shadow-inner transition">
              <canvas
                ref={canvasRef}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerLeave={stopDrawing}
                onPointerCancel={stopDrawing}
                style={{ touchAction: 'none' }}
                className="w-full h-48 sm:h-56 cursor-crosshair block select-none bg-white"
              />

              {/* Watermark Helper Text when Empty */}
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300">
                  <PenTool className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-xs font-extrabold uppercase tracking-widest opacity-60">
                    Desenhe a assinatura do cliente aqui
                  </span>
                  <span className="text-[10px] text-slate-400 opacity-60 mt-0.5">
                    (Mouse, Touchscreen ou Caneta Digital)
                  </span>
                </div>
              )}

              {/* Baseline Indicator */}
              <div className="absolute bottom-8 left-8 right-8 border-b border-slate-200 pointer-events-none flex justify-between">
                <span className="text-[10px] font-mono text-slate-300">x _____________________________________________</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Linha de Assinatura</span>
              </div>
            </div>

            {/* Presential Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${hasDrawn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>{hasDrawn ? 'Traçado detectado e pronto para gravação' : 'Aguardando traçado do cliente'}</span>
              </div>

              <div className="flex items-center gap-2">
                {isEditingExisting && (
                  <button
                    type="button"
                    onClick={() => setIsEditingExisting(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSavePresential}
                  disabled={saving || !hasDrawn}
                  className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition transform active:scale-95 ${
                    saving || !hasDrawn
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 cursor-pointer'
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando no Servidor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvar Assinatura Presencial</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* REMOTE SIGNATURE SECTION */}
          <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 rounded-2xl p-5 border border-blue-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  3. Assinatura Remota pelo Celular do Cliente
                </h4>
                <p className="text-[11px] text-blue-700 mt-0.5 font-medium">
                  Envie o link exclusivo de aceite para o cliente assinar na tela de toque do smartphone.
                </p>
              </div>

              {clientPhone && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                  WhatsApp: {clientPhone}
                </span>
              )}
            </div>

            {/* Remote Actions Bar */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={handleSendWhatsApp}
                disabled={generatingLink}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition transform active:scale-95 cursor-pointer"
                title="Abrir WhatsApp com link direto de assinatura para o cliente"
              >
                {generatingLink ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                <span>Enviar no WhatsApp do Cliente</span>
              </button>

              {/* Copy Link Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={generatingLink}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition transform active:scale-95 cursor-pointer"
                title="Copiar o link seguro de assinatura para colar em e-mail ou chat"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-500" />
                )}
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar link de Assinatura'}</span>
              </button>

              {/* View Client Screen Button */}
              <button
                type="button"
                onClick={handleOpenClientView}
                disabled={generatingLink}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition transform active:scale-95 cursor-pointer"
                title="Visualizar a tela exatamente como o cliente verá no smartphone"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Tela do Cliente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
