const assert = require('assert');

async function runRBACTests() {
  console.log('================================================================');
  console.log('PLIOOU TI — BATERIA DE TESTES RBAC (PERMISSÕES DO TÉCNICO)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, ok, details = '') {
    if (ok) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} — ${details}`);
      failed++;
    }
  }

  // 1. Login as Technician
  const techLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'rogerio@plioou.com', password: 'tech' }),
  });
  const techAuth = await techLoginRes.json();
  report('Login do perfil Técnico retorna token e role "technician"', techAuth.user && techAuth.user.role === 'technician');
  const techToken = techAuth.token;

  // Login as Admin
  const adminLoginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@plioou.com', password: 'admin' }),
  });
  const adminAuth = await adminLoginRes.json();
  const adminToken = adminAuth.token;
  report('Login do perfil Administrador retorna token e role "admin"', adminAuth.user && adminAuth.user.role === 'admin');

  console.log('\n--- AUTORIZAÇÕES DO TÉCNICO (11 ITENS ESPECIFICADOS) ---');

  // 1. Cadastrar novos clientes
  const newClientRes = await fetch('http://localhost:3000/api/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      name: 'Cliente Criado pelo Técnico ' + Date.now(),
      cnpjOrCpf: '12.345.678/0001-90',
      email: 'tech_client@empresa.com',
      phone: '(11) 98765-4321',
      city: 'São Paulo',
      address: 'Av. Paulista, 1000',
    }),
  });
  const createdClient = await newClientRes.json();
  report('1. Técnico consegue cadastrar novos clientes (HTTP 201)', newClientRes.status === 201 && createdClient.id);

  // 2. Consultar clientes cadastrados
  const listClientsRes = await fetch('http://localhost:3000/api/clients', {
    headers: { 'Authorization': `Bearer ${techToken}` },
  });
  const clientsList = await listClientsRes.json();
  report('2. Técnico consegue consultar clientes cadastrados (HTTP 200)', listClientsRes.status === 200 && Array.isArray(clientsList) && clientsList.length > 0);

  // 3. Editar informações cadastrais permitidas
  const editClientRes = await fetch(`http://localhost:3000/api/clients/${createdClient.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      phone: '(11) 99999-8888',
      city: 'Campinas',
    }),
  });
  const updatedClient = await editClientRes.json();
  report('3. Técnico consegue editar dados cadastrais do cliente (HTTP 200)', editClientRes.status === 200 && updatedClient.city === 'Campinas');

  // 4. Abrir novas Ordens de Serviço
  const newOSRes = await fetch('http://localhost:3000/api/service-orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      clientId: createdClient.id,
      clientName: createdClient.name,
      equipment: 'Notebook Dell Latitude 5420',
      category: 'Hardware',
      description: 'Lentidão e superaquecimento durante reuniões.',
      priority: 'Alta',
      origin: 'Interna',
    }),
  });
  const createdOS = await newOSRes.json();
  report('4. Técnico consegue abrir nova Ordem de Serviço (HTTP 201)', newOSRes.status === 201 && createdOS.id && createdOS.openedBy);

  // 5. Consultar Ordens de Serviço autorizadas
  const listOSRes = await fetch('http://localhost:3000/api/service-orders', {
    headers: { 'Authorization': `Bearer ${techToken}` },
  });
  const ordersList = await listOSRes.json();
  report('5. Técnico consegue consultar Ordens de Serviço autorizadas (HTTP 200)', listOSRes.status === 200 && Array.isArray(ordersList));

  // 6. Assumir atendimentos
  const assumeRes = await fetch(`http://localhost:3000/api/service-orders/${createdOS.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      technicianId: techAuth.user.id,
      status: 'Em Andamento',
    }),
  });
  const assumedOS = await assumeRes.json();
  report('6. Técnico consegue assumir atendimento e iniciar status "Em Andamento"', assumeRes.status === 200 && assumedOS.technicianId === techAuth.user.id);

  // 7. Realizar diagnósticos e serviços técnicos
  const diagRes = await fetch(`http://localhost:3000/api/service-orders/${createdOS.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      technicalSolution: 'Efetuada limpeza interna, desobstrução das aletas e troca de pasta térmica.',
    }),
  });
  const diagOS = await diagRes.json();
  report('7. Técnico consegue registrar diagnóstico e laudo técnico (HTTP 200)', diagRes.status === 200 && diagOS.technicalSolution.includes('pasta térmica'));

  // 8. Preencher checklists
  const chkRes = await fetch(`http://localhost:3000/api/service-orders/${createdOS.id}/checklist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      checklist: [
        { id: 'chk-1', label: 'Fonte de alimentação testada', checked: true, notes: 'OK 19.5V' },
        { id: 'chk-2', label: 'Cooler desobstruído', checked: true, notes: 'OK silencioso' },
      ],
    }),
  });
  report('8. Técnico consegue preencher e atualizar checklists (HTTP 200)', chkRes.status === 200);

  // 9. Registrar fotografias
  const photoRes = await fetch(`http://localhost:3000/api/service-orders/${createdOS.id}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      category: 'Durante Atendimento',
      description: 'Foto interna da placa mãe limpa',
      originalName: 'placa_limpa.png',
    }),
  });
  report('9. Técnico consegue registrar e persistir fotografias (HTTP 201)', photoRes.status === 201);

  // 10. Agendar atendimentos
  const schedRes = await fetch(`http://localhost:3000/api/service-orders/${createdOS.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      scheduledDate: '2026-10-30',
      scheduledTime: '14:30',
    }),
  });
  const schedOS = await schedRes.json();
  report('10. Técnico consegue agendar data e hora de atendimento (HTTP 200)', schedRes.status === 200 && schedOS.scheduledDate === '2026-10-30');

  // 11. Registrar conclusão técnica dos serviços
  const finalizeRes = await fetch(`http://localhost:3000/api/service-orders/${createdOS.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      status: 'Finalizado pelo Técnico',
      technicalSolution: 'Manutenção preventiva e corretiva de refrigeração concluída com testes de stress sob 100% de carga.',
    }),
  });
  const finalizedOS = await finalizeRes.json();
  report('11. Técnico consegue registrar conclusão técnica dos serviços (Finalizado pelo Técnico)', finalizeRes.status === 200 && finalizedOS.status === 'Finalizado pelo Técnico');

  console.log('\n--- RESTRIÇÕES E SEGURANÇA RBAC DO TÉCNICO (BLOQUEIOS) ---');

  // Restrição 1: Técnico NÃO pode gerenciar usuários
  const blockUserCreate = await fetch('http://localhost:3000/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({ name: 'Hacker User', email: 'hacker@test.com', role: 'admin' }),
  });
  report('Restrição 1: Técnico é bloqueado (HTTP 403) ao tentar criar usuários ou administradores', blockUserCreate.status === 403);

  // Restrição 2: Técnico NÃO pode excluir clientes definitivamente
  const blockClientDelete = await fetch(`http://localhost:3000/api/clients/${createdClient.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${techToken}` },
  });
  report('Restrição 2: Técnico é bloqueado (HTTP 403) ao tentar excluir clientes definitivamente', blockClientDelete.status === 403);

  // Restrição 3: Técnico NÃO pode excluir Ordens de Serviço definitivamente
  const blockOSDelete = await fetch(`http://localhost:3000/api/service-orders/${createdOS.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${techToken}` },
  });
  report('Restrição 3: Técnico é bloqueado (HTTP 403) ao tentar excluir Ordens de Serviço', blockOSDelete.status === 403);

  // Restrição 4: Técnico NÃO pode alterar informações financeiras restritas
  const blockFinancialEdit = await fetch(`http://localhost:3000/api/service-orders/${createdOS.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      laborCost: 850.00,
      totalCost: 1200.00,
      financialNotes: 'Lucro da empresa',
    }),
  });
  report('Restrição 4: Técnico é bloqueado (HTTP 403) ao tentar alterar dados financeiros restritos', blockFinancialEdit.status === 403);

  // Restrição 5: Técnico NÃO pode faturar/encerrar definitivamente a OS (status Encerrado)
  const blockCloseOS = await fetch(`http://localhost:3000/api/service-orders/${createdOS.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${techToken}`,
    },
    body: JSON.stringify({
      status: 'Encerrado',
    }),
  });
  report('Restrição 5: Técnico é bloqueado (HTTP 403) ao tentar faturar/encerrar a O.S. (Encerrado)', blockCloseOS.status === 403);

  // Restrição 6: Técnico NÃO pode acessar relatórios executivos
  const blockReports = await fetch('http://localhost:3000/api/reports/os-summary', {
    headers: { 'Authorization': `Bearer ${techToken}` },
  });
  report('Restrição 6: Técnico é bloqueado (HTTP 403) ao tentar acessar relatórios gerenciais', blockReports.status === 403);

  // Restrição 7: Técnico NÃO pode zerar banco de dados
  const blockResetDB = await fetch('http://localhost:3000/api/admin/reset-database', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${techToken}` },
  });
  report('Restrição 7: Técnico é bloqueado (HTTP 403) ao tentar zerar banco de dados', blockResetDB.status === 403);

  console.log('\n--- VERIFICAÇÃO DE AUDITORIA E NÃO-REGRESSÃO DO ADMINISTRADOR ---');

  // Auditoria: Verificar se o criador da O.S. foi devidamente auditado
  const auditRes = await fetch('http://localhost:3000/api/logs', {
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  const logs = await auditRes.json();
  const createOSLog = logs.find((l) => l.action === 'CRIAR_OS' && l.targetId === createdOS.id);
  report('Auditoria: Criação da OS registrada automaticamente com o usuário Técnico e role correspondente', createOSLog && createOSLog.userRole === 'technician');

  // Admin pode alterar financeiro e encerrar O.S.
  const adminFinanceRes = await fetch(`http://localhost:3000/api/service-orders/${createdOS.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      laborCost: 250.00,
      totalCost: 250.00,
      paymentMethod: 'Pix',
      status: 'Encerrado',
    }),
  });
  report('Administrador: Consegue atualizar financeiro e encerrar O.S. com sucesso (HTTP 200)', adminFinanceRes.status === 200);

  // Admin pode excluir cliente criado no teste
  const adminDeleteClientRes = await fetch(`http://localhost:3000/api/clients/${createdClient.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
  report('Administrador: Consegue excluir cliente definitivamente (HTTP 200)', adminDeleteClientRes.status === 200);

  console.log('\n================================================================');
  console.log(`RESULTADO FINAL: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRBACTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
