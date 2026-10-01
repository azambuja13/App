(function() {
/**
 * ===================================================================
 * PROPOSAL PREVIEW - Visualização e Impressão de Proposta
 * ===================================================================
 * Componente limpo apenas com Template Chef Premium
 */

const {
  PDFButton
} = window;
function ProposalPreview({
  proposalId,
  isOpen,
  onClose,
  onDelete
}) {
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
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('chef'); // chef, modern, classic, minimal

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
      const proposalData = allProposals.find(p => p.id === proposalId);
      console.log('📋 [ProposalPreview] Dados recebidos:', proposalData);
      if (proposalData) {
        console.log('✅ [ProposalPreview] Proposta carregada:', proposalData.proposalName);
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
  useEffect(() => {
    if (isOpen && proposalId) {
      loadProposal();
      loadCompanyLogo();
    }
  }, [isOpen, proposalId]);
  if (!isOpen) return null;
  if (loading || !proposal) {
    return /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-lg p-8"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-lg"
    }, "Carregando proposta...")));
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
    className: "no-print sticky top-0 z-10 bg-white shadow-md border-b border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-5xl mx-auto px-6 py-4 flex items-center justify-between"
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
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-600"
  }, "Template:"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
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
    className: "flex gap-3"
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
  })), "Excluir"), PDFButton ? /*#__PURE__*/React.createElement(PDFButton, {
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
    className: "page-break bg-white p-12"
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
    className: "page-break bg-white p-12"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-gray-800 mb-4 border-b-2 border-orange-500 pb-2"
  }, "\uD83C\uDF7D\uFE0F MENU"), /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-50 rounded-lg p-6 border border-orange-200 mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-orange-900"
  }, proposal.selectedMenuData.name), proposal.selectedMenuData.description && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 mt-2"
  }, proposal.selectedMenuData.description)), proposal.selectedMenuData.dishes && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, proposal.selectedMenuData.dishes.map((dish, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "flex gap-4 items-start p-4 bg-gray-50 rounded-lg border border-gray-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 text-lg"
  }, dish.dishName), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, dish.dishCategory), dish.dishDescription && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mt-1 italic"
  }, dish.dishDescription)))))), /*#__PURE__*/React.createElement("div", {
    className: "page-break bg-white p-12"
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
    className: "page-break bg-white p-12"
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
    className: "page-break bg-white p-12"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold text-blue-600 mb-6 border-b-4 border-blue-600 pb-2"
  }, "\uD83C\uDF7D\uFE0F Menu"), /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-bold text-gray-800 mb-4"
  }, proposal.selectedMenuData.name), proposal.selectedMenuData.description && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mb-6"
  }, proposal.selectedMenuData.description), proposal.selectedMenuData.dishes && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, proposal.selectedMenuData.dishes.map((dish, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "border-l-4 border-blue-600 pl-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-lg"
  }, dish.dishName), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, dish.dishCategory), dish.dishDescription && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-700"
  }, dish.dishDescription))))), /*#__PURE__*/React.createElement("div", {
    className: "page-break bg-white p-12"
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
    className: "page-break bg-white p-12"
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
    className: "page-break bg-white p-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-l-8 border-gray-800 pl-6 mb-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-serif mb-4"
  }, "Menu")), /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-serif font-bold mb-4 pl-6"
  }, proposal.selectedMenuData.name), proposal.selectedMenuData.description && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mb-6 pl-6 italic"
  }, proposal.selectedMenuData.description), proposal.selectedMenuData.dishes && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 pl-6"
  }, proposal.selectedMenuData.dishes.map((dish, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "pb-3 border-b border-gray-300"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-lg"
  }, dish.dishName), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, dish.dishCategory), dish.dishDescription && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-700 italic"
  }, dish.dishDescription))))), /*#__PURE__*/React.createElement("div", {
    className: "page-break bg-white p-12"
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
    className: "page-break bg-white p-12"
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
    className: "page-break bg-white p-12"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-light mb-6"
  }, "Menu"), /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-light mb-3"
  }, proposal.selectedMenuData.name), proposal.selectedMenuData.description && /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 mb-8 font-light"
  }, proposal.selectedMenuData.description), proposal.selectedMenuData.dishes && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, proposal.selectedMenuData.dishes.map((dish, index) => /*#__PURE__*/React.createElement("div", {
    key: index,
    className: "border-b border-gray-200 pb-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-lg font-light"
  }, dish.dishName), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-400"
  }, dish.dishCategory), dish.dishDescription && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mt-1 font-light"
  }, dish.dishDescription))))), /*#__PURE__*/React.createElement("div", {
    className: "page-break bg-white p-12"
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
