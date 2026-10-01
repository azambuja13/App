/**
 * ===================================================================
 * EXPORT - Funções de Exportação
 * ===================================================================
 * Funções para exportar dados em diferentes formatos (PDF, Excel, etc)
 *
 * Dependências externas:
 * - jsPDF: para geração de PDFs
 * - SheetJS (XLSX): para geração de planilhas Excel
 */

import { formatCurrency, formatDate } from './formatters.js';

/**
 * Gera proposta comercial em PDF
 * @param {Object} eventData - Dados do evento
 * @param {Object} costs - Custos calculados
 * @param {Object} companyData - Dados da empresa
 * @returns {Promise<void>}
 */
export async function generateProposalPDF(eventData, costs, companyData = {}) {
    // Verificar se jsPDF está disponível
    if (typeof window.jspdf === 'undefined') {
        console.error('jsPDF não está carregado');
        throw new Error('jsPDF não está disponível. Inclua o script no HTML.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const {
        eventName = 'Evento',
        eventDate = new Date().toISOString().split('T')[0],
        guests = 0,
        clientName = '',
        clientPhone = '',
        clientEmail = ''
    } = eventData;

    const {
        company = 'Sua Empresa',
        phone = '(00) 0000-0000',
        email = 'contato@empresa.com',
        address = 'Endereço da empresa'
    } = companyData;

    let y = 20; // Posição vertical inicial

    // Cabeçalho
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('PROPOSTA COMERCIAL', 105, y, { align: 'center' });
    y += 15;

    // Dados da empresa
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(company, 20, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${phone} | ${email}`, 20, y);
    y += 5;
    doc.text(address, 20, y);
    y += 15;

    // Linha divisória
    doc.line(20, y, 190, y);
    y += 10;

    // Dados do evento
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('DADOS DO EVENTO', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Evento: ${eventName}`, 20, y);
    y += 6;
    doc.text(`Data: ${formatDate(eventDate)}`, 20, y);
    y += 6;
    doc.text(`Convidados: ${guests}`, 20, y);
    y += 10;

    if (clientName) {
        doc.setFont(undefined, 'bold');
        doc.text('CLIENTE:', 20, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        doc.text(`Nome: ${clientName}`, 20, y);
        y += 6;
        if (clientPhone) {
            doc.text(`Telefone: ${clientPhone}`, 20, y);
            y += 6;
        }
        if (clientEmail) {
            doc.text(`Email: ${clientEmail}`, 20, y);
            y += 6;
        }
    }

    y += 5;

    // Linha divisória
    doc.line(20, y, 190, y);
    y += 10;

    // Investimento
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('INVESTIMENTO', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    // Itens de custo
    if (costs.materialsCost > 0) {
        doc.text('Materiais e Ingredientes:', 20, y);
        doc.text(formatCurrency(costs.materialsCost), 190, y, { align: 'right' });
        y += 6;
    }

    if (costs.supportCost > 0) {
        doc.text('Itens de Apoio:', 20, y);
        doc.text(formatCurrency(costs.supportCost), 190, y, { align: 'right' });
        y += 6;
    }

    if (costs.transportCost > 0) {
        doc.text('Transporte:', 20, y);
        doc.text(formatCurrency(costs.transportCost), 190, y, { align: 'right' });
        y += 6;
    }

    if (costs.laborCost > 0) {
        doc.text('Mão de Obra:', 20, y);
        doc.text(formatCurrency(costs.laborCost), 190, y, { align: 'right' });
        y += 6;
    }

    y += 5;

    // Linha divisória
    doc.line(20, y, 190, y);
    y += 8;

    // Total
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('VALOR TOTAL:', 20, y);
    doc.text(formatCurrency(costs.totalCost), 190, y, { align: 'right' });
    y += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Valor por pessoa: ${formatCurrency(costs.pricePerPerson)}`, 20, y);
    y += 15;

    // Linha divisória
    doc.line(20, y, 190, y);
    y += 10;

    // Termos e condições
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('TERMOS E CONDIÇÕES', 20, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const terms = [
        '• Proposta válida por 15 dias',
        '• Pagamento: 50% entrada + 50% no dia do evento',
        '• Valores sujeitos a reajuste caso haja alteração no número de convidados',
        '• Incluso: materiais, mão de obra e transporte',
        '• Equipamentos e utensílios adicionais podem ter custo extra'
    ];

    terms.forEach(term => {
        doc.text(term, 20, y);
        y += 5;
    });

    y += 10;

    // Rodapé
    doc.setFontSize(8);
    doc.text('Proposta gerada automaticamente pela Calculadora de Precificação', 105, 280, { align: 'center' });
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 105, 285, { align: 'center' });

    // Salvar PDF
    const filename = `proposta-${eventName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    doc.save(filename);

    return {
        success: true,
        filename,
        message: 'PDF gerado com sucesso!'
    };
}

/**
 * Exporta ingredientes para Excel
 * @param {Array} ingredients - Lista de ingredientes
 * @returns {Promise<Object>} Resultado da operação
 */
export async function exportIngredientsToExcel(ingredients) {
    // Verificar se XLSX está disponível
    if (typeof XLSX === 'undefined') {
        console.error('SheetJS (XLSX) não está carregado');
        throw new Error('SheetJS não está disponível. Inclua o script no HTML.');
    }

    // Preparar dados para exportação
    const data = [
        // Cabeçalho com instruções
        ['CALCULADORA DE PRECIFICAÇÃO - BASE DE INGREDIENTES'],
        [''],
        ['INSTRUÇÕES:'],
        ['• Edite apenas as colunas marcadas com ✏️'],
        ['• NÃO altere Nome e Categoria (colunas com 🔒)'],
        ['• Use vírgula para separar decimais (ex: 12,50)'],
        ['• Salve e importe de volta para atualizar preços'],
        [''],
        // Cabeçalho da tabela
        ['🔒 ID', '🔒 Nome', '🔒 Categoria', '✏️ Custo (R$)', '✏️ Unidade']
    ];

    // Adicionar ingredientes
    ingredients.forEach(ing => {
        data.push([
            ing.id,
            ing.name,
            ing.category,
            ing.cost,
            ing.unit
        ]);
    });

    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ajustar largura das colunas
    ws['!cols'] = [
        { wch: 8 },  // ID
        { wch: 30 }, // Nome
        { wch: 20 }, // Categoria
        { wch: 15 }, // Custo
        { wch: 10 }  // Unidade
    ];

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Ingredientes');

    // Gerar arquivo
    const filename = `ingredientes-${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);

    return {
        success: true,
        filename,
        message: 'Planilha Excel gerada com sucesso!'
    };
}

/**
 * Importa ingredientes de planilha Excel
 * @param {File} file - Arquivo Excel
 * @returns {Promise<Object>} Dados importados
 */
export async function importIngredientsFromExcel(file) {
    return new Promise((resolve, reject) => {
        // Verificar se XLSX está disponível
        if (typeof XLSX === 'undefined') {
            reject({
                success: false,
                message: 'SheetJS não está disponível'
            });
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Pegar primeira planilha
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

                // Converter para JSON (pula linhas de cabeçalho)
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                    header: ['id', 'name', 'category', 'cost', 'unit'],
                    range: 9 // Pula as 9 primeiras linhas (instruções + cabeçalho)
                });

                // Validar e processar dados
                const ingredients = jsonData
                    .filter(row => row.id && row.name) // Filtrar linhas vazias
                    .map(row => ({
                        id: parseInt(row.id),
                        name: row.name,
                        category: row.category,
                        cost: parseFloat(String(row.cost).replace(',', '.')),
                        unit: row.unit
                    }));

                resolve({
                    success: true,
                    data: ingredients,
                    count: ingredients.length,
                    message: `${ingredients.length} ingredientes importados com sucesso!`
                });

            } catch (error) {
                console.error('Erro ao processar Excel:', error);
                reject({
                    success: false,
                    message: 'Erro ao processar arquivo Excel'
                });
            }
        };

        reader.onerror = () => {
            reject({
                success: false,
                message: 'Erro ao ler arquivo'
            });
        };

        reader.readAsArrayBuffer(file);
    });
}

/**
 * Exporta lista de compras em PDF
 * @param {Array} items - Itens calculados do evento
 * @param {Object} eventData - Dados do evento
 * @returns {Promise<Object>} Resultado da operação
 */
export async function exportShoppingListPDF(items, eventData) {
    if (typeof window.jspdf === 'undefined') {
        throw new Error('jsPDF não está disponível');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const { eventName = 'Evento', eventDate = '', guests = 0 } = eventData;

    let y = 20;

    // Título
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('LISTA DE COMPRAS', 105, y, { align: 'center' });
    y += 15;

    // Dados do evento
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Evento: ${eventName}`, 20, y);
    y += 6;
    doc.text(`Data: ${formatDate(eventDate)}`, 20, y);
    y += 6;
    doc.text(`Convidados: ${guests}`, 20, y);
    y += 12;

    // Cabeçalho da tabela
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('ITEM', 20, y);
    doc.text('QTD', 130, y);
    doc.text('UNIDADE', 160, y);
    y += 5;

    doc.line(20, y, 190, y);
    y += 7;

    // Itens ativos agrupados por categoria
    doc.setFont(undefined, 'normal');
    const activeItems = items.filter(item => item.active);

    // Agrupar por categoria
    const grouped = {};
    activeItems.forEach(item => {
        const cat = item.category || 'Outros';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    // Renderizar por categoria
    for (const [category, categoryItems] of Object.entries(grouped)) {
        // Verificar se precisa de nova página
        if (y > 250) {
            doc.addPage();
            y = 20;
        }

        // Nome da categoria
        doc.setFont(undefined, 'bold');
        doc.text(category, 20, y);
        y += 7;

        doc.setFont(undefined, 'normal');

        categoryItems.forEach(item => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }

            doc.text(`□ ${item.name}`, 25, y);
            doc.text(item.qtyToBuy.toFixed(2), 130, y);
            doc.text(item.unit === 'un' ? 'un' : 'kg/L', 160, y);
            y += 6;
        });

        y += 5;
    }

    // Rodapé
    doc.setFontSize(8);
    doc.text('Gerado pela Calculadora de Precificação', 105, 285, { align: 'center' });

    // Salvar
    const filename = `lista-compras-${eventName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    doc.save(filename);

    return {
        success: true,
        filename,
        message: 'Lista de compras gerada com sucesso!'
    };
}

/**
 * Abre janela de impressão do navegador
 */
export function printPage() {
    window.print();
}
