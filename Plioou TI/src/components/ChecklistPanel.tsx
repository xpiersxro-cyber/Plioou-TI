import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Loader2,
  FileText,
  AlertCircle,
  Save,
  X,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { ChecklistItem } from '../types';

interface ChecklistPanelProps {
  osId: string;
  deviceType?: string;
  editable?: boolean;
  currentUser?: { id: string };
  token?: string | null;
  onChecklistUpdated?: (items: ChecklistItem[]) => void;
}

// Templates com ícones e itens obrigatórios por categoria de equipamento
const CHECKLIST_TEMPLATES: Record<string, { icon: string; label: string; required: boolean }[]> = {
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

// Helper function to match device type keyword
function getMatchingTemplateKey(deviceType?: string): string {
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

export const ChecklistPanel: React.FC<ChecklistPanelProps> = ({
  osId,
  deviceType,
  editable = true,
  currentUser,
  token,
  onChecklistUpdated,
}) => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const matchedCategory = getMatchingTemplateKey(deviceType);

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (currentUser?.id) headers['x-dev-user-id'] = currentUser.id;
    const effectiveToken = token || (typeof window !== 'undefined' ? localStorage.getItem('plioou_jwt') : null);
    if (effectiveToken && effectiveToken !== 'demo_token') {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
    }
    return headers;
  };

  const loadTemplate = () => {
    const template = CHECKLIST_TEMPLATES[matchedCategory] || CHECKLIST_TEMPLATES['Outro'];
    const newItems: ChecklistItem[] = template.map((item, index) => ({
      id: `${osId}-tmpl-${index}-${Date.now()}`,
      label: item.label,
      checked: false,
      icon: item.icon,
      required: item.required,
      notes: '',
    }));
    setItems(newItems);
    return newItems;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchChecklist = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/service-orders/${osId}/checklist`, {
          headers: getHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            if (isMounted) {
              setItems(data);
              setLoading(false);
              onChecklistUpdated?.(data);
            }
            return;
          }
        }
        if (isMounted) {
          const generated = loadTemplate();
          // Persist the generated template silently to backend
          await saveChecklist(generated, false);
          if (isMounted) {
            onChecklistUpdated?.(generated);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Erro ao buscar checklist:', err);
          const generated = loadTemplate();
          onChecklistUpdated?.(generated);
          setErrorMsg('Não foi possível sincronizar o checklist com o servidor. Exibindo modelo padrão.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchChecklist();
    return () => {
      isMounted = false;
    };
  }, [osId, deviceType]);

  const saveChecklist = async (data: ChecklistItem[], showFeedback = false): Promise<boolean> => {
    if (!editable) return false;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/service-orders/${osId}/checklist`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ checklist: data }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${res.status}`);
      }
      const result = await res.json();
      const confirmed: ChecklistItem[] = result.checklist || data;
      setItems(confirmed);
      if (onChecklistUpdated) {
        onChecklistUpdated(confirmed);
      }
      if (showFeedback) {
        showStatus('Checklist sincronizado e salvo no servidor com sucesso!');
      }
      return true;
    } catch (err: any) {
      console.error('Erro ao salvar checklist:', err);
      setErrorMsg(err.message || 'Falha ao salvar checklist. O backend não pôde confirmar a alteração.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (id: string) => {
    if (!editable || saving) return;
    const previousItems = items;
    const updated = items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    // Optimistic UI
    setItems(updated);
    const success = await saveChecklist(updated, false);
    if (!success) {
      // Revert if backend failed
      setItems(previousItems);
    }
  };

  const saveNotes = async (id: string) => {
    if (!editable || saving) return;
    const previousItems = items;
    const updated = items.map((item) =>
      item.id === id ? { ...item, notes: notesValue.trim() } : item
    );
    const success = await saveChecklist(updated, true);
    if (success) {
      setEditingNotes(null);
      setNotesValue('');
    } else {
      setItems(previousItems);
    }
  };

  const openNotesEditor = (item: ChecklistItem) => {
    setEditingNotes(item.id);
    setNotesValue(item.notes || '');
  };

  const cancelNotesEditor = () => {
    setEditingNotes(null);
    setNotesValue('');
  };

  const addItem = async () => {
    if (!editable || !newItem.trim() || saving) return;
    const newId = `${osId}-manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const previousItems = items;
    const updated: ChecklistItem[] = [
      ...items,
      {
        id: newId,
        label: newItem.trim(),
        checked: false,
        icon: '📌',
        required: false,
        notes: '',
      },
    ];
    const success = await saveChecklist(updated, true);
    if (success) {
      setNewItem('');
    } else {
      setItems(previousItems);
    }
  };

  const removeItem = async (id: string) => {
    if (!editable || saving) return;
    if (!window.confirm('Remover este item da lista de verificação?')) return;
    const previousItems = items;
    const updated = items.filter((item) => item.id !== id);
    const success = await saveChecklist(updated, true);
    if (!success) {
      setItems(previousItems);
    }
  };

  const reloadTemplate = async () => {
    if (!editable || saving) return;
    if (!window.confirm(`Substituir a lista atual pelo modelo padrão para ${matchedCategory}? Todas as marcações e notas atuais serão redefinidas.`)) return;
    const fresh = loadTemplate();
    await saveChecklist(fresh, true);
  };

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Metrics
  const total = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
  const hasRequiredUnchecked = items.some((i) => i.required && !i.checked);
  const hasNotes = items.some((i) => i.notes && i.notes.trim().length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 bg-slate-50 rounded-2xl border border-slate-200">
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="ml-2 text-xs font-semibold text-slate-500">
          Carregando lista de verificação...
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* Toast alert msg */}
      {statusMsg && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in duration-200 flex items-center justify-between">
          <span>✨ {statusMsg}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error alert msg */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl animate-in fade-in duration-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-800 text-xs underline cursor-pointer"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Header with Title & Template Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Checklist de Atendimento
          </h3>
          {matchedCategory && (
            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
              {matchedCategory}
            </span>
          )}
          {hasNotes && (
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
              <MessageSquare className="w-3 h-3" />
              Com Observações
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {editable && (
            <button
              type="button"
              onClick={reloadTemplate}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 transition"
              title="Resetar para o modelo padrão do tipo de equipamento"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Modelo</span>
            </button>
          )}
          <span className="text-xs font-extrabold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            {checkedCount} / {total} itens
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 border border-slate-200">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              progress === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] font-bold">
          <span className="text-slate-500">{progress}% concluído</span>
          {progress === 100 ? (
            <span className="text-emerald-600 font-extrabold flex items-center gap-1">
              ✅ Todos os testes verificados!
            </span>
          ) : saving ? (
            <span className="text-blue-600 animate-pulse">Salvando alterações...</span>
          ) : null}
        </div>
      </div>

      {/* List items */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-500">Nenhum item na lista de verificação</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {editable ? 'Clique em "Restaurar Modelo" para carregar itens padrão.' : 'Sem itens.'}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`border rounded-xl transition-all ${
                item.checked
                  ? 'bg-emerald-50/50 border-emerald-200 shadow-2xs'
                  : 'bg-white border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start gap-2.5 px-3.5 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  disabled={!editable}
                  className="flex items-start gap-2.5 flex-1 text-left"
                >
                  <div
                    className={`w-4 h-4 rounded-md border shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                      item.checked
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {item.checked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-xs leading-snug font-semibold">
                    {item.icon && <span className="mr-1.5">{item.icon}</span>}
                    <span className={item.checked ? 'text-slate-400 line-through' : 'text-slate-800'}>
                      {item.label}
                    </span>
                    {item.required && (
                      <span className="ml-1 text-rose-600 font-bold" title="Item Obrigatório">
                        *
                      </span>
                    )}
                  </span>
                </button>

                {/* Notes & Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {item.notes && item.notes.trim().length > 0 && (
                    <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                      Com Nota
                    </span>
                  )}

                  {editable && (
                    <>
                      <button
                        type="button"
                        onClick={() => openNotesEditor(item)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Adicionar ou editar observação técnica"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Remover item da lista"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Note Editor Area */}
              {editingNotes === item.id && (
                <div className="px-3.5 pb-3 pt-1 border-t border-slate-100 bg-slate-50/80 rounded-b-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Observação Técnica / Medição
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      rows={2}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
                      placeholder="Ex: Tensão de 12V aferida, memória de 8GB testada com MemTest sem erros..."
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => saveNotes(item.id)}
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition"
                        title="Salvar observação"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelNotesEditor}
                        className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Display Saved Note */}
              {item.notes && item.notes.trim().length > 0 && editingNotes !== item.id && (
                <div className="px-3.5 py-2 border-t border-slate-100 bg-amber-50/50 rounded-b-xl">
                  <p className="text-[11px] text-amber-900 font-medium flex items-start gap-1.5">
                    <span className="shrink-0">📝</span>
                    <span>{item.notes}</span>
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Mandatory items warning */}
      {hasRequiredUnchecked && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            Atenção: Os itens marcados com <strong className="text-rose-700">*</strong> são obrigatórios para a conclusão técnica do equipamento.
          </span>
        </div>
      )}

      {/* Add Manual Item Input */}
      {editable && (
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Adicionar verificação personalizada..."
            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white"
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!newItem.trim() || saving}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </div>
      )}
    </div>
  );
};
