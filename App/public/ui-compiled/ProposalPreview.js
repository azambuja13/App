(function() {
/**
 * ===================================================================
 * PROPOSAL PREVIEW - Visualização e Impressão de Proposta
 * ===================================================================
 * Componente limpo apenas com Template Chef Premium
 */

function ProposalPreview({
  proposalId,
  isOpen,
  onClose,
  onDelete
}) {
  // Referência ao componente global PDFButton
  const PDFButton = window.PDFButton;

  const {
    useState,
    useEffect
  } = React;

  // Helper: calcular finalTotal se não existir na proposta (para propostas antigas)
  const getFinalTotal = proposal => {
    if (proposal.finalTotal) {
      return proposal.finalTotal;
    }
    // Fallback: calcular com base no totalCost e markupPercent
    const totalCost = proposal.totalCost || 0;
    const markupPercent = proposal.markupPercent || 0;
    return totalCost * (1 + markupPercent / 100);
  };

  // Helper: agrupar pratos por categoria
  const groupDishesByCategory = dishes => {
    if (!dishes || dishes.length === 0) return {};

    return dishes.reduce((acc, dish) => {
      // ✅ Usar dishType (tipo fixo) atribuído ao prato na criação
      // Fallback para dishCategory (pratos antigos) e depois type
      const category = dish.dishType || dish.dishCategory || dish.type || 'Outro';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(dish);
      return acc;
    }, {});
  };

  // Helper: ordenar categorias na ordem correta
  const sortCategoriesOrder = groupedDishes => {
    const categoryOrder = ['entrada', 'acompanhamento', 'principal', 'sobremesa', 'outros'];

    return Object.entries(groupedDishes).sort(([catA], [catB]) => {
      const indexA = categoryOrder.indexOf(catA.toLowerCase());
      const indexB = categoryOrder.indexOf(catB.toLowerCase());

      // Se não encontrar na lista, coloca no final
      const orderA = indexA === -1 ? 999 : indexA;
      const orderB = indexB === -1 ? 999 : indexB;

      return orderA - orderB;
    });
  };
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('chef'); // chef, modern, classic, minimal
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false); // Estado para envio WhatsApp

  // ===== CARREGAMENTO DE DADOS =====

  const loadProposal = async () => {
    try {
      console.log('🔄 [ProposalPreview] Carregando proposta ID:', proposalId);
      setLoading(true);

      // Usar ManagerHelper para pegar o manager correto (backend PostgreSQL > local)
      const proposalManager = window.ManagerHelper?.getProposalManager() || window.PrecificacaoAPI?.proposalManager || window.proposalManager;
      if (!proposalManager) {
        console.error('❌ [ProposalPreview] ProposalManager não encontrado');
        setLoading(false);
        return;
      }
      console.log('✅ [ProposalPreview.loadProposal] Usando proposalManager:', proposalManager?.constructor?.name);

      // ProposalManager não tem getById() - usa getAll() e busca do cache
      const allProposals = await proposalManager.getAll(true); // useCache=true
      console.log('📊 [ProposalPreview] Total de propostas carregadas:', allProposals?.length);
      console.log('📊 [ProposalPreview] IDs disponíveis:', allProposals?.map(p => p.id));
      console.log('📊 [ProposalPreview] Buscando ID:', proposalId);
      const proposalData = allProposals.find(p => p.id === proposalId);
      console.log('📋 [ProposalPreview] Dados recebidos:', proposalData);
      console.log('📋 [ProposalPreview] Proposta encontrada?', !!proposalData);
      if (proposalData) {
        console.log('✅ [ProposalPreview] Proposta carregada:', proposalData.proposalName);

        // ✅ Enriquecer pratos com dados completos do DishManager (photos e description)
        const dishManager = window.PrecificacaoAPI?.dishManager || window.dishManager;
        if (dishManager && proposalData.selectedMenuData?.dishes) {
          console.log('🔍 [ProposalPreview] Enriquecendo pratos com dados do DishManager...');
          const allDishes = await dishManager.getAll();

          proposalData.selectedMenuData.dishes = proposalData.selectedMenuData.dishes.map(dish => {
            const fullDish = allDishes.find(d => d.id === dish.dishId);
            if (fullDish) {
              return {
                ...dish,
                dishDescription: fullDish.description,
                photos: fullDish.photos
              };
            }
            return dish;
          });
          console.log('✅ [ProposalPreview] Pratos enriquecidos:', proposalData.selectedMenuData.dishes[0]);
        }

        setProposal(proposalData);

        // Carregar dados do cliente
        if (proposalData.eventId) {
          await loadClientData(proposalData.eventId);
        }
        if (proposalData.clientId) {
          // Usar ManagerHelper para pegar o clientManager correto
          const clientManager = window.ManagerHelper?.getClientManager() || window.PrecificacaoAPI?.clientManager || window.clientManager;
          if (clientManager) {
            const client = await clientManager.getById(proposalData.clientId);
            if (client) {
              setClientData(client);
            }
          }
        }
        if (proposalData.clientName && !proposalData.eventId && !proposalData.clientId) {
          setClientData({
            name: proposalData.clientName,
            phone: proposalData.clientPhone || '',
            email: proposalData.clientEmail || '',
            address: proposalData.clientAddress || ''
          });
        }
      } else {
        console.warn('⚠️ [ProposalPreview] Proposta não encontrada (pode ter sido excluída)');
        // Fechar o preview se a proposta não existir
        if (onClose) {
          onClose();
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('❌ [ProposalPreview] Erro ao carregar proposta:', error);
      setLoading(false);
    }
  };
  const loadClientData = eventId => {
    try {
      const savedEventsManager = window.savedEventsManager;
      if (savedEventsManager) {
        const event = savedEventsManager.getEventById(eventId);
        if (event && event.clientData) {
          setClientData(event.clientData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    }
  };
  const loadCompanyLogo = () => {
    const logo = localStorage.getItem('company_logo');
    setCompanyLogo(logo);
  };
  const hasClientData = () => {
    if (!clientData) return false;
    return clientData.name || clientData.phone || clientData.email || clientData.address || clientData.notes;
  };
  const handlePrint = () => {
    // Capturar o conteúdo da proposta
    const proposalContent = document.querySelector('.proposal-content-to-print');
    if (!proposalContent) {
      alert('Erro: Conteúdo da proposta não encontrado');
      return;
    }

    // No app nativo (Capacitor/WKWebView), window.open('', '_blank', ...) não
    // funciona como num navegador normal - o WKWebView tenta repassar pro iOS
    // abrir uma URL vazia como link externo e falha ("Failed to open URL",
    // "invalid input parameters"). window.print() direto também não faz nada
    // (WKWebView não tem handler nativo de impressão sem plugin extra). Nesse
    // caso, pede o PDF já pronto (gerado no backend com Puppeteer, mesma rota
    // usada no "Enviar WhatsApp") via fetch (não via navegação - abrir no
    // Safari externo não entregou o arquivo de forma confiável, e navegar a
    // própria janela do app pra um data: URI também não funciona: o
    // Capacitor intercepta qualquer navegação de página que não seja
    // http(s)/capacitor://localhost e tenta abrir via UIApplication (Launch
    // Services), que não sabe "abrir" um data: URI (erro
    // LSApplicationWorkspaceErrorDomain Code=115). Solução: não navegar a
    // página nenhuma - mostra o PDF num overlay com <iframe> (carregar um
    // iframe não é uma "navegação de página" pro Capacitor, então não é
    // interceptado) e oferece um botão "Compartilhar" que usa a Web Share
    // API nativa (navigator.share com o arquivo) pra salvar/enviar - esse
    // botão garante um gesto de toque fresco do usuário, que é exigido pra
    // chamar navigator.share.
    const isNativeApp = window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform();
    if (isNativeApp) {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('❌ Token de autenticação não encontrado. Faça login novamente.');
        return;
      }
      const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';
      const pdfUrl = `${API_URL}/api/proposals/${proposalId}/pdf`;
      console.log('📄 [handlePrint] v7 - compartilhamento nativo direto - Baixando PDF (app nativo):', pdfUrl);
      fetch(pdfUrl, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(response => {
          if (!response.ok) {
            throw new Error('Erro ao baixar PDF: ' + response.status);
          }
          return response.blob();
        })
        .then(async blob => {
          // Duas tentativas anteriores (blob: e depois data: URI num
          // <iframe>) ficaram "tudo preto": o WKWebView só ativa o
          // visualizador nativo de PDF em navegação de página inteira, não
          // dentro de <iframe> - isso não é uma particularidade de blob vs.
          // data:, é o <iframe> em si que não funciona pra PDF nesse motor.
          // Solução definitiva: abandonar qualquer preview dentro do app e
          // usar direto a folha de compartilhamento nativa do iOS
          // (Web Share API), que já tem botão de Imprimir (AirPrint),
          // Salvar em Arquivos, enviar por WhatsApp/Mensagens/AirDrop etc -
          // sem depender de nenhum visualizador de PDF da própria página.
          console.log('📄 [handlePrint] Blob recebido:', blob.size, 'bytes, tipo:', blob.type);
          try {
            const headerBuf = await blob.slice(0, 30).arrayBuffer();
            const headerBytes = Array.from(new Uint8Array(headerBuf));
            const headerText = new TextDecoder('utf-8', { fatal: false }).decode(headerBuf);
            console.log('📄 [handlePrint] Primeiros 30 bytes (texto):', JSON.stringify(headerText));
            console.log('📄 [handlePrint] Primeiros 30 bytes (valores):', JSON.stringify(headerBytes));
          } catch (diagErr) {
            console.error('❌ [handlePrint] Erro ao inspecionar bytes do blob:', diagErr);
          }
          const file = new File([blob], 'proposta.pdf', { type: 'application/pdf' });
          const canShareFiles = !!(navigator.canShare && navigator.canShare({ files: [file] }));
          console.log('📄 [handlePrint] navigator.share existe?', typeof navigator.share, '| canShare({files})?', canShareFiles);

          const shareFile = async () => {
            try {
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                console.log('📄 [handlePrint] Chamando navigator.share()...');
                await navigator.share({ files: [file] });
                console.log('📄 [handlePrint] navigator.share() retornou com sucesso');
                return true;
              }
              console.log('📄 [handlePrint] canShare retornou false, não vou chamar share()');
            } catch (shareErr) {
              if (shareErr && shareErr.name === 'AbortError') {
                console.log('📄 [handlePrint] Usuário cancelou a folha de compartilhamento');
                return true; // usuário cancelou a folha de compartilhamento, não é erro
              }
              console.error('❌ [handlePrint] Erro ao compartilhar PDF:', shareErr && shareErr.name, shareErr && shareErr.message);
            }
            return false;
          };

          // 1ª tentativa: o próprio toque no botão "Imprimir" às vezes ainda
          // conta como gesto válido mesmo depois do fetch assíncrono - se
          // funcionar, a folha de compartilhamento abre direto, sem overlay.
          const sharedImmediately = await shareFile();
          console.log('📄 [handlePrint] sharedImmediately =', sharedImmediately);
          if (sharedImmediately) {
            return;
          }
          console.log('📄 [handlePrint] Mostrando overlay com botão de fallback');

          // 2ª tentativa (fallback): mostra um botão pro usuário tocar -
          // esse toque garante um gesto de toque fresco, exigido pela Web
          // Share API quando a 1ª tentativa falha por falta de gesto.
          const overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(17,24,39,0.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;';

          const msg = document.createElement('div');
          msg.textContent = '📄 PDF gerado. Toque no botão abaixo pra salvar, imprimir ou enviar.';
          msg.style.cssText = 'color:#fff;font-size:16px;max-width:320px;';

          const cleanup = () => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          };

          const shareBtn = document.createElement('button');
          shareBtn.textContent = '↗ Compartilhar / Salvar / Imprimir';
          shareBtn.style.cssText = 'color:#fff;background:#3b82f6;border:none;border-radius:8px;font-size:15px;padding:12px 20px;font-weight:600;';
          shareBtn.onclick = async () => {
            const ok = await shareFile();
            if (!ok) {
              alert('Compartilhamento de arquivo não disponível neste dispositivo.');
            }
          };

          const closeBtn = document.createElement('button');
          closeBtn.textContent = 'Fechar';
          closeBtn.style.cssText = 'color:#9ca3af;background:transparent;border:none;font-size:15px;padding:8px;';
          closeBtn.onclick = cleanup;

          overlay.appendChild(msg);
          overlay.appendChild(shareBtn);
          overlay.appendChild(closeBtn);
          document.body.appendChild(overlay);
        })
        .catch(err => {
          console.error('❌ [handlePrint] Erro ao baixar PDF:', err);
          alert('❌ Erro ao gerar o PDF. Tente novamente.');
        });
      return;
    }

    // Criar nova janela
    const printWindow = window.open('', '_blank', 'width=1200,height=800');

    // Escrever HTML na nova janela
    printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Proposta - ${proposal.proposalName || 'Impressão'}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @media print {
                        @page {
                            size: A4;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }
                        .page-break {
                            page-break-after: always;
                            page-break-inside: avoid;
                            min-height: 297mm;
                            box-sizing: border-box;
                            width: 210mm;
                        }
                        .page-break:last-child {
                            page-break-after: auto;
                        }
                    }
                </style>
            </head>
            <body>
                ${proposalContent.outerHTML}
                <script>
                    // Aguardar carregamento do Tailwind e imprimir automaticamente
                    setTimeout(() => {
                        window.print();
                    }, 1000);
                </script>
            </body>
            </html>
        `);
    printWindow.document.close();
  };
  const handleDelete = async () => {
    try {
      console.log('🗑️ [ProposalPreview] Iniciando exclusão da proposta:', proposalId);

      // Usar ManagerHelper para pegar o manager correto (backend PostgreSQL > local)
      const proposalManager = window.ManagerHelper?.getProposalManager() || window.PrecificacaoAPI?.proposalManager || window.proposalManager;
      if (!proposalManager) {
        alert('❌ Erro: ProposalManager não encontrado');
        console.error('❌ [ProposalPreview] ProposalManager não encontrado!');
        return;
      }
      console.log('✅ [ProposalPreview.handleDelete] Usando proposalManager:', proposalManager?.constructor?.name);

      // Hard delete (exclusão permanente)
      const result = await proposalManager.deleteProposal(proposalId);
      if (result.success) {
        console.log('✅ Proposta excluída PERMANENTEMENTE:', proposalId);

        // Invalidar cache antes de recarregar
        if (proposalManager.clearCache) {
          proposalManager.clearCache();
          console.log('🗑️ Cache limpo');
        }

        // IMPORTANTE: Chamar onDelete ANTES de onClose para atualizar lista
        if (onDelete) {
          console.log('🔄 [ProposalPreview] Chamando onDelete callback...');
          await onDelete(proposalId);
        }

        // Fechar o preview
        if (onClose) {
          console.log('🔄 [ProposalPreview] Fechando preview...');
          onClose();
        }
        alert('✅ Proposta excluída com sucesso!');
      } else {
        console.error('❌ Erro ao excluir proposta:', result.message);
        alert(`❌ ${result.message || 'Erro ao excluir proposta'}`);
      }
    } catch (error) {
      console.error('❌ Erro ao excluir proposta:', error);
      alert(`❌ Erro ao excluir: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  // ===== ENVIO VIA WHATSAPP =====
  const sendViaWhatsApp = async () => {
    setIsSendingWhatsApp(true);
    try {
      console.log('📱 [WhatsApp] Iniciando envio...');

      // 1. Validar dados
      if (!proposal || !proposal.id) {
        alert('❌ Proposta não possui ID. Salve a proposta primeiro.');
        return;
      }

      const clientPhone = proposal.clientPhone || clientData?.phone;
      if (!clientPhone) {
        alert('❌ Proposta não possui telefone do cliente. Adicione o telefone antes de enviar.');
        return;
      }

      // 2. Enviar para backend (PDF será gerado lá)
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('❌ Token de autenticação não encontrado. Faça login novamente.');
        return;
      }

      const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';

      console.log('📤 [WhatsApp] Enviando para API:', `${API_URL}/api/proposals/${proposal.id}/send-whatsapp`);
      console.log('   PDF será gerado no backend com Puppeteer (qualidade perfeita)');

      const response = await fetch(`${API_URL}/api/proposals/${proposal.id}/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.message}\n\nWhatsApp enviado para: ${clientPhone}`);
        console.log('✅ [WhatsApp] Enviado com sucesso:', result);
      } else {
        alert(`❌ Erro ao enviar: ${result.message}`);
        console.error('❌ [WhatsApp] Erro:', result);
      }

    } catch (error) {
      console.error('❌ [WhatsApp] Erro ao enviar:', error);
      alert('❌ Erro ao enviar via WhatsApp: ' + error.message);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  useEffect(() => {
    console.log('🎯 [ProposalPreview.useEffect] isOpen:', isOpen, 'proposalId:', proposalId);
    if (isOpen && proposalId) {
      console.log('✅ [ProposalPreview.useEffect] Carregando proposta...');
      loadProposal();
      loadCompanyLogo();
    } else {
      console.log('⏭️ [ProposalPreview.useEffect] Não vai carregar - isOpen:', isOpen, 'proposalId:', proposalId);
    }
  }, [isOpen, proposalId]);
  if (!isOpen) {
    console.log('⏭️ [ProposalPreview.render] isOpen=false, não renderizando');
    return null;
  }
  if (loading || !proposal) {
    console.log('⏳ [ProposalPreview.render] loading:', loading, 'proposal:', !!proposal);
    return /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-8"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-lg"
    }, loading ? "Carregando proposta..." : "Proposta não encontrada"), !loading && !proposal && /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      className: "mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
    }, "Fechar")));
  }

  // ===== RENDER DO TEMPLATE CHEF =====

  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", {
    dangerouslySetInnerHTML: {
      __html: `
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }

                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }

                    /* Esconder botões */
                    .no-print {
                        display: none !important;
                    }

                    /* Quebra de página */
                    .page-break {
                        page-break-after: always;
                        page-break-inside: avoid;
                        min-height: 297mm;
                        box-sizing: border-box;
                        width: 210mm;
                    }

                    .page-break:last-child {
                        page-break-after: auto;
                    }
                }
            `
    }
  }), /*#__PURE__*/React.createElement("div", {
    id: "proposal-preview-modal",
    className: "fixed inset-0 z-50 overflow-y-auto bg-gray-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "no-print sticky top-0 z-10 bg-white shadow-md border-b border-gray-200 proposal-preview-toolbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M10 19l-7-7m0 0l7-7m-7 7h18"
  })), "Voltar"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-600"
  }, "Template:"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedTemplate('chef'),
    className: `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTemplate === 'chef' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
  }, "\uD83D\uDC68\u200D\uD83C\uDF73 Chef"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedTemplate('modern'),
    className: `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTemplate === 'modern' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
  }, "\uD83C\uDFA8 Modern"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedTemplate('classic'),
    className: `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTemplate === 'classic' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
  }, "\uD83D\uDCDC Classic"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSelectedTemplate('minimal'),
    className: `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedTemplate === 'minimal' ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`
  }, "\u2728 Minimal"))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeleteConfirm(true),
    className: "flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
  })), "Excluir"), /*#__PURE__*/React.createElement("button", {
    onClick: sendViaWhatsApp,
    disabled: isSendingWhatsApp || !proposal?.clientPhone && !clientData?.phone,
    className: "flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed",
    title: !proposal?.clientPhone && !clientData?.phone ? 'Adicione o telefone do cliente primeiro' : 'Enviar proposta via WhatsApp'
  }, isSendingWhatsApp ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("svg", {
    className: "animate-spin h-5 w-5",
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "opacity-25",
    cx: "12",
    cy: "12",
    r: "10",
    stroke: "currentColor",
    strokeWidth: "4"
  }), /*#__PURE__*/React.createElement("path", {
    className: "opacity-75",
    fill: "currentColor",
    d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
  })), "Enviando...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
  })), "Enviar WhatsApp")), PDFButton ? /*#__PURE__*/React.createElement(PDFButton, {
    onClick: handlePrint,
    label: "\uD83D\uDDA8\uFE0F Imprimir",
    featureName: "Impress\xE3o de Propostas"
  }) : /*#__PURE__*/React.createElement("button", {
    onClick: handlePrint,
    className: "flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-colors font-medium shadow-md"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
  })), "\uD83D\uDDA8\uFE0F Imprimir")))), /*#__PURE__*/React.createElement("div", {
    className: "proposal-content-to-print max-w-5xl mx-auto bg-black shadow-2xl my-8"
  }, selectedTemplate === 'chef' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-black text-white p-12 flex flex-col justify-between relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start text-sm text-gray-400 mb-8"
  }, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, clientData?.name && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "text-orange-400"
  }, "CONTATO:"), " ", clientData.name), clientData?.location && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "text-orange-400"
  }, "LOCAL:"), " ", clientData.location))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, companyLogo && /*#__PURE__*/React.createElement("div", {
    className: "w-64 h-64 mx-auto mb-8 rounded-full bg-white flex items-center justify-center shadow-2xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("img", {
    src: companyLogo,
    alt: "Logo",
    className: "w-full h-full object-cover",
    style: {
      filter: 'none'
    }
  })), proposal.showCompanyName && proposal.companyName && /*#__PURE__*/React.createElement("h1", {
    className: "text-7xl font-bold mb-4",
    style: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      letterSpacing: '0.05em'
    }
  }, proposal.companyName))), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-8xl font-black mb-4",
    style: {
      letterSpacing: '0.05em'
    }
  }, "PROPOSTA"), /*#__PURE__*/React.createElement("h3", {
    className: "text-8xl font-black",
    style: {
      letterSpacing: '0.05em'
    }
  }, "COMERCIAL"), (clientData?.name || clientData?.location) && /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-700 bg-opacity-80 py-4 px-8 mt-12 rounded-lg"
  }, clientData?.name && /*#__PURE__*/React.createElement("p", {
    className: "text-2xl mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "CONTATO:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, clientData.name)), clientData?.location && /*#__PURE__*/React.createElement("p", {
    className: "text-2xl"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "LOCAL:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, clientData.location))))), /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-black text-white p-12 flex flex-col justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-t-2 border-orange-400 pt-6 mb-12"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-orange-400 uppercase tracking-wide"
  }, "Apresenta\xE7\xE3o")), /*#__PURE__*/React.createElement("h3", {
    className: "text-6xl font-bold italic text-orange-400 mb-12"
  }, "Ol\xE1!"), /*#__PURE__*/React.createElement("div", {
    className: "text-xl leading-relaxed space-y-6 max-w-4xl"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "text-orange-400 font-bold"
  }, clientData?.name || proposal.clientName || 'Cliente'), ", preparei essa proposta especialmente para voc\xEA. Nela cont\xE9m informa\xE7\xF5es importantes sobre o meu trabalho, incluindo a descri\xE7\xE3o dos meus servi\xE7os, prazos, valor de investimento e formas de pagamento."), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400"
  }, "Qualquer d\xFAvida, estou \xE0 disposi\xE7\xE3o.")), proposal.showCompanyName && proposal.companyName && /*#__PURE__*/React.createElement("div", {
    className: "mt-auto text-right text-orange-400 text-2xl font-bold"
  }, proposal.companyName)), (proposal.showCompanyHistory || proposal.showCompanyPhoto1) && /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-black text-white p-12 flex flex-col"
  }, proposal.showCompanyPhoto1 && proposal.companyPhoto1 && /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("img", {
    src: proposal.companyPhoto1,
    alt: "Sobre mim",
    className: "w-full max-w-2xl mx-auto h-[500px] object-cover rounded-lg shadow-2xl"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-5xl font-bold text-orange-400 text-center mb-8"
  }, "Sobre mim"), proposal.showCompanyHistory && proposal.companyHistory && /*#__PURE__*/React.createElement("div", {
    className: "text-lg leading-relaxed text-gray-300 max-w-4xl mx-auto text-justify"
  }, /*#__PURE__*/React.createElement("p", {
    className: "whitespace-pre-line"
  }, proposal.companyHistory))), (proposal.showCompanyMission || proposal.showCompanyVision || proposal.showCompanyValues || proposal.showCompanyMotivation) && /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-black text-white p-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-t-2 border-orange-400 pt-6 mb-12"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-orange-400 uppercase tracking-wide"
  }, "Nossa Filosofia")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-12 max-w-4xl"
  }, proposal.showCompanyMission && proposal.companyMission && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "inline-block px-8 py-3 bg-orange-500 rounded-full mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-black"
  }, "miss\xE3o")), /*#__PURE__*/React.createElement("p", {
    className: "text-xl leading-relaxed text-gray-300 pl-8"
  }, proposal.companyMission)), proposal.showCompanyVision && proposal.companyVision && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "inline-block px-8 py-3 bg-orange-500 rounded-full mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-black"
  }, "vis\xE3o")), /*#__PURE__*/React.createElement("p", {
    className: "text-xl leading-relaxed text-gray-300 pl-8"
  }, proposal.companyVision)), proposal.showCompanyValues && proposal.companyValues && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "inline-block px-8 py-3 bg-orange-500 rounded-full mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-black"
  }, "valores")), /*#__PURE__*/React.createElement("p", {
    className: "text-xl leading-relaxed text-gray-300 pl-8 whitespace-pre-line"
  }, proposal.companyValues)), proposal.showCompanyMotivation && proposal.companyMotivation && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "inline-block px-8 py-3 bg-orange-500 rounded-full mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-black"
  }, "motiva\xE7\xE3o")), /*#__PURE__*/React.createElement("p", {
    className: "text-xl leading-relaxed text-gray-300 pl-8 whitespace-pre-line"
  }, proposal.companyMotivation)))), proposal.menus && proposal.menus.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-black text-white p-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-t-2 border-orange-400 pt-6 mb-12"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-orange-400 uppercase tracking-wide"
  }, "Nossos Servi\xE7os")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-6 max-w-3xl"
  }, proposal.menus.map((menu, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "px-8 py-4 bg-orange-500 rounded-full"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-black"
  }, menu.name)))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto"
  }, proposal.showCompanyPhoto2 && proposal.companyPhoto2 && /*#__PURE__*/React.createElement("img", {
    src: proposal.companyPhoto2,
    alt: "Servi\xE7o",
    className: "w-full h-64 object-cover rounded-lg shadow-xl"
  }), proposal.showCompanyPhoto3 && proposal.companyPhoto3 && /*#__PURE__*/React.createElement("img", {
    src: proposal.companyPhoto3,
    alt: "Servi\xE7o",
    className: "w-full h-64 object-cover rounded-lg shadow-xl"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2"
  }, "\uD83D\uDC64 DADOS DO CLIENTE"), hasClientData() ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, clientData.name && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Nome:"), " ", clientData.name), clientData.phone && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Telefone:"), " ", clientData.phone), clientData.email && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Email:"), " ", clientData.email), clientData.address && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Endere\xE7o:"), " ", clientData.address), clientData.notes && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold mb-1"
  }, "Observa\xE7\xF5es:"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700"
  }, clientData.notes))) : /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 italic"
  }, "Cliente n\xE3o cadastrado")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2"
  }, "\uD83D\uDCC5 DADOS DO EVENTO"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, proposal.eventDate && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Data:"), " ", window.formatDate(proposal.eventDate)), proposal.guests && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Convidados:"), " ", proposal.guests, " pessoas"), proposal.eventLocation && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Local:"), " ", proposal.eventLocation), proposal.eventDuration && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Dura\xE7\xE3o:"), " ", proposal.eventDuration, " horas"), proposal.serviceStartTime && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "In\xEDcio:"), " ", proposal.serviceStartTime)))), proposal.selectedMenuData && /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2"
  }, "\uD83C\uDF7D\uFE0F MENU"), /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 rounded-lg p-6 border border-orange-200 mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-orange-900"
  }, proposal.selectedMenuData.name), proposal.selectedMenuData.description && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 mt-2"
  }, proposal.selectedMenuData.description)), proposal.selectedMenuData.dishes && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, sortCategoriesOrder(groupDishesByCategory(proposal.selectedMenuData.dishes)).map(([category, dishes]) => /*#__PURE__*/React.createElement("div", {
    key: category,
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-orange-600 mb-3 pb-2 border-b border-orange-300"
  }, category.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, dishes.map((dish, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "pl-4 flex gap-4"
  }, dish.photos && dish.photos.length > 0 && dish.photos[0] && /*#__PURE__*/React.createElement("img", {
    src: dish.photos[0].photoData || dish.photos[0].data,
    alt: dish.dishName,
    className: "w-24 h-24 object-cover rounded-lg shadow-md flex-shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-gray-800 text-lg"
  }, dish.dishName), dish.dishDescription && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mt-1 italic"
  }, dish.dishDescription))))))))), /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, proposal.includedItems && proposal.includedItems.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2"
  }, "\u2713 O QUE EST\xC1 INCLUSO"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, proposal.includedItems.map((item, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-green-600"
  }, "\u2713"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700"
  }, item))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 rounded-lg p-6 border-2 border-orange-200 mb-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-orange-900 mb-4 uppercase"
  }, "\uD83D\uDCB0 INVESTIMENTO"), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 font-semibold mb-2"
  }, "Investimento"), /*#__PURE__*/React.createElement("p", {
    className: "text-5xl font-bold text-orange-600"
  }, "R$ ", Math.ceil(parseFloat(getFinalTotal(proposal))).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })), proposal.guests && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mt-1"
  }, "valores para at\xE9 ", proposal.guests, " convidados \u2022 R$ ", (Math.ceil(parseFloat(getFinalTotal(proposal))) / proposal.guests).toFixed(2), " por pessoa")), proposal.paymentMethod && /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 font-semibold mb-2"
  }, "Forma de pagamento"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700"
  }, proposal.paymentMethod)), (proposal.acceptPix || proposal.acceptCard || proposal.acceptCash) && /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 font-semibold mb-2"
  }, "Op\xE7\xF5es"), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc list-inside text-gray-700 space-y-1"
  }, proposal.acceptPix && /*#__PURE__*/React.createElement("li", null, "Pix"), proposal.acceptCard && /*#__PURE__*/React.createElement("li", null, "Cart\xE3o"), proposal.acceptCash && /*#__PURE__*/React.createElement("li", null, "Dinheiro"))), /*#__PURE__*/React.createElement("div", {
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 font-semibold mb-2"
  }, "Data da Proposta"), /*#__PURE__*/React.createElement("p", {
    className: "text-2xl font-bold text-gray-800"
  }, proposal.createdAt ? window.formatDate(proposal.createdAt) : new Date().toLocaleDateString('pt-BR')), proposal.validityDays && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mt-1"
  }, "Proposta v\xE1lida por ", proposal.validityDays, " dias.")), proposal.observations && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 font-semibold mb-2"
  }, "Observa\xE7\xF5es"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-700 whitespace-pre-line"
  }, proposal.observations))), (proposal.showCompanyName || proposal.showCompanyEmail || proposal.showCompanyPhone || proposal.showCompanyAddress) && /*#__PURE__*/React.createElement("div", {
    className: "pt-6 border-t-2 border-orange-500 text-center"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-4"
  }, "\uD83D\uDCDE CONTATO"), proposal.showCompanyName && proposal.companyName && /*#__PURE__*/React.createElement("h3", {
    className: "text-3xl font-bold text-orange-600 uppercase mb-4"
  }, proposal.companyName), /*#__PURE__*/React.createElement("div", {
    className: "text-gray-700 space-y-1"
  }, proposal.showCompanyEmail && proposal.companyEmail && /*#__PURE__*/React.createElement("p", null, proposal.companyEmail), proposal.showCompanyPhone && proposal.companyPhone && /*#__PURE__*/React.createElement("p", null, proposal.companyPhone), proposal.showCompanyAddress && proposal.companyAddress && /*#__PURE__*/React.createElement("p", null, proposal.companyAddress))))), selectedTemplate === 'modern' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 text-white p-12 flex flex-col justify-center items-center"
  }, companyLogo && /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("img", {
    src: companyLogo,
    alt: "Logo",
    className: "h-24 w-24 object-contain rounded-full bg-white p-2"
  })), /*#__PURE__*/React.createElement("h1", {
    className: "text-6xl font-bold mb-4 text-center"
  }, "PROPOSTA"), /*#__PURE__*/React.createElement("div", {
    className: "w-32 h-1 bg-white mb-8"
  }), proposal.proposalName && /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-light text-center mb-12"
  }, proposal.proposalName), clientData?.name && /*#__PURE__*/React.createElement("p", {
    className: "text-xl"
  }, "Para: ", clientData.name)), /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-blue-600 mb-6 border-b-4 border-blue-600 pb-2"
  }, "\uD83D\uDC64 Cliente"), hasClientData() ? /*#__PURE__*/React.createElement("div", {
    className: "mb-8 space-y-2"
  }, clientData.name && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Nome:"), " ", clientData.name), clientData.phone && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Telefone:"), " ", clientData.phone), clientData.email && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Email:"), " ", clientData.email), clientData.address && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Endere\xE7o:"), " ", clientData.address)) : /*#__PURE__*/React.createElement("p", {
    className: "mb-8 text-gray-500 italic"
  }, "Cliente n\xE3o cadastrado"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-blue-600 mb-6 border-b-4 border-blue-600 pb-2"
  }, "\uD83D\uDCC5 Evento"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, proposal.eventDate && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Data:"), " ", window.formatDate(proposal.eventDate)), proposal.guests && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Convidados:"), " ", proposal.guests, " pessoas"), proposal.eventLocation && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Local:"), " ", proposal.eventLocation), proposal.eventDuration && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Dura\xE7\xE3o:"), " ", proposal.eventDuration, " horas"))), proposal.selectedMenuData && /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-blue-600 mb-6 border-b-4 border-blue-600 pb-2"
  }, "\uD83C\uDF7D\uFE0F Menu"), /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-gray-800 mb-4"
  }, proposal.selectedMenuData.name), proposal.selectedMenuData.description && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mb-6"
  }, proposal.selectedMenuData.description), proposal.selectedMenuData.dishes && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, sortCategoriesOrder(groupDishesByCategory(proposal.selectedMenuData.dishes)).map(([category, dishes]) => /*#__PURE__*/React.createElement("div", {
    key: category,
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-blue-600 mb-3 pb-2 border-b-2 border-blue-400"
  }, category.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, dishes.map((dish, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "pl-4 flex gap-4"
  }, dish.photos && dish.photos.length > 0 && dish.photos[0] && /*#__PURE__*/React.createElement("img", {
    src: dish.photos[0].photoData || dish.photos[0].data,
    alt: dish.dishName,
    className: "w-24 h-24 object-cover rounded-lg shadow-md flex-shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-lg"
  }, dish.dishName), dish.dishDescription && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-700 mt-1 italic"
  }, dish.dishDescription))))))))), /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, proposal.includedItems && proposal.includedItems.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-blue-600 mb-6 border-b-4 border-blue-600 pb-2"
  }, "\u2713 O que est\xE1 incluso"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, proposal.includedItems.map((item, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600"
  }, "\u2713"), /*#__PURE__*/React.createElement("span", null, item))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-blue-600 to-purple-700 text-white p-8 rounded-lg"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold mb-6"
  }, "\uD83D\uDCB0 Investimento"), /*#__PURE__*/React.createElement("p", {
    className: "text-5xl font-bold mb-4"
  }, "R$ ", parseFloat(getFinalTotal(proposal)).toLocaleString('pt-BR', {
    minimumFractionDigits: 2
  })), proposal.guests && /*#__PURE__*/React.createElement("p", {
    className: "text-sm mb-4"
  }, "Para at\xE9 ", proposal.guests, " convidados \u2022 R$ ", (parseFloat(getFinalTotal(proposal)) / proposal.guests).toFixed(2), " por pessoa"), proposal.paymentMethod && /*#__PURE__*/React.createElement("p", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("strong", null, "Pagamento:"), " ", proposal.paymentMethod)), (proposal.showCompanyName || proposal.showCompanyEmail || proposal.showCompanyPhone || proposal.showCompanyAddress) && /*#__PURE__*/React.createElement("div", {
    className: "mt-12 pt-6 border-t-4 border-blue-600 text-center"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-blue-600 mb-2"
  }, "\uD83D\uDCDE Contato"), proposal.showCompanyName && proposal.companyName && /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold mb-2"
  }, proposal.companyName), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, proposal.showCompanyEmail && proposal.companyEmail && /*#__PURE__*/React.createElement("p", null, proposal.companyEmail), proposal.showCompanyPhone && proposal.companyPhone && /*#__PURE__*/React.createElement("p", null, proposal.companyPhone), proposal.showCompanyAddress && proposal.companyAddress && /*#__PURE__*/React.createElement("p", null, proposal.companyAddress))))), selectedTemplate === 'classic' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white text-gray-900 p-12 flex flex-col justify-center items-center border-8 border-double border-gray-800"
  }, companyLogo && /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("img", {
    src: companyLogo,
    alt: "Logo",
    className: "h-32 w-32 object-contain"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-5xl font-serif mb-4 uppercase tracking-wider"
  }, "Proposta Comercial"), /*#__PURE__*/React.createElement("div", {
    className: "w-64 h-0.5 bg-gray-800 mx-auto my-8"
  }), proposal.proposalName && /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-serif italic mb-8"
  }, proposal.proposalName), clientData?.name && /*#__PURE__*/React.createElement("p", {
    className: "text-lg"
  }, "Apresentado a: ", /*#__PURE__*/React.createElement("strong", null, clientData.name)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mt-8"
  }, window.formatDate(proposal.createdAt)))), /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-l-8 border-gray-800 pl-6 mb-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-serif mb-4"
  }, "Dados do Cliente")), hasClientData() ? /*#__PURE__*/React.createElement("div", {
    className: "mb-8 space-y-2 pl-6"
  }, clientData.name && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Nome:"), " ", clientData.name), clientData.phone && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Telefone:"), " ", clientData.phone), clientData.email && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Email:"), " ", clientData.email), clientData.address && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Endere\xE7o:"), " ", clientData.address)) : /*#__PURE__*/React.createElement("p", {
    className: "mb-8 pl-6 text-gray-500 italic"
  }, "Cliente n\xE3o cadastrado"), /*#__PURE__*/React.createElement("div", {
    className: "border-l-8 border-gray-800 pl-6 mb-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-serif mb-4"
  }, "Dados do Evento")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 pl-6"
  }, proposal.eventDate && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Data:"), " ", window.formatDate(proposal.eventDate)), proposal.guests && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Convidados:"), " ", proposal.guests, " pessoas"), proposal.eventLocation && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Local:"), " ", proposal.eventLocation), proposal.eventDuration && /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Dura\xE7\xE3o:"), " ", proposal.eventDuration, " horas"))), proposal.selectedMenuData && /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-l-8 border-gray-800 pl-6 mb-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-serif mb-4"
  }, "Menu")), /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-serif font-bold mb-4 pl-6"
  }, proposal.selectedMenuData.name), proposal.selectedMenuData.description && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mb-6 pl-6 italic"
  }, proposal.selectedMenuData.description), proposal.selectedMenuData.dishes && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6 pl-6"
  }, sortCategoriesOrder(groupDishesByCategory(proposal.selectedMenuData.dishes)).map(([category, dishes]) => /*#__PURE__*/React.createElement("div", {
    key: category,
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-serif font-bold text-gray-800 mb-3 pb-2 border-b-2 border-gray-400"
  }, category.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, dishes.map((dish, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "pl-4 flex gap-4"
  }, dish.photos && dish.photos.length > 0 && dish.photos[0] && /*#__PURE__*/React.createElement("img", {
    src: dish.photos[0].photoData || dish.photos[0].data,
    alt: dish.dishName,
    className: "w-24 h-24 object-cover rounded-lg shadow-md flex-shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-lg"
  }, dish.dishName), dish.dishDescription && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-700 mt-1 italic"
  }, dish.dishDescription))))))))), /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, proposal.includedItems && proposal.includedItems.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-l-8 border-gray-800 pl-6 mb-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-serif mb-4"
  }, "Itens Inclusos")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 pl-6"
  }, proposal.includedItems.map((item, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-800"
  }, "\u2713"), /*#__PURE__*/React.createElement("span", null, item))))), /*#__PURE__*/React.createElement("div", {
    className: "border-8 border-double border-gray-800 p-8 text-center"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-serif mb-6"
  }, "Investimento"), /*#__PURE__*/React.createElement("p", {
    className: "text-5xl font-bold text-gray-800 mb-4"
  }, "R$ ", parseFloat(getFinalTotal(proposal)).toLocaleString('pt-BR', {
    minimumFractionDigits: 2
  })), proposal.guests && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mb-4"
  }, "Para at\xE9 ", proposal.guests, " convidados \u2022 R$ ", (parseFloat(getFinalTotal(proposal)) / proposal.guests).toFixed(2), " por pessoa"), proposal.paymentMethod && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 mb-2"
  }, /*#__PURE__*/React.createElement("strong", null, "Pagamento:"), " ", proposal.paymentMethod)), (proposal.showCompanyName || proposal.showCompanyEmail || proposal.showCompanyPhone || proposal.showCompanyAddress) && /*#__PURE__*/React.createElement("div", {
    className: "mt-12 pt-6 border-t-2 border-gray-800 text-center"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-serif mb-2"
  }, "Contato"), proposal.showCompanyName && proposal.companyName && /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold mb-2"
  }, proposal.companyName), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 text-gray-700"
  }, proposal.showCompanyEmail && proposal.companyEmail && /*#__PURE__*/React.createElement("p", null, proposal.companyEmail), proposal.showCompanyPhone && proposal.companyPhone && /*#__PURE__*/React.createElement("p", null, proposal.companyPhone), proposal.showCompanyAddress && proposal.companyAddress && /*#__PURE__*/React.createElement("p", null, proposal.companyAddress))))), selectedTemplate === 'minimal' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white text-gray-900 p-12 flex flex-col justify-center items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-2xl"
  }, /*#__PURE__*/React.createElement("h1", {
    className: "text-7xl font-light mb-2"
  }, "Proposta"), /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-1 bg-black my-8"
  }), proposal.proposalName && /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-light text-gray-600 mb-12"
  }, proposal.proposalName), clientData?.name && /*#__PURE__*/React.createElement("p", {
    className: "text-xl text-gray-600 mb-2"
  }, "Para"), clientData?.name && /*#__PURE__*/React.createElement("p", {
    className: "text-3xl font-light"
  }, clientData.name), companyLogo && /*#__PURE__*/React.createElement("div", {
    className: "mt-auto pt-12"
  }, /*#__PURE__*/React.createElement("img", {
    src: companyLogo,
    alt: "Logo",
    className: "h-16 w-16 object-contain"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-light mb-6"
  }, "Cliente"), hasClientData() ? /*#__PURE__*/React.createElement("div", {
    className: "mb-12 space-y-3"
  }, clientData.name && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "Nome"), /*#__PURE__*/React.createElement("br", null), clientData.name), clientData.phone && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "Telefone"), /*#__PURE__*/React.createElement("br", null), clientData.phone), clientData.email && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "Email"), /*#__PURE__*/React.createElement("br", null), clientData.email), clientData.address && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "Endere\xE7o"), /*#__PURE__*/React.createElement("br", null), clientData.address)) : /*#__PURE__*/React.createElement("p", {
    className: "mb-12 text-gray-400 italic"
  }, "Cliente n\xE3o cadastrado"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-light mb-6"
  }, "Evento"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, proposal.eventDate && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "Data"), /*#__PURE__*/React.createElement("br", null), window.formatDate(proposal.eventDate)), proposal.guests && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "Convidados"), /*#__PURE__*/React.createElement("br", null), proposal.guests, " pessoas"), proposal.eventLocation && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "Local"), /*#__PURE__*/React.createElement("br", null), proposal.eventLocation), proposal.eventDuration && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "Dura\xE7\xE3o"), /*#__PURE__*/React.createElement("br", null), proposal.eventDuration, " horas"))), proposal.selectedMenuData && /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-light mb-6"
  }, "Menu"), /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-light mb-3"
  }, proposal.selectedMenuData.name), proposal.selectedMenuData.description && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mb-8 font-light"
  }, proposal.selectedMenuData.description), proposal.selectedMenuData.dishes && /*#__PURE__*/React.createElement("div", {
    className: "space-y-8"
  }, sortCategoriesOrder(groupDishesByCategory(proposal.selectedMenuData.dishes)).map(([category, dishes]) => /*#__PURE__*/React.createElement("div", {
    key: category,
    className: "mb-6"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-light text-gray-800 mb-4 pb-2 border-b border-gray-300"
  }, category.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, dishes.map((dish, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "pl-4 flex gap-4"
  }, dish.photos && dish.photos.length > 0 && dish.photos[0] && /*#__PURE__*/React.createElement("img", {
    src: dish.photos[0].photoData || dish.photos[0].data,
    alt: dish.dishName,
    className: "w-24 h-24 object-cover rounded-lg shadow-md flex-shrink-0"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-lg font-light"
  }, dish.dishName), dish.dishDescription && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mt-1 font-light"
  }, dish.dishDescription))))))))), /*#__PURE__*/React.createElement("div", {
    className: "page-break min-h-screen bg-white p-12 flex flex-col"
  }, proposal.includedItems && proposal.includedItems.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-12"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-light mb-6"
  }, "Incluso"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, proposal.includedItems.map((item, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-black mt-1"
  }, "\u2014"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-700 font-light"
  }, item))))), /*#__PURE__*/React.createElement("div", {
    className: "mb-12"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-light mb-6"
  }, "Investimento"), /*#__PURE__*/React.createElement("p", {
    className: "text-6xl font-light mb-4"
  }, "R$ ", parseFloat(getFinalTotal(proposal)).toLocaleString('pt-BR', {
    minimumFractionDigits: 2
  })), proposal.guests && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-400 font-light"
  }, "Para at\xE9 ", proposal.guests, " convidados \u2022 R$ ", (parseFloat(getFinalTotal(proposal)) / proposal.guests).toFixed(2), " por pessoa"), proposal.paymentMethod && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 font-light mt-4"
  }, proposal.paymentMethod)), (proposal.showCompanyName || proposal.showCompanyEmail || proposal.showCompanyPhone || proposal.showCompanyAddress) && /*#__PURE__*/React.createElement("div", {
    className: "pt-6 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-light mb-4"
  }, "Contato"), proposal.showCompanyName && proposal.companyName && /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-light mb-2"
  }, proposal.companyName), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 text-gray-600 font-light"
  }, proposal.showCompanyEmail && proposal.companyEmail && /*#__PURE__*/React.createElement("p", null, proposal.companyEmail), proposal.showCompanyPhone && proposal.companyPhone && /*#__PURE__*/React.createElement("p", null, proposal.companyPhone), proposal.showCompanyAddress && proposal.companyAddress && /*#__PURE__*/React.createElement("p", null, proposal.companyAddress))))))), showDeleteConfirm && /*#__PURE__*/React.createElement("div", {
    className: "no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-6xl mb-4"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-gray-800 mb-2"
  }, "Excluir Proposta?"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600"
  }, "Esta a\xE7\xE3o n\xE3o pode ser desfeita. A proposta ser\xE1 removida permanentemente."), proposal?.proposalName && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 mt-2"
  }, /*#__PURE__*/React.createElement("strong", null, proposal.proposalName))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-end space-x-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowDeleteConfirm(false),
    className: "px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      handleDelete();
      setShowDeleteConfirm(false);
    },
    className: "px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
  }, "Excluir")))));
}

// Expor para window
window.ProposalPreview = ProposalPreview;
})();
