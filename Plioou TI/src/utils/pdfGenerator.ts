import jsPDF from 'jspdf';
import { ServiceOrder, ServiceOrderPhoto } from '../types';

/**
 * Gera um Relatório Simples em PDF (Formatado para envio ao Cliente)
 */
export function generateSimplePDF(os: ServiceOrder) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Colors & Accent
  doc.setFillColor(37, 99, 235); // Blue #2563eb
  doc.rect(0, 0, 210, 28, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Plioou TI - Relatório de Atendimento', 15, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprovante de Chamado Técnico', 15, 22);

  // OS Number Badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(145, 8, 50, 12, 3, 3, 'F');
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`OS: ${os.id}`, 150, 16);

  // Section 1: Dados Principais
  let y = 38;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Informações do Cliente & Serviço', 15, y);
  y += 3;

  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFontSize(10);
  
  // Grid row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(os.clientName, 40, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 120, y);
  doc.setFont('helvetica', 'bold');
  if (os.status === 'Finalizado') {
    doc.setTextColor(16, 185, 129);
  } else if (os.status === 'Em Andamento') {
    doc.setTextColor(217, 119, 6);
  } else {
    doc.setTextColor(37, 99, 235);
  }
  doc.text(os.status.toUpperCase(), 140, y);
  doc.setTextColor(30, 41, 59);

  y += 8;

  // Grid row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Equipamento:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(os.equipment || 'Não especificado', 45, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Categoria:', 120, y);
  doc.setFont('helvetica', 'normal');
  doc.text(os.category || 'Geral', 145, y);

  y += 8;

  // Grid row 3
  doc.setFont('helvetica', 'bold');
  doc.text('Abertura:', 15, y);
  doc.setFont('helvetica', 'normal');
  const dateFormatted = new Date(os.createdAt).toLocaleDateString('pt-BR') + ' às ' + new Date(os.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.text(dateFormatted, 40, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Técnico:', 120, y);
  doc.setFont('helvetica', 'normal');
  doc.text(os.technicianName || 'Técnico Plioou TI', 140, y);

  y += 14;

  // Section 2: Descrição do Problema
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Descrição Solicitada', 15, y);
  y += 3;
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitDesc = doc.splitTextToSize(os.description || 'Sem descrição cadastrada.', 175);
  doc.text(splitDesc, 15, y);
  y += splitDesc.length * 6 + 10;

  // Section 3: Resumo da Solução / Laudo Técnico
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Resumo de Resolução / Laudo Técnico', 15, y);
  y += 3;
  doc.line(15, y, 195, y);
  y += 8;

  const lastNote = os.technicalSolution || (os.notes && os.notes.length > 0 ? os.notes[0].content : 'Atendimento concluído e verificado pela equipe técnica.');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitRes = doc.splitTextToSize(lastNote, 175);
  doc.text(splitRes, 15, y);
  y += splitRes.length * 6 + 8;

  // Section 3.1: Resumo do Checklist Técnico
  if (os.checklist && os.checklist.length > 0) {
    const checkedCount = os.checklist.filter((i) => i.checked).length;
    const totalCount = os.checklist.length;
    const percent = Math.round((checkedCount / totalCount) * 100);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y, 180, 10, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Checklist Técnico:', 20, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(percent === 100 ? 16 : 37, percent === 100 ? 185 : 99, percent === 100 ? 129 : 235);
    doc.text(`${checkedCount}/${totalCount} itens verificados (${percent}% concluído)`, 55, y + 6.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(percent === 100 ? 'Status: Verificado e Aprovado' : 'Status: Em Andamento', 135, y + 6.5);

    y += 14;
  }

  // Section 4: Financeiro & Faturamento (Se Houver)
  if (os.totalCost !== undefined || os.laborCost !== undefined || os.partsCost !== undefined) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Detalhamento Financeiro', 15, y);
    y += 3;
    doc.line(15, y, 195, y);
    y += 8;

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Mão de Obra:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`R$ ${(os.laborCost || 0).toFixed(2)}`, 45, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Peças/Suprimentos:', 90, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`R$ ${(os.partsCost || 0).toFixed(2)}`, 135, y);

    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Desconto:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`R$ ${(os.discountCost || 0).toFixed(2)}`, 45, y);

    doc.setFont('helvetica', 'bold');
    doc.text('VALOR TOTAL:', 90, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`R$ ${(os.totalCost || 0).toFixed(2)} (${os.paymentMethod || 'A combinar'})`, 125, y);
    doc.setTextColor(30, 41, 59);

    y += 12;
  } else {
    y += 12;
  }

  // Render Service Photos Section (if any registered)
  if (os.photos && os.photos.length > 0) {
    y = renderPhotosSection(doc, os, y);
  }

  // Render Digital Signature Section
  y = renderSignatureBlock(doc, os, y);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Plioou TI - Gestão de Ordens de Serviço | Documento gerado em ' + new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 105, 285, { align: 'center' });

  doc.save(`Relatorio_Simples_${os.id}.pdf`);
}

/**
 * Gera um Relatório Técnico Completo em PDF (Com todo o Histórico de Apontamentos)
 */
export function generateCompletePDF(os: ServiceOrder) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Colors & Accent
  doc.setFillColor(15, 23, 42); // Dark Slate #0f172a
  doc.rect(0, 0, 210, 30, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Plioou TI - Relatório Técnico Completo', 15, 17);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Histórico Integral de Manutenção e Apontamentos Auditados', 15, 23);

  // OS Badge
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(140, 8, 55, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`OS: ${os.id}`, 167, 17, { align: 'center' });

  let y = 40;

  // Header Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, 180, 42, 3, 3, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  
  // Row 1
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', 20, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.text(os.clientName, 40, y + 8);

  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 110, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(os.status, 130, y + 8);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.text('Equipamento:', 20, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(os.equipment || 'Não informado', 50, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.text('Prioridade:', 110, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(os.priority || 'Média', 135, y + 17);

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.text('Abertura:', 20, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(os.createdAt).toLocaleString('pt-BR'), 40, y + 26);

  doc.setFont('helvetica', 'bold');
  doc.text('Técnico:', 110, y + 26);
  doc.setFont('helvetica', 'normal');
  doc.text(os.technicianName || 'Sem técnico atribuído', 130, y + 26);

  // Row 4
  doc.setFont('helvetica', 'bold');
  doc.text('Categoria:', 20, y + 35);
  doc.setFont('helvetica', 'normal');
  doc.text(os.category || 'Suporte Geral', 45, y + 35);

  y += 50;

  // Section: Descrição Inicial
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Relato do Problema / Solicitação', 15, y);
  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y, 195, y);
  y += 7;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  const descLines = doc.splitTextToSize(os.description || 'Sem descrição cadastrada.', 175);
  doc.text(descLines, 15, y);
  y += descLines.length * 5 + 8;

  // Section 2: Checklist / Verificações Técnicas
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('2. Lista de Verificação Técnica (Checklist de Atendimento)', 15, y);
  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y, 195, y);
  y += 6;

  if (os.checklist && os.checklist.length > 0) {
    const total = os.checklist.length;
    const checkedCount = os.checklist.filter((i) => i.checked).length;
    const progress = total > 0 ? Math.round((checkedCount / total) * 100) : 0;
    const hasRequiredUnchecked = os.checklist.some((i) => i.required && !i.checked);

    // Summary Box with Metrics
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y, 180, 11, 2, 2, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Total: ${total} itens`, 20, y + 7);
    doc.text(`Verificados: ${checkedCount} (${progress}%)`, 65, y + 7);

    if (progress === 100) {
      doc.setTextColor(16, 185, 129);
      doc.text('Status: 100% Concluído e Aprovado', 125, y + 7);
    } else if (hasRequiredUnchecked) {
      doc.setTextColor(225, 29, 72);
      doc.text('Atenção: Itens Obrigatórios Pendentes', 115, y + 7);
    } else {
      doc.setTextColor(37, 99, 235);
      doc.text('Status: Em Andamento', 135, y + 7);
    }

    y += 16;

    // List each item with real state, label, and individual notes
    os.checklist.forEach((item, idx) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const isChecked = Boolean(item.checked);
      const statusBadge = isChecked ? '[ CONCLUÍDO ]' : '[ PENDENTE  ]';

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(isChecked ? 16 : 100, isChecked ? 185 : 116, isChecked ? 129 : 139);
      doc.text(statusBadge, 18, y);

      doc.setFontSize(9);
      doc.setFont('helvetica', isChecked ? 'bold' : 'normal');
      doc.setTextColor(30, 41, 59);
      const reqMarker = item.required ? ' * (Obrigatório)' : '';
      const fullLabel = `${idx + 1}. ${item.label}${reqMarker}`;
      const labelLines = doc.splitTextToSize(fullLabel, 135);
      doc.text(labelLines, 48, y);
      y += labelLines.length * 4.5;

      // Print individual note if present
      if (item.notes && item.notes.trim().length > 0) {
        if (y > 262) {
          doc.addPage();
          y = 20;
        }

        const noteText = `Observação Técnica: ${item.notes.trim()}`;
        const noteLines = doc.splitTextToSize(noteText, 130);
        const boxHeight = noteLines.length * 4 + 4;

        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(251, 191, 36);
        doc.roundedRect(48, y - 2.5, 142, boxHeight, 1, 1, 'FD');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(146, 64, 14);
        doc.text(noteLines, 51, y + 1.5);

        y += boxHeight + 2;
      } else {
        y += 2;
      }
    });

    y += 4;
  } else {
    // Explicit warning if checklist is missing (Requirement 10)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(220, 38, 38);
    doc.text('Aviso: Nenhum item de checklist foi recuperado ou persistido para esta Ordem de Serviço.', 18, y);
    y += 10;
  }

  // Section: Complete History
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  const sectionNum = os.checklist && os.checklist.length > 0 ? '3' : '2';
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`${sectionNum}. Linha do Tempo & Histórico de Apontamentos`, 15, y);
  y += 3;
  doc.line(15, y, 195, y);
  y += 8;

  if (!os.notes || os.notes.length === 0) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum apontamento registrado para esta Ordem de Serviço.', 15, y);
    y += 10;
  } else {
    os.notes.forEach((note, index) => {
      // Check page overflow
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      const noteDate = new Date(note.createdAt).toLocaleString('pt-BR');
      
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, 180, 6, 1, 1, 'F');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(`#${index + 1} - Autor: ${note.authorName} (${note.authorRole})`, 18, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(noteDate, 190, y + 4.2, { align: 'right' });

      y += 8;

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      const contentLines = doc.splitTextToSize(note.content, 175);
      doc.text(contentLines, 18, y);
      y += contentLines.length * 5 + 6;
    });
  }

  // Render Photos Section ("Registro Fotográfico do Atendimento")
  y = renderPhotosSection(doc, os, y);

  // Check page overflow for footer signature
  if (y > 220) {
    doc.addPage();
    y = 30;
  } else {
    y += 10;
  }

  // Render Digital Signature Section
  y = renderSignatureBlock(doc, os, y);

  // Page Numbers / Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Plioou TI - Relatório Completo OS ${os.id} | Página ${i} de ${totalPages}`, 105, 287, { align: 'center' });
  }

  doc.save(`Relatorio_Completo_${os.id}.pdf`);
}

/**
 * Gera PDF de Proposta Comercial de Orçamento para envio ao Cliente
 */
export function generateQuotePDF(os: ServiceOrder) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header Banner - Indigo Accent for Commercial Quote
  doc.setFillColor(79, 70, 229); // Indigo #4f46e5
  doc.rect(0, 0, 210, 30, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PLIOOU TI & SERVIÇOS', 15, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Proposta Comercial de Orçamento', 15, 23);

  // OS Badge
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(140, 8, 55, 14, 3, 3, 'F');
  doc.setTextColor(79, 70, 229);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Orçamento OS: ${os.id}`, 143, 17);

  let y = 40;

  // Client & Equipment Section
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Identificação do Cliente e Equipamento', 15, y);
  y += 3;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(os.clientName, 35, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Data:', 120, y);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString('pt-BR'), 135, y);

  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('Equipamento:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(os.equipment, 45, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Status Cotação:', 120, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(os.quoteStatus || 'Pendente', 152, y);
  doc.setTextColor(30, 41, 59);

  y += 12;

  // Section 2: Detalhamento do Orçamento (Peças e Serviços)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Peças, Componentes e Mão de Obra Estimada', 15, y);
  y += 3;
  doc.line(15, y, 195, y);
  y += 8;

  const quoteItems = os.quoteItems || [];
  if (quoteItems.length > 0) {
    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 7, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text('Item / Componente', 18, y + 5);
    doc.text('Qtd', 120, y + 5, { align: 'center' });
    doc.text('Valor Un. (R$)', 150, y + 5, { align: 'right' });
    doc.text('Subtotal (R$)', 190, y + 5, { align: 'right' });

    y += 9;

    let partsTotal = 0;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    quoteItems.forEach((item) => {
      const subtotal = item.quantity * item.unitPrice;
      partsTotal += subtotal;

      doc.text(item.name, 18, y);
      doc.text(String(item.quantity), 120, y, { align: 'center' });
      doc.text(item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 150, y, { align: 'right' });
      doc.text(subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 190, y, { align: 'right' });

      y += 6;
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y - 2, 195, y - 2);
    });

    y += 4;
  } else {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhuma peça discriminada especificamente.', 15, y);
    y += 10;
  }

  // Financial Breakdown Box
  const numLabor = os.laborCost || 0;
  const numParts = os.partsCost !== undefined ? os.partsCost : quoteItems.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
  const numDiscount = os.discountCost || 0;
  const totalVal = Math.max(0, numParts + numLabor - numDiscount);

  y += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(15, y, 180, 28, 2, 2, 'FD');

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);

  doc.text(`Subtotal Peças / Insumos:`, 20, y + 7);
  doc.text(`R$ ${numParts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 100, y + 7);

  doc.text(`Mão de Obra Técnica Estimada:`, 20, y + 13);
  doc.text(`R$ ${numLabor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 100, y + 13);

  if (numDiscount > 0) {
    doc.text(`Desconto Concedido:`, 20, y + 19);
    doc.text(`- R$ ${numDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 100, y + 19);
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`VALOR TOTAL ESTIMADO:`, 20, y + 24);
  doc.text(`R$ ${totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 100, y + 24);

  y += 36;

  // Notes & Terms
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('3. Observações e Condições de Fornecimento', 15, y);
  y += 3;
  doc.line(15, y, 195, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const notesText = os.quoteNotes || 'Garantia de 90 dias para peças substituídas e serviços executados. Prazo de validade do orçamento: 7 dias úteis.';
  const splitNotes = doc.splitTextToSize(notesText, 180);
  doc.text(splitNotes, 15, y);
  y += splitNotes.length * 5 + 15;

  // Signatures
  doc.setDrawColor(203, 213, 225);
  doc.line(20, y, 90, y);
  doc.line(120, y, 190, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Plioou TI & Serviços', 55, y, { align: 'center' });
  doc.text('Aceite do Cliente', 155, y, { align: 'center' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Plioou TI & Serviços | Proposta de Orçamento OS ${os.id}`, 105, 287, { align: 'center' });

  doc.save(`Orcamento_${os.id}.pdf`);
}

/**
 * Renderiza a Seção de Fotos do Atendimento ("Registro Fotográfico do Atendimento")
 * Exibe as fotos registradas com categoria, descrição, metadados e proporcionalidade visual,
 * ou mensagem explícita de ausência quando não houver fotografias.
 */
function renderPhotosSection(doc: jsPDF, os: ServiceOrder, currentY: number): number {
  let y = currentY;

  // Check overflow for section header
  if (y > 220) {
    doc.addPage();
    y = 25;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Registro Fotográfico do Atendimento', 15, y);
  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y, 195, y);
  y += 6;

  const photos = os.photos || [];

  if (photos.length === 0) {
    // Usable width discount: Page margins are 15mm left & 15mm right (total width = 180mm)
    // Box width: 180mm. Inner horizontal padding: 12mm on each side (usable text width = 156mm)
    const boxX = 15;
    const boxWidth = 180;
    const innerPadding = 12;
    const maxTextWidth = boxWidth - innerPadding * 2; // 156mm
    const centerX = boxX + boxWidth / 2; // 105mm (document center)

    // Clean text without emojis or unsupported unicode symbols
    const mainTitle = 'Nenhum registro fotográfico anexado a esta Ordem de Serviço.';
    const subTitle = 'Fotografias do atendimento técnico (antes, durante e após a execução) podem ser anexadas no sistema.';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const mainLines = doc.splitTextToSize(mainTitle, maxTextWidth);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const subLines = doc.splitTextToSize(subTitle, maxTextWidth);

    // Vector camera icon height + spacing + text line heights + top/bottom padding
    const iconHeight = 4.6;
    const iconGap = 3.2;
    const mainLineHeight = 3.8;
    const subLineHeight = 3.2;
    const verticalPadding = 5.0;

    const contentHeight =
      iconHeight +
      iconGap +
      mainLines.length * mainLineHeight +
      2 +
      subLines.length * subLineHeight;

    const boxHeight = Math.max(22, Math.ceil(contentHeight + verticalPadding * 2));

    if (y + boxHeight > 275) {
      doc.addPage();
      y = 25;
    }

    // Box Container with rounded corners and clean borders
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(boxX, y, boxWidth, boxHeight, 2, 2, 'FD');

    // Draw Crisp Vector Camera Icon (Centered horizontally, fully vector)
    const iconW = 6.8;
    const iconH = iconHeight;
    const iconX = centerX - iconW / 2;
    const iconY = y + verticalPadding;

    // Camera body
    doc.setFillColor(148, 163, 184); // slate-400
    doc.roundedRect(iconX, iconY, iconW, iconH, 0.7, 0.7, 'F');
    // Top flash/viewfinder
    doc.roundedRect(iconX + 1.6, iconY - 0.9, 2.2, 1.1, 0.3, 0.3, 'F');
    // Outer lens
    doc.setFillColor(248, 250, 252);
    doc.circle(iconX + iconW / 2, iconY + iconH / 2, 1.4, 'F');
    // Inner lens
    doc.setFillColor(148, 163, 184);
    doc.circle(iconX + iconW / 2, iconY + iconH / 2, 0.7, 'F');

    // Render Text Lines (Strictly centered at 105mm, guaranteed no overflow)
    let curTextY = iconY + iconH + iconGap + 2.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    mainLines.forEach((line: string) => {
      doc.text(line, centerX, curTextY, { align: 'center' });
      curTextY += mainLineHeight;
    });

    curTextY += 0.5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    subLines.forEach((line: string) => {
      doc.text(line, centerX, curTextY, { align: 'center' });
      curTextY += subLineHeight;
    });

    y += boxHeight + 6;
    return y;
  }

  // 2 photos per row
  const cardWidth = 87;
  const colGap = 6;
  const imgHeight = 44;

  for (let i = 0; i < photos.length; i += 2) {
    const p1 = photos[i];
    const p2 = photos[i + 1];

    const p1DescLines = p1.description ? doc.splitTextToSize(p1.description, cardWidth - 8).length : 0;
    const p2DescLines = p2 && p2.description ? doc.splitTextToSize(p2.description, cardWidth - 8).length : 0;
    const maxDescLines = Math.max(p1DescLines, p2DescLines, 1);
    const cardHeight = imgHeight + 20 + maxDescLines * 3.5;

    if (y + cardHeight > 275) {
      doc.addPage();
      y = 25;
    }

    renderPhotoCard(doc, p1, 15, y, cardWidth, cardHeight, imgHeight);
    if (p2) {
      renderPhotoCard(doc, p2, 15 + cardWidth + colGap, y, cardWidth, cardHeight, imgHeight);
    }

    y += cardHeight + 6;
  }

  return y;
}

function renderPhotoCard(
  doc: jsPDF,
  photo: ServiceOrderPhoto,
  x: number,
  y: number,
  width: number,
  height: number,
  imgHeight: number
) {
  // Card Container
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(x, y, width, height, 2, 2, 'FD');

  // Photo Image or placeholder
  const imgData = photo.base64Data || (photo.fileUrl && photo.fileUrl.startsWith('data:') ? photo.fileUrl : null);
  let renderedImage = false;

  if (imgData) {
    try {
      const format = imgData.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(imgData, format, x + 3, y + 3, width - 6, imgHeight, undefined, 'FAST');
      renderedImage = true;
    } catch (e) {
      console.warn('Erro ao renderizar imagem no card do PDF:', e);
    }
  }

  if (!renderedImage) {
    // Elegant fallback card
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x + 3, y + 3, width - 6, imgHeight, 1.5, 1.5, 'F');

    // Vector Camera Icon
    const vW = 6.4;
    const vH = 4.4;
    const vX = x + width / 2 - vW / 2;
    const vY = y + imgHeight / 2 - 7;
    doc.setFillColor(148, 163, 184);
    doc.roundedRect(vX, vY, vW, vH, 0.6, 0.6, 'F');
    doc.roundedRect(vX + 1.4, vY - 0.9, 2.0, 1.1, 0.3, 0.3, 'F');
    doc.setFillColor(241, 245, 249);
    doc.circle(vX + vW / 2, vY + vH / 2, 1.3, 'F');
    doc.setFillColor(148, 163, 184);
    doc.circle(vX + vW / 2, vY + vH / 2, 0.6, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Imagem do Atendimento', x + width / 2, y + imgHeight / 2 + 3, { align: 'center' });
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.text(photo.originalName || `${photo.id}.jpg`, x + width / 2, y + imgHeight / 2 + 7.5, { align: 'center' });
    if (photo.fileSize) {
      const kb = Math.round(photo.fileSize / 1024);
      doc.text(`Tamanho: ${kb} KB`, x + width / 2, y + imgHeight / 2 + 11.5, { align: 'center' });
    }
  }

  // Category Badge
  const badgeY = y + imgHeight + 6;
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(x + 3, badgeY, width - 6, 5, 1, 1, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216);
  doc.text(photo.category, x + 5, badgeY + 3.6);

  // Date and author
  const metaY = badgeY + 8;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const dateStr = new Date(photo.uploadedAt).toLocaleString('pt-BR');
  doc.text(`${dateStr} • ${photo.uploadedBy}`, x + 4, metaY);

  // Description
  if (photo.description && photo.description.trim().length > 0) {
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    const descLines = doc.splitTextToSize(photo.description.trim(), width - 8);
    doc.text(descLines, x + 4, metaY + 4);
  }
}

/**
 * Renderiza o Bloco de Aceite e Assinatura Digital do Cliente e Técnico
 * Exibe a imagem da assinatura capturada, signatário, modalidade, data e finalidade quando assinado,
 * com quebra automática de linha rigorosa e sem overflow, ou status explícito de pendência.
 */
function renderSignatureBlock(doc: jsPDF, os: ServiceOrder, currentY: number): number {
  let y = currentY;

  const sig = os.signature && os.signature.status === 'signed' ? os.signature : null;

  // Prepare text lines and calculate dynamic height
  const maxRightTextWidth = 76; // Strictly confined inside right column (x=108 to 184)
  const centerRightX = 146; // Center coordinate of right column

  let nameLines: string[] = [];
  let roleLines: string[] = [];
  let dateLines: string[] = [];
  let auditLines: string[] = [];
  let purposeLines: string[] = [];

  let boxHeight = 34;

  if (sig) {
    doc.setFontSize(8.5);
    nameLines = doc.splitTextToSize(sig.signerName || 'Cliente', maxRightTextWidth);

    doc.setFontSize(7.5);
    const modalityStr = sig.modality === 'presential' ? 'Presencial no Balcão' : 'Remota via Celular';
    const roleText = `${sig.signerRole || 'Cliente / Responsável Legal'} • ${modalityStr}`;
    roleLines = doc.splitTextToSize(roleText, maxRightTextWidth);

    doc.setFontSize(6.8);
    const dateFormatted = new Date(sig.signedAt).toLocaleString('pt-BR');
    // Segment long IDs with soft break space every 14 chars to prevent unbroken text overflow
    const safeSigId = sig.id ? sig.id.replace(/([^\s-]{14})(?=[^\s-])/g, '$1 ') : '';
    dateLines = doc.splitTextToSize(`Aceite em: ${dateFormatted} | ID: ${safeSigId}`, maxRightTextWidth);

    doc.setFontSize(6.5);
    auditLines = doc.splitTextToSize('Assinatura eletrônica de aceite registrada e auditada digitalmente.', maxRightTextWidth);
    purposeLines = doc.splitTextToSize(`Finalidade: ${sig.purpose || 'Aceite dos Serviços Técnicos'}`, maxRightTextWidth);

    // Calculate required box height based on total lines
    const rightContentHeight =
      19 +
      nameLines.length * 3.6 +
      roleLines.length * 3.3 +
      dateLines.length * 3.0 +
      auditLines.length * 2.8 +
      purposeLines.length * 2.8 +
      4;

    boxHeight = Math.max(52, Math.ceil(rightContentHeight));
  }

  // If not enough room for the signature box, add page
  if (y + boxHeight > 275) {
    doc.addPage();
    y = 25;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Termo de Aceite e Assinatura', 15, y);
  y += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y, 195, y);
  y += 6;

  // Background Box (x: 15 to 195, width 180)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, y, 180, boxHeight, 2, 2, 'FD');

  // Subtle vertical divider between left and right columns
  doc.setDrawColor(226, 232, 240);
  doc.line(97, y + 4, 97, y + boxHeight - 4);

  // Left Side: Técnico Responsável
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Responsável Técnico:', 22, y + 7);
  doc.setFont('helvetica', 'normal');
  const techLines = doc.splitTextToSize(os.technicianName || 'Técnico Autorizado Plioou TI', 70);
  doc.text(techLines, 22, y + 12);

  const leftLineY = Math.min(y + 24 + (techLines.length - 1) * 4, y + boxHeight - 12);
  doc.setDrawColor(203, 213, 225);
  doc.line(22, leftLineY, 88, leftLineY);
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Assinatura / Visto do Técnico', 55, leftLineY + 4.5, { align: 'center' });

  // Right Side: Assinatura do Cliente
  if (sig) {
    try {
      if (sig.signatureData && sig.signatureData.startsWith('data:image')) {
        doc.addImage(sig.signatureData, 'PNG', 123, y + 2.5, 46, 13);
      }
    } catch (imgErr) {
      console.warn('Erro ao renderizar imagem da assinatura no PDF:', imgErr);
    }

    doc.setDrawColor(16, 185, 129);
    doc.line(108, y + 17, 184, y + 17);

    let curTextY = y + 21;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    nameLines.forEach((line) => {
      doc.text(line, centerRightX, curTextY, { align: 'center' });
      curTextY += 3.6;
    });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    roleLines.forEach((line) => {
      doc.text(line, centerRightX, curTextY, { align: 'center' });
      curTextY += 3.3;
    });

    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    dateLines.forEach((line) => {
      doc.text(line, centerRightX, curTextY, { align: 'center' });
      curTextY += 3.0;
    });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(16, 185, 129);
    auditLines.forEach((line) => {
      doc.text(line, centerRightX, curTextY, { align: 'center' });
      curTextY += 2.8;
    });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    purposeLines.forEach((line) => {
      doc.text(line, centerRightX, curTextY, { align: 'center' });
      curTextY += 2.8;
    });
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text('Assinatura ainda não registrada', centerRightX, y + 9, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    const pendingLines = doc.splitTextToSize('Pendente de aceite e assinatura pelo cliente ou responsável legal.', maxRightTextWidth);
    doc.text(pendingLines, centerRightX, y + 14, { align: 'center' });

    doc.setDrawColor(203, 213, 225);
    doc.line(108, y + 23, 184, y + 23);
    doc.setFontSize(7.5);
    doc.text('Assinatura / Aceite do Cliente', centerRightX, y + 27, { align: 'center' });
  }

  y += boxHeight + 6;
  return y;
}

