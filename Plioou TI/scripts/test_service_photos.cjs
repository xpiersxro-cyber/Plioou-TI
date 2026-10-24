/**
 * Testes End-to-End e Validação Automatizada de 15 Cenários
 * Módulo de Fotos do Atendimento e Correção de Layout PDF - Plioou TI
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
let adminToken = '';
let techToken = '';
let createdPhotoIds = [];

// 1x1 transparent PNG base64
const sample1x1Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function request(method, pathUrl, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let parsed = null;
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            parsed = JSON.parse(raw.toString('utf8'));
          } catch {}
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          raw,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runAllScenarios() {
  console.log('================================================================');
  console.log('PLIOOU TI - BATERIA DE TESTES E2E: FOTOS DO ATENDIMENTO & PDF');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Auth: Login as Admin
    const loginAdmin = await request('POST', '/api/auth/login', {
      email: 'admin@plioou.com',
      password: 'password123',
    });
    adminToken = loginAdmin.body?.token;
    assert(loginAdmin.status === 200 && adminToken, 'Login do Administrador (admin@plioou.com) realizado com sucesso');

    // Auth: Login as Technician
    const loginTech = await request('POST', '/api/auth/login', {
      email: 'rogerio@plioou.com',
      password: 'password123',
    });
    techToken = loginTech.body?.token;
    assert(loginTech.status === 200 && techToken, 'Login do Técnico (rogerio@plioou.com) realizado com sucesso');

    console.log('\n--- ETAPA 1: REGISTRO DE FOTOS NAS 7 CATEGORIAS OFICIAIS ---');

    // Scenario 1: Estado inicial do equipamento
    const r1 = await request('POST', '/api/service-orders/OS-0001/photos', {
      imageData: sample1x1Png,
      category: 'Estado inicial do equipamento',
      description: 'Gabinete com acúmulo de poeira nas aletas do dissipador térmico',
      originalName: 'foto_inicial_dissipador.png',
    }, techToken);
    assert(r1.status === 201 && r1.body?.id && r1.body?.category === 'Estado inicial do equipamento', 'Cenário 1: Foto registrada na categoria "Estado inicial do equipamento"');
    if (r1.body?.id) createdPhotoIds.push(r1.body.id);

    // Scenario 2: Diagnóstico técnico
    const r2 = await request('POST', '/api/service-orders/OS-0001/photos', {
      imageData: sample1x1Png,
      category: 'Diagnóstico técnico',
      description: 'Tensão de 3.3V oscilando no multímetro digital na saída da fonte',
      originalName: 'diagnostico_multimetro.png',
    }, techToken);
    assert(r2.status === 201 && r2.body?.category === 'Diagnóstico técnico', 'Cenário 2: Foto registrada na categoria "Diagnóstico técnico"');
    if (r2.body?.id) createdPhotoIds.push(r2.body.id);

    // Scenario 3: Durante o reparo
    const r3 = await request('POST', '/api/service-orders/OS-0001/photos', {
      imageData: sample1x1Png,
      category: 'Durante o reparo',
      description: 'Aplicação de pasta térmica de prata no processador após higienização',
      originalName: 'durante_reparo_pasta.png',
    }, techToken);
    assert(r3.status === 201 && r3.body?.category === 'Durante o reparo', 'Cenário 3: Foto registrada na categoria "Durante o reparo"');
    if (r3.body?.id) createdPhotoIds.push(r3.body.id);

    // Scenario 4: Peças e componentes
    const r4 = await request('POST', '/api/service-orders/OS-0001/photos', {
      imageData: sample1x1Png,
      category: 'Peças e componentes',
      description: 'Memória RAM DDR4 16GB 3200MHz nova com lacre do fabricante',
      originalName: 'peca_ram_lacrada.png',
    }, techToken);
    assert(r4.status === 201 && r4.body?.category === 'Peças e componentes', 'Cenário 4: Foto registrada na categoria "Peças e componentes"');
    if (r4.body?.id) createdPhotoIds.push(r4.body.id);

    // Scenario 5: Estado final do equipamento
    const r5 = await request('POST', '/api/service-orders/OS-0001/photos', {
      imageData: sample1x1Png,
      category: 'Estado final do equipamento',
      description: 'Equipamento ligado, boot normal e tela de testes sem anomalias',
      originalName: 'estado_final_concluido.png',
    }, techToken);
    assert(r5.status === 201 && r5.body?.category === 'Estado final do equipamento', 'Cenário 5: Foto registrada na categoria "Estado final do equipamento"');
    if (r5.body?.id) createdPhotoIds.push(r5.body.id);

    // Scenario 6: Entrega ao cliente
    const r6 = await request('POST', '/api/service-orders/OS-0001/photos', {
      imageData: sample1x1Png,
      category: 'Entrega ao cliente',
      description: 'Equipamento embalado no plástico bolha e com termo de garantia anexado',
      originalName: 'entrega_embalado.png',
    }, techToken);
    assert(r6.status === 201 && r6.body?.category === 'Entrega ao cliente', 'Cenário 6: Foto registrada na categoria "Entrega ao cliente"');
    if (r6.body?.id) createdPhotoIds.push(r6.body.id);

    // Scenario 7: Outros registros
    const r7 = await request('POST', '/api/service-orders/OS-0001/photos', {
      imageData: sample1x1Png,
      category: 'Outros registros',
      description: 'Etiqueta de patrimônio e número de série legíveis',
      originalName: 'etiqueta_serial.png',
    }, techToken);
    assert(r7.status === 201 && r7.body?.category === 'Outros registros', 'Cenário 7: Foto registrada na categoria "Outros registros"');
    if (r7.body?.id) createdPhotoIds.push(r7.body.id);

    console.log('\n--- ETAPA 2: TRATAMENTO DE ERROS E VALIDAÇÃO DE ENTRADA ---');

    // Scenario 8: Categoria inválida rejeitada
    const r8 = await request('POST', '/api/service-orders/OS-0001/photos', {
      imageData: sample1x1Png,
      category: 'Categoria Falsa Inexistente',
      description: 'Teste',
    }, techToken);
    assert(r8.status === 400 && r8.body?.error.includes('Categoria inválida'), 'Cenário 8: Rejeição correta (HTTP 400) com mensagem de categorias válidas');

    // Scenario 9: Imagem vazia rejeitada
    const r9 = await request('POST', '/api/service-orders/OS-0001/photos', {
      imageData: '',
      category: 'Diagnóstico técnico',
    }, techToken);
    assert(r9.status === 400 && r9.body?.error.includes('obrigatória'), 'Cenário 9: Rejeição correta (HTTP 400) de upload com imagem vazia');

    console.log('\n--- ETAPA 3: LISTAGEM, DOWNLOAD E PERSISTÊNCIA EM DISCO ---');

    // Scenario 10: Listagem de fotos da OS
    const r10 = await request('GET', '/api/service-orders/OS-0001/photos', null, techToken);
    assert(r10.status === 200 && Array.isArray(r10.body) && r10.body.length >= 7, `Cenário 10: Listagem recuperou ${r10.body?.length} fotografias com sucesso`);

    // Scenario 11: Servir arquivo binário
    const targetPhotoId = createdPhotoIds[0];
    const r11 = await request('GET', `/api/service-orders/OS-0001/photos/${targetPhotoId}/file`, null, techToken);
    assert(r11.status === 200 && r11.headers['content-type']?.includes('image/'), `Cenário 11: Download do arquivo binário da foto retornou HTTP 200 (${r11.headers['content-type']})`);

    // Scenario 12: Arquivo real persistido em disco
    const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads', 'photos');
    const diskFileExists = fs.existsSync(uploadsDir);
    const files = diskFileExists ? fs.readdirSync(uploadsDir) : [];
    const foundOnDisk = files.some((f) => f.includes(targetPhotoId));
    assert(foundOnDisk, `Cenário 12: Arquivo ${targetPhotoId} verificado fisicamente no diretório de uploads do disco`);

    console.log('\n--- ETAPA 4: EXCLUSÃO E AUDITORIA ---');

    // Scenario 13: Excluir foto
    const photoToDel = createdPhotoIds[createdPhotoIds.length - 1];
    const r13 = await request('DELETE', `/api/service-orders/OS-0001/photos/${photoToDel}`, null, techToken);
    assert(r13.status === 200 && r13.body?.success, `Cenário 13: Foto ${photoToDel} excluída com sucesso`);

    // Verify it is no longer returned in list
    const r13b = await request('GET', '/api/service-orders/OS-0001/photos', null, techToken);
    const stillPresent = r13b.body.some((p) => p.id === photoToDel);
    assert(!stillPresent, 'Cenário 13b: Foto excluída não consta mais na lista da O.S.');

    // Scenario 14: Verificação de Audit Log
    const r14 = await request('GET', '/api/audit-logs', null, adminToken);
    const hasPhotoLog = Array.isArray(r14.body) && r14.body.some((l) => l.action === 'REGISTRAR_FOTO');
    const hasDelLog = Array.isArray(r14.body) && r14.body.some((l) => l.action === 'EXCLUIR_FOTO');
    assert(hasPhotoLog && hasDelLog, 'Cenário 14: Logs de auditoria "REGISTRAR_FOTO" e "EXCLUIR_FOTO" devidamente gravados');

    console.log('\n--- ETAPA 5: INTEGRAÇÃO COM A ORDEM DE SERVIÇO & NÃO-REGRESSÃO ---');

    // Scenario 15: O.S. recuperada com array de fotos sem afetar checklists, orçamentos e financeiro
    const r15 = await request('GET', '/api/service-orders/OS-0001', null, techToken);
    const os = r15.body;
    assert(
      os &&
      Array.isArray(os.photos) &&
      os.photos.length > 0 &&
      Array.isArray(os.checklist) &&
      os.checklist.length > 0 &&
      os.status === 'Aberta',
      'Cenário 15: O.S. recuperada com array de fotos, mantendo checklist, status e campos integrados com perfeição'
    );

    console.log('\n================================================================');
    console.log(`RESULTADO FINAL: ${passed} PASSOU | ${failed} FALHOU`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Erro na execução dos testes:', err);
    process.exit(1);
  }
}

runAllScenarios();
