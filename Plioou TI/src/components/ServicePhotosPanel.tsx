import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Trash2,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileImage,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ServiceOrder, ServiceOrderPhoto, PhotoCategory, User as UserType } from '../types';

interface ServicePhotosPanelProps {
  os: ServiceOrder;
  currentUser: UserType;
  token?: string | null;
  onPhotosUpdated?: (photos: ServiceOrderPhoto[]) => void;
  initiallyExpanded?: boolean;
}

// 4 categorias oficiais de referência
export const PRIMARY_PHOTO_CATEGORIES: PhotoCategory[] = [
  'Equipamento / Entrada',
  'Durante Atendimento',
  'Solução / Finalização',
  'Outros / Geral',
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
  'Equipamento / Entrada': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    activeBg: 'bg-amber-600 text-white border-amber-600',
  },
  'Durante Atendimento': {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    activeBg: 'bg-blue-600 text-white border-blue-600',
  },
  'Solução / Finalização': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    activeBg: 'bg-emerald-600 text-white border-emerald-600',
  },
  'Outros / Geral': {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    activeBg: 'bg-slate-700 text-white border-slate-700',
  },
  // Mapeamentos legados
  'Estado inicial do equipamento': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    activeBg: 'bg-amber-600 text-white border-amber-600',
  },
  'Diagnóstico técnico': {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    activeBg: 'bg-purple-600 text-white border-purple-600',
  },
  'Durante o reparo': {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    activeBg: 'bg-blue-600 text-white border-blue-600',
  },
  'Peças e componentes': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    activeBg: 'bg-emerald-600 text-white border-emerald-600',
  },
  'Estado final do equipamento': {
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
    activeBg: 'bg-teal-600 text-white border-teal-600',
  },
  'Entrega ao cliente': {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    activeBg: 'bg-green-600 text-white border-green-600',
  },
  'Outros registros': {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    activeBg: 'bg-slate-700 text-white border-slate-700',
  },
};

interface StagedPhoto {
  id: string;
  dataUrl: string;
  file: File;
  name: string;
  size: number;
  category: PhotoCategory;
  description: string;
}

export const ServicePhotosPanel: React.FC<ServicePhotosPanelProps> = ({
  os,
  currentUser,
  token,
  onPhotosUpdated,
  initiallyExpanded = true,
}) => {
  const [photos, setPhotos] = useState<ServiceOrderPhoto[]>(os.photos || []);
  const [isExpanded, setIsExpanded] = useState<boolean>(initiallyExpanded);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Categoria ativa selecionada (funciona para envio e para filtragem da galeria)
  const [activeCategory, setActiveCategory] = useState<PhotoCategory>('Equipamento / Entrada');
  const [galleryFilter, setGalleryFilter] = useState<string>('all');

  // Suporte a múltiplos arquivos staged (pré-envio)
  const [stagedPhotos, setStagedPhotos] = useState<StagedPhoto[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Modais de visualização e confirmação
  const [lightboxPhoto, setLightboxPhoto] = useState<ServiceOrderPhoto | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<ServiceOrderPhoto | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar dados remotos
  useEffect(() => {
    let isMounted = true;
    const fetchPhotos = async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (currentUser?.id) headers['x-dev-user-id'] = currentUser.id;
        const effectiveToken = token || localStorage.getItem('plioou_jwt');
        if (effectiveToken && effectiveToken !== 'demo_token') headers['Authorization'] = `Bearer ${effectiveToken}`;

        const res = await fetch(`/api/service-orders/${os.id}/photos`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setPhotos(data);
            if (onPhotosUpdated) onPhotosUpdated(data);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar fotos da O.S.:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPhotos();

    return () => {
      isMounted = false;
    };
  }, [os.id]);

  // Processar arquivos selecionados (câmera, seletor ou arrastar e soltar)
  const processFiles = (fileList: FileList | File[]) => {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const newStaged: StagedPhoto[] = [];

    Array.from(fileList).forEach((file) => {
      if (!validImageTypes.includes(file.type) && !file.type.startsWith('image/')) {
        setFeedback({
          type: 'error',
          message: `Arquivo ${file.name} ignorado. Formato incompatível (apenas JPG, PNG e WEBP).`,
        });
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        setFeedback({
          type: 'error',
          message: `Arquivo ${file.name} excede o limite máximo de 15MB.`,
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setStagedPhotos((prev) => [
          ...prev,
          {
            id: `staged-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            dataUrl,
            file,
            name: file.name,
            size: file.size,
            category: activeCategory,
            description: '',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Se estiver recolhido, expandir para mostrar o pré-envio
    setIsExpanded(true);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const updateStagedItemCategory = (id: string, category: PhotoCategory) => {
    setStagedPhotos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category } : item))
    );
  };

  const updateStagedItemDescription = (id: string, description: string) => {
    setStagedPhotos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, description } : item))
    );
  };

  const removeStagedItem = (id: string) => {
    setStagedPhotos((prev) => prev.filter((item) => item.id !== id));
  };

  const clearStaged = () => {
    setStagedPhotos([]);
  };

  // Envio persistente das fotos
  const handleSaveAllStaged = async () => {
    if (stagedPhotos.length === 0) return;

    setUploadProgress({ current: 0, total: stagedPhotos.length });
    setFeedback(null);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (currentUser?.id) headers['x-dev-user-id'] = currentUser.id;
    const effectiveToken = token || localStorage.getItem('plioou_jwt');
    if (effectiveToken && effectiveToken !== 'demo_token') headers['Authorization'] = `Bearer ${effectiveToken}`;

    const uploadedNewPhotos: ServiceOrderPhoto[] = [];
    let hasError = false;

    for (let i = 0; i < stagedPhotos.length; i++) {
      const item = stagedPhotos[i];
      setUploadProgress({ current: i + 1, total: stagedPhotos.length });

      try {
        const res = await fetch(`/api/service-orders/${os.id}/photos`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            imageData: item.dataUrl,
            category: item.category,
            description: item.description.trim(),
            originalName: item.name,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Falha ao salvar ${item.name}`);
        }

        const savedData = await res.json();
        uploadedNewPhotos.unshift({
          ...savedData,
          base64Data: item.dataUrl,
        });
      } catch (err: any) {
        hasError = true;
        console.error('Erro ao enviar foto:', err);
        setFeedback({
          type: 'error',
          message: `Erro ao enviar ${item.name}: ${err.message || 'Falha de comunicação'}`,
        });
      }
    }

    if (uploadedNewPhotos.length > 0) {
      const updatedList = [...uploadedNewPhotos, ...photos];
      setPhotos(updatedList);
      if (onPhotosUpdated) onPhotosUpdated(updatedList);

      setStagedPhotos([]);
      if (!hasError) {
        setFeedback({
          type: 'success',
          message: `${uploadedNewPhotos.length} ${uploadedNewPhotos.length === 1 ? 'fotografia salva' : 'fotografias salvas'} e persistidas com sucesso!`,
        });
        setTimeout(() => setFeedback(null), 4000);
      }
    }

    setUploadProgress(null);
  };

  // Exclusão de foto com autorização
  const handleDeletePhoto = async (photo: ServiceOrderPhoto) => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.id) headers['x-dev-user-id'] = currentUser.id;
      const effectiveToken = token || localStorage.getItem('plioou_jwt');
      if (effectiveToken && effectiveToken !== 'demo_token') headers['Authorization'] = `Bearer ${effectiveToken}`;

      const res = await fetch(`/api/service-orders/${os.id}/photos/${photo.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao excluir a fotografia.');
      }

      const updated = photos.filter((p) => p.id !== photo.id);
      setPhotos(updated);
      if (onPhotosUpdated) onPhotosUpdated(updated);

      setPhotoToDelete(null);
      if (lightboxPhoto?.id === photo.id) setLightboxPhoto(null);
      setFeedback({ type: 'success', message: 'Fotografia excluída com sucesso.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error('Erro ao excluir foto:', err);
      setFeedback({ type: 'error', message: err.message || 'Erro ao excluir a foto.' });
    } finally {
      setLoading(false);
    }
  };

  // Filtragem
  const filteredPhotos =
    galleryFilter === 'all'
      ? photos
      : photos.filter((p) => {
          if (p.category === galleryFilter) return true;
          // Agrupamentos inteligentes caso haja fotos salvas com categorias antigas
          if (galleryFilter === 'Equipamento / Entrada' && p.category === 'Estado inicial do equipamento') return true;
          if (galleryFilter === 'Durante Atendimento' && (p.category === 'Durante o reparo' || p.category === 'Diagnóstico técnico' || p.category === 'Peças e componentes')) return true;
          if (galleryFilter === 'Solução / Finalização' && (p.category === 'Estado final do equipamento' || p.category === 'Entrega ao cliente')) return true;
          if (galleryFilter === 'Outros / Geral' && p.category === 'Outros registros') return true;
          return false;
        });

  const canDeletePhoto = (photo: ServiceOrderPhoto) => {
    if (currentUser?.role === 'admin') return true;
    if (photo.uploadedById && photo.uploadedById === currentUser?.id) return true;
    if (photo.createdById && photo.createdById === currentUser?.id) return true;
    if (os.technicianId && os.technicianId === currentUser?.id) return true;
    return false;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 transition-all">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* HEADER DO CARTÃO — Conforme Referência */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span>FOTOS & ANEXOS</span>
              <span className="text-blue-600 font-extrabold">({photos.length})</span>
            </h3>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Registro visual do atendimento técnico na O.S. #{os.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline transition cursor-pointer px-2 py-1 rounded-md"
            title={isExpanded ? 'Recolher cartão' : 'Expandir cartão'}
          >
            <span>{isExpanded ? 'Recolher' : 'Ver Galeria / Adicionar'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Feedbacks de Sucesso ou Erro */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadProgress && (
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900">
            <span className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Enviando fotografias persistentes...</span>
            </span>
            <span>
              {uploadProgress.current} de {uploadProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{
                width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* CONTEÚDO EXPANDÍVEL */}
      {isExpanded && (
        <div className="space-y-4 animate-in slide-in-from-top-1 duration-200">
          {/* BARRA DE AÇÕES: BOTÕES CÂMERA & CARREGAR FOTOS */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Câmera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Carregar Fotos</span>
              </button>
            </div>

            {/* Contador / Status */}
            <span className="text-[11px] font-semibold text-slate-500 ml-auto hidden sm:block">
              {photos.length} {photos.length === 1 ? 'imagem vinculada' : 'imagens vinculadas'}
            </span>
          </div>

          {/* BOTÕES DE CATEGORIA (Equipamento/Entrada, Durante Atendimento, Solução/Finalização, Outros/Geral) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Selecione a Etapa / Categoria do Registro:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIMARY_PHOTO_CATEGORIES.map((cat) => {
                const isSelected = activeCategory === cat;
                const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES['Outros / Geral'];
                const count = photos.filter((p) => {
                  if (p.category === cat) return true;
                  if (cat === 'Equipamento / Entrada' && p.category === 'Estado inicial do equipamento') return true;
                  if (cat === 'Durante Atendimento' && (p.category === 'Durante o reparo' || p.category === 'Diagnóstico técnico' || p.category === 'Peças e componentes')) return true;
                  if (cat === 'Solução / Finalização' && (p.category === 'Estado final do equipamento' || p.category === 'Entrega ao cliente')) return true;
                  if (cat === 'Outros / Geral' && p.category === 'Outros registros') return true;
                  return false;
                }).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat);
                      // Se houver fotos dessa categoria, também filtra a galeria
                      setGalleryFilter(galleryFilter === cat ? 'all' : cat);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? style.activeBg + ' shadow-sm scale-101 ring-2 ring-blue-500/20'
                        : `${style.bg} ${style.text} ${style.border} hover:opacity-90`
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                          isSelected ? 'bg-white/30 text-white' : 'bg-black/10'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ÁREA DE ARRASTAR E SOLTAR (DRAG & DROP ZONE) */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-2xs">
                <FileImage className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-700">
                Arraste e solte fotos aqui (JPG, PNG, WEBP) ou clique para carregar
              </p>
              <p className="text-[11px] text-slate-400">
                Categoria ativa para novo envio: <strong className="text-blue-700">{activeCategory}</strong>
              </p>
            </div>
          </div>

          {/* STAGED PHOTOS: PRÉ-VISUALIZAÇÃO ANTES DO ENVIO */}
          {stagedPhotos.length > 0 && (
            <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-blue-950 uppercase tracking-wider">
                    {stagedPhotos.length} {stagedPhotos.length === 1 ? 'Foto selecionada' : 'Fotos selecionadas para envio'}
                  </span>
                  <span className="text-[11px] text-blue-700 font-medium">
                    (Confira antes de persistir)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearStaged}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancelar Seleção
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                {stagedPhotos.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-white border border-blue-100 rounded-xl flex gap-3 shadow-2xs relative group"
                  >
                    <div className="w-20 h-20 rounded-lg bg-black/5 overflow-hidden shrink-0 border border-slate-200">
                      <img
                        src={item.dataUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {item.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeStagedItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="Remover"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <select
                        value={item.category}
                        onChange={(e) =>
                          updateStagedItemCategory(item.id, e.target.value as PhotoCategory)
                        }
                        className="w-full text-[11px] p-1 border border-slate-200 rounded-md bg-slate-50 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {PRIMARY_PHOTO_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateStagedItemDescription(item.id, e.target.value)}
                        placeholder="Observação da imagem..."
                        className="w-full text-[11px] p-1 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-blue-200/50">
                <button
                  type="button"
                  onClick={clearStaged}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllStaged}
                  disabled={uploadProgress !== null}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Salvar {stagedPhotos.length} {stagedPhotos.length === 1 ? 'Fotografia' : 'Fotografias'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* BARRA DE FILTROS DA GALERIA */}
          {photos.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  type="button"
                  onClick={() => setGalleryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    galleryFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todas ({photos.length})
                </button>
                {PRIMARY_PHOTO_CATEGORIES.map((cat) => {
                  const count = photos.filter((p) => {
                    if (p.category === cat) return true;
                    if (cat === 'Equipamento / Entrada' && p.category === 'Estado inicial do equipamento') return true;
                    if (cat === 'Durante Atendimento' && (p.category === 'Durante o reparo' || p.category === 'Diagnóstico técnico' || p.category === 'Peças e componentes')) return true;
                    if (cat === 'Solução / Finalização' && (p.category === 'Estado final do equipamento' || p.category === 'Entrega ao cliente')) return true;
                    if (cat === 'Outros / Geral' && p.category === 'Outros registros') return true;
                    return false;
                  }).length;

                  if (count === 0 && galleryFilter !== cat) return null;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setGalleryFilter(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                        galleryFilter === cat
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* GALERIA DE MINIATURAS OU ESTADO VAZIO */}
          {photos.length === 0 ? (
            /* ESTADO VAZIO IDÊNTICO À REFERÊNCIA */
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-1 cursor-pointer hover:bg-blue-50/30 hover:border-blue-300 transition"
            >
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 font-bold">
                <Camera className="w-4 h-4 text-slate-400" />
                <span>Nenhuma foto anexada ainda.</span>
              </div>
              <p className="text-xs text-blue-600 font-semibold hover:underline">
                Clique para anexar fotos do equipamento ou use os botões acima
              </p>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-500 font-medium">
              Nenhuma fotografia encontrada para a categoria "{galleryFilter}".
            </div>
          ) : (
            /* GRID DE MINIATURAS */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredPhotos.map((photo) => {
                const style = CATEGORY_STYLES[photo.category] || CATEGORY_STYLES['Outros / Geral'];
                const dateStr = new Date(photo.uploadedAt).toLocaleString('pt-BR');
                const canDelete = canDeletePhoto(photo);

                return (
                  <div
                    key={photo.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition group flex flex-col"
                  >
                    {/* Thumbnail Image */}
                    <div
                      onClick={() => setLightboxPhoto(photo)}
                      className="relative aspect-4/3 bg-slate-900 cursor-pointer overflow-hidden"
                    >
                      <img
                        src={photo.base64Data || photo.fileUrl}
                        alt={photo.description || photo.category}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="p-1.5 bg-white/95 rounded-full text-slate-800 shadow-md">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      {/* Badge Overlaid */}
                      <div className="absolute top-1.5 left-1.5 max-w-[85%] truncate">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border shadow-2xs backdrop-blur-md truncate block ${style.bg} ${style.text} ${style.border}`}
                        >
                          {photo.category}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5 text-xs">
                      {photo.description ? (
                        <p className="text-[11px] text-slate-800 font-medium line-clamp-2 leading-tight">
                          {photo.description}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">Sem legenda</p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="truncate max-w-[100px]" title={dateStr}>
                          {dateStr.split(' ')[0]}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setLightboxPhoto(photo)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Ampliar visualização"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setPhotoToDelete(photo)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Excluir foto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX MODAL DE VISUALIZAÇÃO AMPLIADA */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${
                    (CATEGORY_STYLES[lightboxPhoto.category] || CATEGORY_STYLES['Outros / Geral']).bg
                  } ${
                    (CATEGORY_STYLES[lightboxPhoto.category] || CATEGORY_STYLES['Outros / Geral']).text
                  } ${
                    (CATEGORY_STYLES[lightboxPhoto.category] || CATEGORY_STYLES['Outros / Geral']).border
                  }`}
                >
                  {lightboxPhoto.category}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {new Date(lightboxPhoto.uploadedAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagem Ampliada */}
            <div className="bg-slate-950 flex items-center justify-center p-2 min-h-[350px] max-h-[65vh] overflow-hidden">
              <img
                src={lightboxPhoto.base64Data || lightboxPhoto.fileUrl}
                alt={lightboxPhoto.description || lightboxPhoto.category}
                className="max-h-[62vh] max-w-full object-contain"
              />
            </div>

            {/* Rodapé / Informações */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                {lightboxPhoto.description && (
                  <p className="font-bold text-slate-900 text-sm">
                    "{lightboxPhoto.description}"
                  </p>
                )}
                <p className="text-slate-500 text-[11px]">
                  Autor: <strong className="text-slate-700">{lightboxPhoto.uploadedBy}</strong>
                  {lightboxPhoto.fileSize && (
                    <span className="ml-2">
                      • Tamanho: {(lightboxPhoto.fileSize / 1024).toFixed(1)} KB
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {canDeletePhoto(lightboxPhoto) && (
                  <button
                    type="button"
                    onClick={() => setPhotoToDelete(lightboxPhoto)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 font-bold cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 font-bold cursor-pointer transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {photoToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4"
          onClick={() => setPhotoToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Excluir Fotografia?</h4>
                <p className="text-xs text-slate-500">
                  Esta ação removerá permanentemente o arquivo e seus registros da O.S.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p>
                <strong>Categoria:</strong> {photoToDelete.category}
              </p>
              {photoToDelete.description && (
                <p>
                  <strong>Descrição:</strong> {photoToDelete.description}
                </p>
              )}
              <p>
                <strong>Data do Registro:</strong>{' '}
                {new Date(photoToDelete.uploadedAt).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeletePhoto(photoToDelete)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
