import React, { useRef, useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  PenTool,
  RotateCcw,
  Loader2,
  AlertCircle,
  Lock,
  FileText,
  User,
  Wrench,
  DollarSign,
  ArrowLeft,
} from 'lucide-react';

interface PublicOSData {
  id: string;
  clientName: string;
  equipment: string;
  category: string;
  description: string;
  technicianName?: string;
  technicalSolution?: string;
  totalCost?: number;
  paymentMethod?: string;
  purpose: string;
  signerName: string;
  signerRole: string;
  alreadySigned: boolean;
  signedAt?: string;
}

interface ClientRemoteSignViewProps {
  token: string;
  onClose?: () => void;
}

export const ClientRemoteSignView: React.FC<ClientRemoteSignViewProps> = ({
  token,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [osData, setOsData] = useState<PublicOSData | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('Cliente / Responsável Legal');
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSigned, setSuccessSigned] = useState(false);
  const [signedTimestamp, setSignedTimestamp] = useState<string | null>(null);

  // Fetch sanitized public OS info using token
  useEffect(() => {
    let isMounted = true;
    const fetchPublicInfo = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch(`/api/public/signature/${token}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Link inválido ou expirado (Código HTTP ${res.status}).`);
        }
        const data: PublicOSData = await res.json();
        if (isMounted) {
          setOsData(data);
          setSignerName(data.signerName || data.clientName || '');
          if (data.signerRole) setSignerRole(data.signerRole);
          if (data.alreadySigned) {
            setSuccessSigned(true);
            setSignedTimestamp(data.signedAt || new Date().toISOString());
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || 'Não foi possível carregar os dados desta solicitação de aceite.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPublicInfo();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // Setup Canvas
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

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // Deep slate ink
  };

  useEffect(() => {
    if (!loading && !successSigned && osData) {
      setupCanvas();
    }
  }, [loading, successSigned, osData]);

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
    setErrorMessage(null);
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
  };

  const handleSubmitSignature = async () => {
    if (!signerName.trim()) {
      setErrorMessage('Por favor, informe o seu nome completo antes de confirmar a assinatura.');
      return;
    }

    if (!hasDrawn) {
      setErrorMessage('O quadro de assinatura está vazio. Por favor, assine com o dedo ou caneta na tela.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL('image/png');

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/public/signature/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signerName: signerName.trim(),
          signerRole: signerRole.trim() || 'Cliente / Responsável Legal',
          signatureData,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ao registrar assinatura (${res.status}).`);
      }

      const result = await res.json();
      setSuccessSigned(true);
      setSignedTimestamp(result.signedAt || new Date().toISOString());
    } catch (err: any) {
      console.error('Erro ao enviar assinatura remota:', err);
      setErrorMessage(err.message || 'Falha ao confirmar assinatura. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 font-sans">
      {/* Top Header / Branding */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/20">
            P
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight">Plioou TI</h1>
            <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              Ambiente Seguro de Aceite Digital
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="w-full max-w-xl mx-auto py-6 space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs font-bold text-slate-300">Carregando dados da Ordem de Serviço...</p>
            <p className="text-[11px] text-slate-500">Validando autenticidade do link seguro.</p>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 rounded-2xl p-4 text-xs font-bold flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Screen: Already Signed or Just Signed */}
        {!loading && successSigned && osData && (
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-xl shadow-emerald-500/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border-2 border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white">Assinatura Concluída com Sucesso!</h2>
              <p className="text-xs text-slate-400 font-medium">
                O aceite formal da Ordem de Serviço <strong className="text-emerald-400 font-mono">{osData.id}</strong> foi registrado em nossa base de dados.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Signatário:</span>
                <strong className="text-slate-200">{signerName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Equipamento:</span>
                <span className="text-slate-200 font-medium">{osData.equipment}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Data e Hora do Registro:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {signedTimestamp ? new Date(signedTimestamp).toLocaleString('pt-BR') : 'Confirmado'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Modalidade:</span>
                <span className="text-blue-400 font-bold">Assinatura Remota via Celular</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              O laudo e relatório técnico em PDF da sua O.S. já foram atualizados com esta confirmação.
              Você já pode fechar esta tela com segurança.
            </p>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 rounded-2xl text-xs shadow-lg transition"
              >
                Concluir e Fechar
              </button>
            )}
          </div>
        )}

        {/* Signing Form (When not yet signed) */}
        {!loading && !successSigned && osData && (
          <div className="space-y-6">
            {/* OS Summary Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono font-black text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-800/60">
                  {osData.id}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {osData.category}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Cliente:</span>
                  <strong className="text-white">{osData.clientName}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-400">Equipamento:</span>
                  <strong className="text-slate-200">{osData.equipment}</strong>
                </div>

                {osData.totalCost !== undefined && osData.totalCost > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-400">Valor Total do Atendimento:</span>
                    <strong className="text-emerald-400 font-bold">
                      {osData.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[11px] text-slate-300">
                <strong className="text-slate-200 block mb-0.5">Descrição do Atendimento:</strong>
                <p className="line-clamp-3">{osData.technicalSolution || osData.description}</p>
              </div>
            </div>

            {/* Legal Statement of Acceptance */}
            <div className="bg-blue-950/30 border border-blue-900/60 rounded-2xl p-4 text-[11px] text-blue-200 leading-relaxed space-y-1">
              <p className="font-extrabold text-blue-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Declaração de Aceite dos Serviços
              </p>
              <p>
                Ao assinar digitalmente abaixo, confirmo o recebimento/conclusão dos serviços técnicos executados no equipamento informado, validando a conformidade dos trabalhos realizados pela equipe da Plioou TI.
              </p>
            </div>

            {/* Signer Inputs */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Seu Nome Completo <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Cargo / Relação com o Cliente
                </label>
                <input
                  type="text"
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  placeholder="Ex: Titular / Responsável Técnico / Gerente"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Signature Canvas Board */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-blue-400" />
                  <span>Desenhe sua Assinatura no Quadro Abaixo</span>
                </label>

                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                  <span>Limpar</span>
                </button>
              </div>

              {/* Responsive White Canvas */}
              <div className="relative border-2 border-slate-600 rounded-2xl overflow-hidden bg-white shadow-inner">
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

                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
                    <PenTool className="w-7 h-7 opacity-30 mb-1" />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                      Assine aqui com o dedo na tela
                    </span>
                  </div>
                )}

                <div className="absolute bottom-6 left-6 right-6 border-b border-slate-200 pointer-events-none flex justify-between">
                  <span className="text-[9px] font-mono text-slate-300">x _____________________________</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Assinatura</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center font-medium">
                {hasDrawn ? '✓ Assinatura desenhada no quadro' : 'Toque e arraste o dedo ou caneta stylus no quadro branco'}
              </p>
            </div>

            {/* Confirm and Sign Button */}
            <button
              type="button"
              onClick={handleSubmitSignature}
              disabled={submitting || !hasDrawn || !signerName.trim()}
              className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition transform active:scale-98 ${
                submitting || !hasDrawn || !signerName.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registrando Assinatura...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Assinar Aceite</span>
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-xl mx-auto pt-6 text-center text-[10px] text-slate-500 border-t border-slate-800/80">
        Plioou TI &bull; Gestão de Ordens de Serviço e Suporte Técnico &bull; Todos os direitos reservados.
      </footer>
    </div>
  );
};
