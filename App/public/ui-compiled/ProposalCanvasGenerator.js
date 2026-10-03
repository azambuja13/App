(function() {
/**
 * ProposalCanvasGenerator - Gerador de Propostas com Canvas
 * Cria propostas visualmente atraentes usando HTML5 Canvas
 * Suporta múltiplos templates e exportação PNG/PDF
 */

// React hooks usados via React.useState, React.useEffect, etc.
function ProposalCanvasGenerator({
  proposal,
  companyData,
  onClose
}) {
  const canvasRef = React.useRef(null);
  const [selectedTemplate, setSelectedTemplate] = React.useState('modern');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [customColors, setCustomColors] = React.useState({
    primary: '#ea580c',
    secondary: '#dc2626',
    accent: '#f97316'
  });
  const templates = [{
    id: 'modern',
    name: 'Moderno com Fotos',
    description: 'Design vibrante com fotos dos pratos em destaque',
    icon: '🎨'
  }, {
    id: 'minimalist',
    name: 'Minimalista Elegante',
    description: 'Design limpo e profissional',
    icon: '✨'
  }, {
    id: 'infographic',
    name: 'Estilo Infográfico',
    description: 'Gráficos e elementos visuais',
    icon: '📊'
  }, {
    id: 'chefazambuja',
    name: 'Chef Azambuja',
    description: 'Fundo preto com texto dourado - estilo premium',
    icon: '🔥'
  }];
  React.useEffect(() => {
    console.log('Canvas Generator montado');
    console.log('Proposal data:', proposal);
    console.log('Company data:', companyData);
    if (canvasRef.current && proposal) {
      console.log('Gerando proposta no canvas...');
      try {
        generateProposal();
      } catch (error) {
        console.error('Erro ao gerar proposta:', error);
        alert('❌ Erro ao gerar proposta. Verifique o console para detalhes.');
      }
    }
  }, [proposal, selectedTemplate, customColors]);
  const formatCurrency = value => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };
  const formatDate = dateString => {
    if (!dateString) return 'Data não definida';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // ========================================
  // TEMPLATE 1: MODERNO COM FOTOS
  // ========================================
  const generateModernTemplate = async (ctx, canvas) => {
    const width = canvas.width;
    const height = canvas.height;

    // Background branco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Header com gradiente
    const headerGradient = ctx.createLinearGradient(0, 0, width, 200);
    headerGradient.addColorStop(0, customColors.primary);
    headerGradient.addColorStop(1, customColors.secondary);
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, 200);

    // Logo da empresa (se disponível)
    if (companyData?.logo) {
      try {
        const logo = await loadImage(companyData.logo);
        const logoSize = 120;
        ctx.drawImage(logo, 40, 40, logoSize, logoSize);
      } catch (error) {
        console.log('Logo não carregada:', error);
      }
    }

    // Nome da empresa
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(companyData?.name || 'Sua Empresa', 180, 80);

    // Linha decorativa
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(180, 100);
    ctx.lineTo(width - 40, 100);
    ctx.stroke();

    // Título da proposta
    ctx.font = 'bold 28px Arial';
    ctx.fillText('PROPOSTA COMERCIAL', 180, 140);
    let currentY = 240;

    // Cliente e dados do evento
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('INFORMAÇÕES DO EVENTO', 40, currentY);
    currentY += 40;
    ctx.font = '18px Arial';
    ctx.fillStyle = '#4b5563';
    if (proposal.clientName) {
      ctx.fillText(`Cliente: ${proposal.clientName}`, 40, currentY);
      currentY += 30;
    }
    if (proposal.eventDate) {
      ctx.fillText(`Data: ${formatDate(proposal.eventDate)}`, 40, currentY);
      currentY += 30;
    }
    if (proposal.guests) {
      ctx.fillText(`Número de Convidados: ${proposal.guests} pessoas`, 40, currentY);
      currentY += 30;
    }
    if (proposal.eventLocation) {
      ctx.fillText(`Local: ${proposal.eventLocation}`, 40, currentY);
      currentY += 30;
    }
    currentY += 30;

    // Fotos dos pratos (se disponíveis e checkbox ativo)
    if (proposal.includeDishPhotos && proposal.selectedMenuData?.dishes) {
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('CARDÁPIO SELECIONADO', 40, currentY);
      currentY += 40;
      const dishManager = window.dishManager;
      const photoSize = 180;
      const photosPerRow = 4;
      let photoX = 40;
      let photoY = currentY;
      let photoCount = 0;
      for (const dish of proposal.selectedMenuData.dishes.slice(0, 8)) {
        if (dish.dishId && dishManager) {
          // Usar getById (async) para backend PostgreSQL
          const fullDish = dishManager.getById ? await dishManager.getById(dish.dishId) : dishManager.getDishById?.(dish.dishId);
          if (fullDish?.photos?.length > 0) {
            try {
              const photoData = fullDish.photos[0];
              const imgSrc = typeof photoData === 'string' ? photoData : photoData?.data || photoData?.src || photoData?.url;
              if (imgSrc) {
                const img = await loadImage(imgSrc);

                // Desenhar foto com borda arredondada
                ctx.save();
                roundRect(ctx, photoX, photoY, photoSize, photoSize, 10);
                ctx.clip();
                ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
                ctx.restore();

                // Borda
                ctx.strokeStyle = customColors.primary;
                ctx.lineWidth = 3;
                roundRect(ctx, photoX, photoY, photoSize, photoSize, 10);
                ctx.stroke();

                // Nome do prato
                ctx.fillStyle = '#1f2937';
                ctx.font = 'bold 14px Arial';
                const dishName = dish.dishName.substring(0, 20);
                ctx.fillText(dishName, photoX, photoY + photoSize + 20);
                photoCount++;
                photoX += photoSize + 20;
                if (photoCount % photosPerRow === 0) {
                  photoX = 40;
                  photoY += photoSize + 50;
                }
              }
            } catch (error) {
              console.log('Erro ao carregar foto:', error);
            }
          }
        }
      }
      if (photoCount > 0) {
        currentY = photoY + (photoCount % photosPerRow === 0 ? 0 : photoSize + 50);
      }
    }
    currentY += 30;

    // Resumo de custos
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('RESUMO FINANCEIRO', 40, currentY);
    currentY += 40;

    // Box com fundo colorido
    const boxWidth = width - 80;
    const boxHeight = 250;
    ctx.fillStyle = '#f9fafb';
    roundRect(ctx, 40, currentY, boxWidth, boxHeight, 15);
    ctx.fill();
    ctx.strokeStyle = customColors.primary;
    ctx.lineWidth = 2;
    roundRect(ctx, 40, currentY, boxWidth, boxHeight, 15);
    ctx.stroke();
    currentY += 40;

    // Detalhamento de custos
    const costs = [{
      label: 'Ingredientes',
      value: proposal.ingredientsCost,
      icon: '🥘'
    }, {
      label: 'Apoio',
      value: proposal.supportCost,
      icon: '🛠️'
    }, {
      label: 'Transporte',
      value: proposal.transportCost,
      icon: '🚗'
    }, {
      label: 'Mão de Obra',
      value: proposal.laborCost,
      icon: '👨‍🍳'
    }];
    ctx.font = '18px Arial';
    for (const cost of costs) {
      if (cost.value && cost.value > 0) {
        ctx.fillStyle = '#6b7280';
        ctx.fillText(`${cost.icon} ${cost.label}`, 60, currentY);
        ctx.fillStyle = customColors.primary;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(formatCurrency(cost.value), width - 200, currentY);
        ctx.font = '18px Arial';
        currentY += 35;
      }
    }

    // Linha separadora
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, currentY);
    ctx.lineTo(width - 60, currentY);
    ctx.stroke();
    currentY += 30;

    // Subtotal
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('SUBTOTAL', 60, currentY);
    ctx.fillText(formatCurrency(proposal.totalCost), width - 200, currentY);
    currentY += 40;

    // Margem (se houver)
    if (proposal.markupPercent && proposal.markupPercent > 0) {
      const markupValue = proposal.totalCost * (proposal.markupPercent / 100);
      ctx.fillStyle = '#6b7280';
      ctx.font = '18px Arial';
      ctx.fillText(`Margem (${proposal.markupPercent}%)`, 60, currentY);
      ctx.fillStyle = customColors.secondary;
      ctx.font = 'bold 18px Arial';
      ctx.fillText(`+ ${formatCurrency(markupValue)}`, width - 200, currentY);
      currentY += 40;
    }

    // Total final com destaque
    currentY += 20;
    const totalBoxY = currentY - 25;
    const totalGradient = ctx.createLinearGradient(40, totalBoxY, width - 40, totalBoxY + 60);
    totalGradient.addColorStop(0, customColors.primary);
    totalGradient.addColorStop(1, customColors.secondary);
    ctx.fillStyle = totalGradient;
    roundRect(ctx, 40, totalBoxY, boxWidth, 60, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('VALOR TOTAL', 60, currentY + 10);

    // Usar finalTotal salvo na proposta, ou calcular se não existir
    const finalTotal = proposal.finalTotal || proposal.totalCost + proposal.totalCost * ((proposal.markupPercent || 0) / 100);
    ctx.fillText(formatCurrency(finalTotal), width - 250, currentY + 10);
    currentY += 80;

    // Rodapé
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Arial';
    ctx.fillText(`Proposta válida por 30 dias`, 40, currentY);
    if (companyData?.phone) {
      ctx.fillText(`Contato: ${companyData.phone}`, 40, currentY + 25);
    }
    if (companyData?.email) {
      ctx.fillText(`Email: ${companyData.email}`, 40, currentY + 50);
    }
  };

  // ========================================
  // TEMPLATE 2: MINIMALISTA ELEGANTE
  // ========================================
  const generateMinimalistTemplate = async (ctx, canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    const margin = 60;

    // Background com textura sutil
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);

    // Borda elegante
    ctx.strokeStyle = customColors.primary;
    ctx.lineWidth = 3;
    ctx.strokeRect(margin - 10, margin - 10, width - 2 * (margin - 10), height - 2 * (margin - 10));
    let currentY = margin + 20;

    // Logo pequeno no canto
    if (companyData?.logo) {
      try {
        const logo = await loadImage(companyData.logo);
        ctx.drawImage(logo, width - margin - 80, margin, 80, 80);
      } catch (error) {
        console.log('Logo não carregada');
      }
    }

    // Título minimalista
    ctx.fillStyle = '#1f2937';
    ctx.font = '48px Georgia';
    ctx.fillText('Proposta', margin, currentY);
    currentY += 60;

    // Linha fina decorativa
    ctx.strokeStyle = customColors.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, currentY);
    ctx.lineTo(margin + 200, currentY);
    ctx.stroke();
    currentY += 50;

    // Nome da empresa
    ctx.fillStyle = '#6b7280';
    ctx.font = '20px Arial';
    ctx.fillText(companyData?.name || 'Sua Empresa', margin, currentY);
    currentY += 60;

    // Informações do cliente
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('CLIENTE', margin, currentY);
    currentY += 30;
    ctx.font = '16px Arial';
    ctx.fillStyle = '#4b5563';
    if (proposal.clientName) {
      ctx.fillText(proposal.clientName, margin, currentY);
      currentY += 25;
    }
    if (proposal.eventDate) {
      ctx.fillText(formatDate(proposal.eventDate), margin, currentY);
      currentY += 25;
    }
    if (proposal.guests) {
      ctx.fillText(`${proposal.guests} convidados`, margin, currentY);
      currentY += 25;
    }
    if (proposal.eventLocation) {
      ctx.fillText(proposal.eventLocation, margin, currentY);
      currentY += 25;
    }
    currentY += 50;

    // Detalhamento financeiro em tabela elegante
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('DETALHAMENTO', margin, currentY);
    currentY += 40;
    const costs = [{
      label: 'Ingredientes',
      value: proposal.ingredientsCost
    }, {
      label: 'Apoio',
      value: proposal.supportCost
    }, {
      label: 'Transporte',
      value: proposal.transportCost
    }, {
      label: 'Mão de Obra',
      value: proposal.laborCost
    }];
    ctx.font = '16px Arial';
    for (const cost of costs) {
      if (cost.value && cost.value > 0) {
        // Linha sutil
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin, currentY - 10);
        ctx.lineTo(width - margin, currentY - 10);
        ctx.stroke();
        ctx.fillStyle = '#4b5563';
        ctx.fillText(cost.label, margin, currentY);
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 16px Arial';
        const valueText = formatCurrency(cost.value);
        const valueWidth = ctx.measureText(valueText).width;
        ctx.fillText(valueText, width - margin - valueWidth, currentY);
        ctx.font = '16px Arial';
        currentY += 35;
      }
    }
    currentY += 20;

    // Linha de separação mais grossa
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, currentY);
    ctx.lineTo(width - margin, currentY);
    ctx.stroke();
    currentY += 40;

    // Total
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 32px Georgia';
    ctx.fillText('TOTAL', margin, currentY);

    // Usar finalTotal salvo na proposta, ou calcular se não existir
    const finalTotal = proposal.finalTotal || proposal.totalCost + proposal.totalCost * ((proposal.markupPercent || 0) / 100);
    const totalText = formatCurrency(finalTotal);
    const totalWidth = ctx.measureText(totalText).width;
    ctx.fillStyle = customColors.primary;
    ctx.fillText(totalText, width - margin - totalWidth, currentY);
    currentY += 80;

    // Margem info (se houver)
    if (proposal.markupPercent && proposal.markupPercent > 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = 'italic 14px Arial';
      ctx.fillText(`Inclui margem de ${proposal.markupPercent}%`, margin, currentY);
      currentY += 30;
    }

    // Rodapé minimalista
    currentY = height - margin - 40;
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Arial';
    ctx.fillText('Proposta válida por 30 dias', margin, currentY);
    if (companyData?.phone || companyData?.email) {
      const contactInfo = [companyData.phone, companyData.email].filter(Boolean).join(' • ');
      const contactWidth = ctx.measureText(contactInfo).width;
      ctx.fillText(contactInfo, width - margin - contactWidth, currentY);
    }
  };

  // ========================================
  // TEMPLATE 3: INFOGRÁFICO
  // ========================================
  const generateInfographicTemplate = async (ctx, canvas) => {
    const width = canvas.width;
    const height = canvas.height;

    // Background com gradiente suave
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#ffffff');
    bgGradient.addColorStop(1, '#f3f4f6');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    let currentY = 60;

    // Header com design moderno
    ctx.fillStyle = customColors.primary;
    ctx.fillRect(0, 0, width, 150);

    // Padrão decorativo no header
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(50 + i * 100, 75, 40, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // Título
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.fillText('PROPOSTA', 60, 80);
    ctx.font = '24px Arial';
    ctx.fillText('Comercial', 60, 110);
    currentY = 200;

    // Cards de informação
    const cardWidth = (width - 120) / 3;
    const cards = [{
      icon: '👤',
      label: 'Cliente',
      value: proposal.clientName || 'Não informado',
      color: '#3b82f6'
    }, {
      icon: '📅',
      label: 'Data',
      value: proposal.eventDate ? formatDate(proposal.eventDate) : 'Não definida',
      color: '#8b5cf6'
    }, {
      icon: '👥',
      label: 'Convidados',
      value: `${proposal.guests || 0}`,
      color: '#ec4899'
    }];
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardX = 40 + i * (cardWidth + 20);

      // Card background
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      roundRect(ctx, cardX, currentY, cardWidth, 140, 15);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Ícone
      ctx.font = '48px Arial';
      ctx.fillText(card.icon, cardX + 20, currentY + 60);

      // Label
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(card.label.toUpperCase(), cardX + 90, currentY + 40);

      // Value
      ctx.fillStyle = card.color;
      ctx.font = 'bold 18px Arial';
      const lines = wrapText(ctx, card.value, cardWidth - 100);
      lines.forEach((line, idx) => {
        ctx.fillText(line, cardX + 90, currentY + 65 + idx * 22);
      });
    }
    currentY += 200;

    // Gráfico de pizza dos custos
    const centerX = 220;
    const centerY = currentY + 150;
    const radius = 120;
    const costs = [{
      label: 'Ingredientes',
      value: proposal.ingredientsCost || 0,
      color: '#f97316'
    }, {
      label: 'Apoio',
      value: proposal.supportCost || 0,
      color: '#3b82f6'
    }, {
      label: 'Transporte',
      value: proposal.transportCost || 0,
      color: '#8b5cf6'
    }, {
      label: 'Mão de Obra',
      value: proposal.laborCost || 0,
      color: '#ec4899'
    }];
    const total = costs.reduce((sum, cost) => sum + cost.value, 0);
    if (total > 0) {
      let startAngle = -Math.PI / 2;

      // Título do gráfico
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('DISTRIBUIÇÃO DE CUSTOS', 40, currentY);
      costs.forEach(cost => {
        const percentage = cost.value / total;
        const endAngle = startAngle + percentage * Math.PI * 2;

        // Fatia do gráfico
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = cost.color;
        ctx.fill();

        // Borda branca
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        startAngle = endAngle;
      });

      // Círculo central branco
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Legenda
      let legendY = currentY + 50;
      const legendX = centerX + radius + 60;
      costs.forEach(cost => {
        if (cost.value > 0) {
          // Quadrado colorido
          ctx.fillStyle = cost.color;
          ctx.fillRect(legendX, legendY - 12, 20, 20);

          // Label
          ctx.fillStyle = '#1f2937';
          ctx.font = 'bold 16px Arial';
          ctx.fillText(cost.label, legendX + 30, legendY + 5);

          // Valor
          ctx.fillStyle = '#6b7280';
          ctx.font = '14px Arial';
          const percentage = (cost.value / total * 100).toFixed(1);
          ctx.fillText(`${formatCurrency(cost.value)} (${percentage}%)`, legendX + 30, legendY + 25);
          legendY += 55;
        }
      });
    }
    currentY += 340;

    // Box do total com destaque especial
    const totalBoxWidth = width - 80;
    const totalBoxHeight = 120;

    // Sombra
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    const totalGradient = ctx.createLinearGradient(0, currentY, 0, currentY + totalBoxHeight);
    totalGradient.addColorStop(0, customColors.primary);
    totalGradient.addColorStop(1, customColors.secondary);
    ctx.fillStyle = totalGradient;
    roundRect(ctx, 40, currentY, totalBoxWidth, totalBoxHeight, 20);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Total
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('INVESTIMENTO TOTAL', 70, currentY + 45);

    // Usar finalTotal salvo na proposta, ou calcular se não existir
    const finalTotal = proposal.finalTotal || proposal.totalCost + proposal.totalCost * ((proposal.markupPercent || 0) / 100);
    ctx.font = 'bold 48px Arial';
    ctx.fillText(formatCurrency(finalTotal), 70, currentY + 90);

    // Margem info
    if (proposal.markupPercent && proposal.markupPercent > 0) {
      ctx.font = '16px Arial';
      ctx.globalAlpha = 0.9;
      ctx.fillText(`+ ${proposal.markupPercent}% de margem`, width - 250, currentY + 90);
      ctx.globalAlpha = 1.0;
    }
    currentY += 160;

    // Rodapé informativo
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px Arial';
    ctx.fillText('📋 Proposta válida por 30 dias', 40, currentY);
    if (companyData?.phone) {
      ctx.fillText(`📞 ${companyData.phone}`, 40, currentY + 25);
    }
    if (companyData?.email) {
      ctx.fillText(`📧 ${companyData.email}`, 40, currentY + 50);
    }
  };

  // ========================================
  // TEMPLATE 4: CHEF AZAMBUJA (Preto e Dourado)
  // ========================================
  const generateChefAzambujaTemplate = async (ctx, canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    const gold = '#f59e0b'; // Dourado
    const lightGold = '#fbbf24';
    const darkGold = '#d97706';
    const gray = '#9ca3af';

    // ========== PÁGINA 1: CAPA ==========
    // Fundo preto
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Logo/círculo no topo (se houver logo da empresa)
    const centerX = width / 2;
    let currentY = 200;
    if (companyData?.logo) {
      try {
        const logo = await loadImage(companyData.logo);
        const logoSize = 400;
        ctx.save();
        ctx.beginPath();
        ctx.arc(centerX, currentY + 200, logoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logo, centerX - logoSize / 2, currentY, logoSize, logoSize);
        ctx.restore();
        currentY += logoSize + 100;
      } catch (error) {
        console.log('Logo não carregada, usando círculo padrão');
        // Desenhar círculo decorativo com ícone 🔥
        ctx.fillStyle = darkGold;
        ctx.beginPath();
        ctx.arc(centerX, currentY + 200, 150, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = gold;
        ctx.font = 'bold 120px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🔥', centerX, currentY + 240);
        currentY += 500;
      }
    } else {
      // Desenhar círculo decorativo com ícone 🔥
      ctx.fillStyle = darkGold;
      ctx.beginPath();
      ctx.arc(centerX, currentY + 200, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gold;
      ctx.font = 'bold 120px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🔥', centerX, currentY + 240);
      currentY += 500;
    }

    // Nome da empresa
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(companyData?.name || 'Chef Azambuja', centerX, currentY);
    currentY += 150;

    // Título PROPOSTA
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 160px Arial';
    ctx.fillText('PROPOSTA', centerX, currentY);
    currentY += 140;

    // Subtítulo COMERCIAL
    ctx.font = 'bold 140px Arial';
    ctx.fillText('COMERCIAL', centerX, currentY);
    currentY += 200;

    // Barra cinza com informações do cliente
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, height - 300, width, 200);
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    const clientName = proposal.clientName || proposal.clientData?.name || 'Cliente';
    ctx.fillText(`CONTATO: ${clientName}`, centerX, height - 200);
    const location = proposal.eventLocation || 'Local a definir';
    ctx.fillText(`LOCAL: ${location}`, centerX, height - 130);

    // Instagram/contato no rodapé
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px Arial';
    ctx.fillText(`@${companyData?.name?.toLowerCase().replace(/\s+/g, '_') || 'chef_azambuja'}`, centerX, height - 50);

    // ========== PÁGINA 2: O EVENTO ==========
    // Limpar canvas para nova página
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    currentY = 150;

    // Título da seção
    ctx.fillStyle = gold;
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('O EVENTO', 80, currentY);

    // Linha dourada abaixo do título
    ctx.fillStyle = gold;
    ctx.fillRect(80, currentY + 20, 400, 4);
    currentY += 200;

    // Informações do evento
    const eventInfo = [{
      label: 'Data:',
      value: formatDate(proposal.eventDate)
    }, {
      label: 'Convidados:',
      value: `${proposal.guests || 0} pessoas`
    }, {
      label: 'Duração:',
      value: '6 horas'
    }, {
      label: 'Local:',
      value: location
    }, {
      label: 'Proposta:',
      value: proposal.eventName || 'Evento personalizado'
    }];
    ctx.font = '48px Arial';
    eventInfo.forEach(info => {
      ctx.fillStyle = gold;
      ctx.fillText(info.label, 80, currentY);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(` ${info.value}`, 80 + ctx.measureText(info.label).width + 20, currentY);
      currentY += 100;
    });

    // Rodapé com nome
    ctx.fillStyle = gold;
    ctx.font = '36px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(companyData?.name || 'Chef Azambuja', width - 80, height - 80);

    // ========== PÁGINA 3: MENU ==========
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    currentY = 150;

    // Título MENU
    ctx.fillStyle = gold;
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('MENU', 80, currentY);
    ctx.fillStyle = gold;
    ctx.fillRect(80, currentY + 20, 300, 4);
    currentY += 150;

    // Subtítulo com emoji
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Arial';
    ctx.fillText('🎂 Cardápio Especial', 80, currentY);
    currentY += 120;

    // Listar itens do menu (se houver)
    if (proposal.items && proposal.items.length > 0) {
      ctx.font = '42px Arial';
      proposal.items.slice(0, 12).forEach((item, index) => {
        if (currentY > height - 200) return; // Evitar overflow

        ctx.fillStyle = gold;
        ctx.fillText('•', 100, currentY);
        ctx.fillStyle = '#ffffff';
        const itemName = item.name || item.ingredient?.name || 'Item';
        ctx.fillText(itemName, 160, currentY);
        currentY += 70;
      });
    } else {
      // Texto padrão se não houver itens
      ctx.fillStyle = gray;
      ctx.font = 'italic 38px Arial';
      ctx.fillText('Menu personalizado de acordo com suas preferências', 100, currentY);
      currentY += 80;
      ctx.fillText('Entre em contato para mais detalhes', 100, currentY);
    }

    // Rodapé
    ctx.fillStyle = gold;
    ctx.font = '36px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(companyData?.name || 'Chef Azambuja', width - 80, height - 80);

    // ========== PÁGINA 4: INVESTIMENTO ==========
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    currentY = 200;

    // Título PROPOSTA
    ctx.fillStyle = gold;
    ctx.font = 'bold 100px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PROPOSTA', centerX, currentY);
    currentY += 150;

    // Seção Investimento
    ctx.fillStyle = gold;
    ctx.font = '52px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Investimento', 80, currentY);
    currentY += 100;

    // Valor total em destaque
    ctx.fillStyle = gold;
    ctx.font = 'bold italic 140px Arial';
    ctx.textAlign = 'left';
    // Usar finalTotal salvo na proposta, ou calcular se não existir
    const totalValue = formatCurrency(proposal.finalTotal || proposal.totalCost || 0);
    ctx.fillText(totalValue, 80, currentY);
    currentY += 80;

    // Texto complementar
    ctx.fillStyle = '#ffffff';
    ctx.font = '38px Arial';
    ctx.fillText(`valores para até ${proposal.guests || 0} convidados`, 80, currentY);
    currentY += 150;

    // Forma de pagamento
    ctx.fillStyle = gold;
    ctx.font = '52px Arial';
    ctx.fillText('Forma de pagamento', 80, currentY);
    currentY += 80;
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px Arial';
    ctx.fillText('50% no fechamento e 50% até 2 horas antes de iniciar.', 80, currentY);
    currentY += 120;

    // Opções
    ctx.fillStyle = gold;
    ctx.font = '52px Arial';
    ctx.fillText('Opções', 80, currentY);
    currentY += 80;
    const paymentOptions = ['Pix', 'Boleto', 'Cartão'];
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px Arial';
    paymentOptions.forEach(option => {
      ctx.fillText(`• ${option}`, 120, currentY);
      currentY += 60;
    });
    currentY += 80;

    // Data da proposta
    ctx.fillStyle = gold;
    ctx.font = '52px Arial';
    ctx.fillText('Data da Proposta', 80, currentY);
    currentY += 80;
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.fillText(formatDate(new Date().toISOString().split('T')[0]), 80, currentY);
    currentY += 60;
    ctx.font = '32px Arial';
    ctx.fillText('• Proposta válida por 5 dias.', 120, currentY);

    // Rodapé
    ctx.fillStyle = gold;
    ctx.font = '36px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(companyData?.name || 'Chef Azambuja', width - 80, height - 80);

    // ========== PÁGINA 5: CONTATO ==========
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    currentY = height / 2 - 200;

    // Nome em destaque
    ctx.fillStyle = gold;
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(companyData?.name?.toUpperCase() || 'RAFAEL AZAMBUJA', centerX, currentY);
    currentY += 150;

    // Informações de contato
    const contacts = [];
    if (companyData?.email) {
      contacts.push(companyData.email);
    }
    if (companyData?.phone) {
      contacts.push(companyData.phone);
    }
    if (companyData?.address) {
      contacts.push(companyData.address);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    contacts.forEach(contact => {
      ctx.fillText(contact, centerX, currentY);
      currentY += 80;
    });

    // Mensagem final
    currentY += 100;
    ctx.fillStyle = gold;
    ctx.font = 'italic 42px Arial';
    ctx.fillText('Qualquer dúvida, estou à disposição.', centerX, currentY);
  };

  // ========================================
  // FUNÇÕES AUXILIARES
  // ========================================
  const loadImage = src => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };
  const roundRect = (ctx, x, y, width, height, radius) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };
  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };
  const generateProposal = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Canvas A4 em alta resolução (300 DPI)
    canvas.width = 2480;
    canvas.height = 3508;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Gerar template selecionado
    try {
      switch (selectedTemplate) {
        case 'modern':
          await generateModernTemplate(ctx, canvas);
          break;
        case 'minimalist':
          await generateMinimalistTemplate(ctx, canvas);
          break;
        case 'infographic':
          await generateInfographicTemplate(ctx, canvas);
          break;
        case 'chefazambuja':
          await generateChefAzambujaTemplate(ctx, canvas);
          break;
        default:
          await generateModernTemplate(ctx, canvas);
      }
    } catch (error) {
      console.error('Erro ao gerar proposta:', error);
    }
  };
  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `proposta-${proposal.clientName || 'cliente'}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };
  const downloadPDF = async () => {
    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Usar jsPDF se disponível
      if (window.jspdf && window.jspdf.jsPDF) {
        const {
          jsPDF
        } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save(`proposta-${proposal.clientName || 'cliente'}-${Date.now()}.pdf`);
      } else {
        alert('⚠️ Biblioteca jsPDF não carregada. Baixe como PNG.');
        downloadPNG();
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente baixar como PNG.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ✅ NOVA FUNÇÃO - Enviar via WhatsApp
  const sendViaWhatsApp = async () => {
    setIsGenerating(true);
    try {
      console.log('📱 [WhatsApp] Iniciando envio...');

      // 1. Validar dados
      if (!proposal.id) {
        alert('❌ Proposta não possui ID. Salve a proposta primeiro.');
        return;
      }

      if (!proposal.clientPhone) {
        alert('❌ Proposta não possui telefone do cliente. Adicione o telefone antes de enviar.');
        return;
      }

      // 2. Gerar PDF
      const canvas = canvasRef.current;
      if (!canvas) {
        alert('❌ Canvas não encontrado');
        return;
      }

      if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('⚠️ Biblioteca jsPDF não carregada. Recarregue a página.');
        return;
      }

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

      // Converter PDF para Blob
      const pdfBlob = pdf.output('blob');
      console.log('📄 [WhatsApp] PDF gerado:', pdfBlob.size, 'bytes');

      // 3. Criar FormData
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `proposta_${proposal.id}.pdf`);

      // 4. Enviar para backend
      console.log('📤 [WhatsApp] Enviando para API...');

      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('❌ Token de autenticação não encontrado. Faça login novamente.');
        return;
      }

      const API_URL = window.APP_CONFIG?.backend?.baseURL || 'https://precificacao-api-production.up.railway.app';

      const response = await fetch(`${API_URL}/api/proposals/${proposal.id}/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.message}\n\nWhatsApp enviado para: ${proposal.clientPhone}`);
        console.log('✅ [WhatsApp] Sucesso:', result);
      } else {
        alert(`❌ Erro ao enviar: ${result.message}`);
        console.error('❌ [WhatsApp] Erro:', result);
      }

    } catch (error) {
      console.error('❌ [WhatsApp] Erro:', error);
      alert('❌ Erro ao enviar via WhatsApp: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-orange-600 to-red-600 p-6 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl font-bold"
  }, "\uD83C\uDFA8 Gerador de Propostas Canvas"), /*#__PURE__*/React.createElement("p", {
    className: "text-orange-100 mt-1"
  }, "Crie propostas visualmente impressionantes")), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-3 transition"
  }, "\u274C"))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-3 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83D\uDCCB Escolha o Template"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, templates.map(template => /*#__PURE__*/React.createElement("button", {
    key: template.id,
    onClick: () => setSelectedTemplate(template.id),
    className: `w-full text-left p-4 rounded-lg border-2 transition ${selectedTemplate === template.id ? 'border-orange-600 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-3xl"
  }, template.icon), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-gray-800"
  }, template.name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600 mt-1"
  }, template.description)), selectedTemplate === template.id && /*#__PURE__*/React.createElement("span", {
    className: "text-orange-600 text-xl"
  }, "\u2713")))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83C\uDFA8 Cores Personalizadas"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "Cor Prim\xE1ria"), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: customColors.primary,
    onChange: e => setCustomColors({
      ...customColors,
      primary: e.target.value
    }),
    className: "w-full h-12 rounded-lg border border-gray-300 cursor-pointer"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-semibold text-gray-700 mb-2"
  }, "Cor Secund\xE1ria"), /*#__PURE__*/React.createElement("input", {
    type: "color",
    value: customColors.secondary,
    onChange: e => setCustomColors({
      ...customColors,
      secondary: e.target.value
    }),
    className: "w-full h-12 rounded-lg border border-gray-300 cursor-pointer"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: downloadPNG,
    disabled: isGenerating,
    className: "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
  }, "\uD83D\uDCE5 Baixar PNG"), /*#__PURE__*/React.createElement("button", {
    onClick: downloadPDF,
    disabled: isGenerating,
    className: "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
  }, isGenerating ? '⏳ Gerando...' : '📄 Baixar PDF'), /*#__PURE__*/React.createElement("button", {
    onClick: sendViaWhatsApp,
    disabled: isGenerating || !proposal.clientPhone,
    className: "w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50",
    title: !proposal.clientPhone ? 'Adicione o telefone do cliente primeiro' : 'Enviar proposta via WhatsApp'
  }, isGenerating ? '⏳ Enviando...' : '📱 Enviar via WhatsApp'))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-gray-800 mb-4"
  }, "\uD83D\uDC41\uFE0F Preview"), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-100 rounded-lg p-4 overflow-auto",
    style: {
      maxHeight: '70vh'
    }
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    className: "w-full border border-gray-300 shadow-lg",
    style: {
      maxWidth: '100%',
      height: 'auto'
    }
  })))))));
}

// Expor para window
window.ProposalCanvasGenerator = ProposalCanvasGenerator;
})();
