import React, { useState } from 'react';
import { X, Plus, AlertCircle, Wrench, ShieldAlert } from 'lucide-react';
import { Client, User as UserType, OSPriority } from '../types';

interface CreateOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  technicians: UserType[];
  onSubmit: (data: {
    clientId: string;
    clientName: string;
    equipment: string;
    category: string;
    description: string;
    priority: OSPriority;
    origin?: 'Interna' | 'Externa';
    attendanceType?: 'remote' | 'presential' | 'collect';
    technicianId?: string;
  }) => void;
}

export const CreateOSModal: React.FC<CreateOSModalProps> = ({
  isOpen,
  onClose,
  clients,
  technicians,
  onSubmit,
}) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [category, setCategory] = useState('Hardware');
  const [origin, setOrigin] = useState<'Interna' | 'Externa'>('Interna');
  const [attendanceType, setAttendanceType] = useState<'remote' | 'presential' | 'collect'>('presential');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<OSPriority>('Média');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let clientName = customClientName;
    if (selectedClientId) {
      const found = clients.find((c) => c.id === selectedClientId);
      if (found) clientName = found.name;
    }

    if (!clientName) {
      setError('Por favor selecione ou informe o nome do cliente.');
      return;
    }

    if (!deviceType) {
      setError('Por favor selecione o Tipo de Dispositivo.');
      return;
    }

    if (!description) {
      setError('Forneça um detalhamento inicial da ocorrência.');
      return;
    }

    const eqParts = [
      deviceType,
      brand.trim(),
      model.trim(),
      serialNumber.trim() ? `S/N: ${serialNumber.trim()}` : '',
    ].filter(Boolean);

    const equipment = eqParts.join(' - ');

    onSubmit({
      clientId: selectedClientId,
      clientName,
      equipment,
      category,
      description,
      priority,
      origin,
      attendanceType: origin === 'Externa' ? attendanceType : 'remote',
    });

    // Reset
    setSelectedClientId('');
    setCustomClientName('');
    setDeviceType('');
    setBrand('');
    setModel('');
    setSerialNumber('');
    setDescription('');
    setOrigin('Interna');
    setAttendanceType('presential');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Nova Ordem de Serviço (O.S.)</h2>
              <p className="text-xs text-slate-400">Cadastre um novo chamado de TI no sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Origin Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Origem da O.S. (Local de Atendimento)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrigin('Interna')}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    origin === 'Interna'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🏢 Interna (Empresa / Balcão)
                </button>
                <button
                  type="button"
                  onClick={() => setOrigin('Externa')}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    origin === 'Externa'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🚗 Externa (Atendimento Presencial)
                </button>
              </div>
              {origin === 'Externa' && (
                <div className="mt-2 space-y-2 p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl">
                  <label className="block text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                    Tipo de Atendimento Externo:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendanceType('presential')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        attendanceType === 'presential'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      📍 Presencial
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceType('collect')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        attendanceType === 'collect'
                          ? 'bg-purple-600 text-white border-purple-600 shadow'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      📶 Coleta
                    </button>
                  </div>
                  <p className="text-[11px] text-indigo-800 font-medium leading-relaxed">
                    ℹ️ Chamado criado pela empresa/triagem para deslocamento técnico ou recolhimento do equipamento.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cliente
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  if (e.target.value) setCustomClientName('');
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              >
                <option value="">-- Selecione um Cliente da Lista --</option>
                {[...clients]
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
              </select>
              {!selectedClientId && (
                <input
                  type="text"
                  placeholder="Ou digite a Razão Social / Nome do Cliente"
                  value={customClientName}
                  onChange={(e) => setCustomClientName(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              )}
            </div>

            {/* Dispositivo Card Section */}
            <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Dispositivo</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de equipamento <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  >
                    <option value="">Selecione...</option>
                    <option value="Notebook">Notebook</option>
                    <option value="Desktop">Desktop</option>
                    <option value="All-in-One">All-in-One</option>
                    <option value="Impressora">Impressora</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Servidor">Servidor</option>
                    <option value="Switch/Roteador">Switch/Roteador</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Celular">Celular</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Rede">Rede / Wi-Fi</option>
                    <option value="Servidores">Servidores / Backup</option>
                    <option value="Sistemas">Sistemas / ERP</option>
                    <option value="Periféricos">Periféricos / Impressora</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    placeholder="Dell, HP, Lenovo..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    placeholder="Inspiron 15, etc."
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Série
                </label>
                <input
                  type="text"
                  placeholder="S/N do equipamento"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as OSPriority)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
              </select>
            </div>

            {/* Issue Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                Descrição do Problema
              </label>
              <textarea
                rows={3}
                placeholder="Descreva o defeito relatado, sintomas ou solicitação..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition resize-none"
              ></textarea>
            </div>
          </div>

          {/* Modal Footer - Fixed at bottom */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition transform active:scale-95 cursor-pointer"
            >
              Abrir O.S.
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
