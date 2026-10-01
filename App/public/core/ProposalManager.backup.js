/**
 * ===================================================================
 * PROPOSAL MANAGER - Gerenciamento de Propostas
 * ===================================================================
 * Gerencia CRUD de propostas e seus pratos
 * Uma proposta pertence a um evento e contém múltiplos pratos
 */

/**
 * Classe para gerenciar propostas
 */
export class ProposalManager {
    constructor(storageKey = 'precificacao_propostas') {
        this.storageKey = storageKey;
        this.dishesKey = 'precificacao_pratos';
        this.eventsKey = 'precificacao_eventos';
    }

    /**
     * Gera ID único para proposta
     * @returns {string} ID único
     */
    generateId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `proposal_${timestamp}_${random}`;
    }

    /**
     * Gera número único de proposta (formato: PROP-2025-001)
     * @returns {string} Número de proposta
     */
    generateProposalNumber() {
        const proposals = this.getAllProposals();
        const year = new Date().getFullYear();

        // Filtrar propostas do ano atual
        const currentYearProposals = proposals.filter(p =>
            p.proposalNumber && p.proposalNumber.includes(year.toString())
        );

        // Pegar o maior número sequencial
        const maxNumber = currentYearProposals.reduce((max, p) => {
            const match = p.proposalNumber.match(/PROP-\d{4}-(\d+)/);
            if (match) {
                const num = parseInt(match[1]);
                return num > max ? num : max;
            }
            return max;
        }, 0);

        // Incrementar e formatar com 3 dígitos
        const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
        return `PROP-${year}-${nextNumber}`;
    }

    /**
     * Migração: Corrige propostas com id null
     */
    migrateNullIds() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (!data) return { fixed: 0 };

            const proposals = JSON.parse(data);
            let fixedCount = 0;

            proposals.forEach(proposal => {
                if (!proposal.id || proposal.id === null) {
                    proposal.id = this.generateId();
                    if (!proposal.proposalNumber) {
                        proposal.proposalNumber = this.generateProposalNumber();
                    }
                    fixedCount++;
                    console.log(`🔧 Proposta sem ID corrigida: ${proposal.id}`);
                }
            });

            if (fixedCount > 0) {
                localStorage.setItem(this.storageKey, JSON.stringify(proposals));
                console.log(`✅ ${fixedCount} propostas corrigidas`);
            }

            return { fixed: fixedCount };
        } catch (error) {
            console.error('Erro na migração:', error);
            return { fixed: 0, error: error.message };
        }
    }

    /**
     * Retorna todas as propostas
     * @returns {Array} Array de propostas
     */
    getAllProposals() {
        try {
            const data = localStorage.getItem(this.storageKey);
            const proposals = data ? JSON.parse(data) : [];

            // Migração automática na primeira chamada
            const hasNullId = proposals.some(p => !p.id || p.id === null);
            if (hasNullId) {
                console.warn('⚠️ Propostas com ID null detectadas, executando migração automática...');
                this.migrateNullIds();
                // Recarregar após migração
                const newData = localStorage.getItem(this.storageKey);
                return newData ? JSON.parse(newData) : [];
            }

            return proposals;
        } catch (error) {
            console.error('Erro ao carregar propostas:', error);
            return [];
        }
    }

    /**
     * Retorna proposta por ID
     * @param {string} proposalId - ID da proposta
     * @returns {Object|null} Proposta ou null
     */
    getProposalById(proposalId) {
        const proposals = this.getAllProposals();
        return proposals.find(p => p.id === proposalId) || null;
    }

    /**
     * Retorna propostas por evento
     * @param {string} eventId - ID do evento
     * @returns {Array} Array de propostas
     */
    getProposalsByEvent(eventId) {
        const proposals = this.getAllProposals();
        return proposals.filter(p => p.eventId === eventId && p.isActive);
    }

    /**
     * Retorna proposta ativa de um evento (se houver apenas uma)
     * @param {string} eventId - ID do evento
     * @returns {Object|null} Proposta ou null
     */
    getActiveProposalForEvent(eventId) {
        const proposals = this.getProposalsByEvent(eventId);
        return proposals.length === 1 ? proposals[0] : null;
    }

    /**
     * Busca propostas por termo
     * @param {string} searchTerm - Termo de busca
     * @returns {Array} Array de propostas
     */
    searchProposals(searchTerm) {
        const proposals = this.getAllProposals();
        const term = searchTerm.toLowerCase();

        return proposals.filter(p =>
            p.isActive && (
                p.proposalNumber?.toLowerCase().includes(term) ||
                p.proposalName?.toLowerCase().includes(term) ||
                p.proposalType?.toLowerCase().includes(term)
            )
        );
    }

    /**
     * Calcula totais da proposta
     * @param {Object} proposalData - Dados da proposta
     * @returns {Object} Totais calculados
     */
    calculateProposalTotals(proposalData) {
        const dishes = proposalData.dishes || [];

        // Custo total dos pratos
        const dishesTotalCost = dishes.reduce((sum, dish) => {
            return sum + (dish.totalCost || 0);
        }, 0);

        // Preço total dos pratos
        const dishesTotalPrice = dishes.reduce((sum, dish) => {
            return sum + (dish.totalPrice || 0);
        }, 0);

        // Outros custos (transporte, mão de obra, etc.)
        const transportCost = proposalData.transportCost || 0;
        const laborCost = proposalData.laborCost || 0;
        const otherCosts = proposalData.otherCosts || 0;

        // Custo total
        const totalCost = dishesTotalCost + transportCost + laborCost + otherCosts;

        // Markup/margem sobre o custo total
        const markupPercent = proposalData.markupPercent || 0;
        const markupValue = totalCost * (markupPercent / 100);

        // Preço final
        const finalTotal = totalCost + markupValue + dishesTotalPrice;

        return {
            dishesTotalCost,
            dishesTotalPrice,
            transportCost,
            laborCost,
            otherCosts,
            totalCost,
            markupPercent,
            markupValue,
            finalTotal
        };
    }

    /**
     * Calcula o tamanho do localStorage em MB
     * @returns {string} Tamanho formatado
     */
    getStorageSize() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return (total / 1024 / 1024).toFixed(2) + ' MB';
    }

    /**
     * Remove fotos de uma proposta para economizar espaço
     * @param {Object} proposalData - Dados da proposta
     * @returns {Object} Proposta sem fotos
     */
    compressProposalPhotos(proposalData) {
        const compressed = { ...proposalData };

        // Remover fotos da empresa temporariamente
        console.warn('⚠️ Removendo fotos da proposta para economizar espaço...');
        compressed.companyPhoto1 = null;
        compressed.companyPhoto2 = null;
        compressed.companyPhoto3 = null;

        return compressed;
    }

    /**
     * Salva ou atualiza proposta
     * @param {Object} proposalData - Dados da proposta
     * @returns {Object} Resultado da operação
     */
    saveProposal(proposalData) {
        try {
            const proposals = this.getAllProposals();
            const now = new Date().toISOString();
            let existingIndex = -1; // Declarar no escopo do try para uso no catch
            let savedProposal = null; // Guardar referência à proposta salva

            // APENAS calcular totais se NÃO vieram calculados (compatibilidade com código antigo)
            // Se totalCost e finalTotal já existem, não recalcular
            const totals = (proposalData.totalCost !== undefined && proposalData.finalTotal !== undefined)
                ? {} // Não sobrescrever valores já calculados
                : this.calculateProposalTotals(proposalData); // Calcular apenas se necessário

            console.log('💾 ProposalManager.saveProposal - totals:', totals);
            console.log('💾 ProposalManager.saveProposal - proposalData.totalCost:', proposalData.totalCost);
            console.log('💾 ProposalManager.saveProposal - proposalData.finalTotal:', proposalData.finalTotal);

            // Se tem ID, é atualização
            if (proposalData.id) {
                existingIndex = proposals.findIndex(p => p.id === proposalData.id);

                if (existingIndex !== -1) {
                    // Atualiza proposta existente - IMPORTANTE: manter isActive existente
                    const existingProposal = proposals[existingIndex];
                    proposals[existingIndex] = {
                        ...existingProposal,  // Manter dados existentes (incluindo isActive)
                        ...proposalData,       // Sobrescrever com novos dados
                        ...totals,             // Aplicar totais calculados (se houver)
                        isActive: existingProposal.isActive !== undefined ? existingProposal.isActive : true,  // Preservar isActive
                        updatedAt: now
                    };
                    savedProposal = proposals[existingIndex];
                } else {
                    // ID não encontrado, cria novo
                    const newProposal = {
                        ...proposalData,
                        id: this.generateId(),
                        proposalNumber: this.generateProposalNumber(),
                        ...totals,
                        createdAt: now,
                        updatedAt: now
                    };
                    proposals.push(newProposal);
                    savedProposal = newProposal;
                }
            } else {
                // Cria nova proposta
                const newProposal = {
                    ...proposalData,
                    id: this.generateId(),
                    proposalNumber: this.generateProposalNumber(),
                    ...totals,
                    isActive: true,
                    status: proposalData.status || 'draft', // draft, sent, approved, rejected
                    createdAt: now,
                    updatedAt: now
                };
                proposals.push(newProposal);
                savedProposal = newProposal;
            }

            try {
                localStorage.setItem(this.storageKey, JSON.stringify(proposals));
            } catch (quotaError) {
                if (quotaError.name === 'QuotaExceededError') {
                    console.error('❌ LocalStorage cheio! Tentando comprimir fotos...');

                    // Tentar comprimir fotos ainda mais
                    const compressedProposal = this.compressProposalPhotos(proposalData);

                    // Atualizar a proposta com fotos comprimidas
                    if (existingIndex !== -1) {
                        proposals[existingIndex] = {
                            ...proposals[existingIndex],
                            ...compressedProposal,
                            updatedAt: now
                        };
                    } else {
                        proposals[proposals.length - 1] = {
                            ...proposals[proposals.length - 1],
                            ...compressedProposal,
                            updatedAt: now
                        };
                    }

                    try {
                        localStorage.setItem(this.storageKey, JSON.stringify(proposals));
                        console.log('✅ Proposta salva com fotos mais comprimidas');
                    } catch (stillError) {
                        // Ainda não coube, mostrar erro detalhado
                        const storageSize = this.getStorageSize();
                        console.error('❌ Ainda não foi possível salvar. Tamanho atual:', storageSize);

                        return {
                            success: false,
                            message: 'Espaço de armazenamento insuficiente. Seu navegador está usando ' + storageSize + ' MB. Por favor, remova propostas antigas ou reduza o tamanho das fotos.',
                            error: 'QuotaExceededError',
                            storageSize: storageSize
                        };
                    }
                } else {
                    throw quotaError;
                }
            }

            return {
                success: true,
                message: 'Proposta salva com sucesso',
                proposal: savedProposal
            };
        } catch (error) {
            console.error('Erro ao salvar proposta:', error);
            return {
                success: false,
                message: 'Erro ao salvar proposta: ' + error.message,
                error: error.message
            };
        }
    }

    /**
     * Adiciona prato à proposta
     * @param {string} proposalId - ID da proposta
     * @param {Object} dishData - Dados do prato
     * @returns {Object} Resultado da operação
     */
    addDishToProposal(proposalId, dishData) {
        try {
            const proposal = this.getProposalById(proposalId);
            if (!proposal) {
                return {
                    success: false,
                    message: 'Proposta não encontrada'
                };
            }

            // Buscar informações do prato no DishManager
            const dishesData = localStorage.getItem(this.dishesKey);
            const dishes = dishesData ? JSON.parse(dishesData) : [];
            const dishInfo = dishes.find(d => d.id === dishData.dishId);

            if (!dishInfo) {
                return {
                    success: false,
                    message: 'Prato não encontrado'
                };
            }

            // Calcular custos e preços
            const quantity = dishData.quantity || 1;
            const costPerServing = dishInfo.costPerServing || 0;
            const pricePerServing = dishData.pricePerServing || 0;

            const totalCost = costPerServing * quantity;
            const totalPrice = pricePerServing * quantity;

            const newDish = {
                id: `pdish_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                dishId: dishData.dishId,
                dishName: dishInfo.name,
                dishCategory: dishInfo.category,
                quantity: quantity,
                costPerServing: costPerServing,
                pricePerServing: pricePerServing,
                totalCost: totalCost,
                totalPrice: totalPrice,
                notes: dishData.notes || null,
                displayOrder: (proposal.dishes?.length || 0) + 1
            };

            // Adicionar prato à proposta
            if (!proposal.dishes) {
                proposal.dishes = [];
            }
            proposal.dishes.push(newDish);

            // Salvar
            return this.saveProposal(proposal);
        } catch (error) {
            console.error('Erro ao adicionar prato:', error);
            return {
                success: false,
                message: 'Erro ao adicionar prato',
                error: error.message
            };
        }
    }

    /**
     * Remove prato da proposta
     * @param {string} proposalId - ID da proposta
     * @param {string} proposalDishId - ID do prato na proposta
     * @returns {Object} Resultado da operação
     */
    removeDishFromProposal(proposalId, proposalDishId) {
        try {
            const proposal = this.getProposalById(proposalId);
            if (!proposal) {
                return {
                    success: false,
                    message: 'Proposta não encontrada'
                };
            }

            // Remover prato
            proposal.dishes = proposal.dishes.filter(d => d.id !== proposalDishId);

            // Salvar
            return this.saveProposal(proposal);
        } catch (error) {
            console.error('Erro ao remover prato:', error);
            return {
                success: false,
                message: 'Erro ao remover prato',
                error: error.message
            };
        }
    }

    /**
     * Atualiza quantidade de prato na proposta
     * @param {string} proposalId - ID da proposta
     * @param {string} proposalDishId - ID do prato na proposta
     * @param {number} newQuantity - Nova quantidade
     * @returns {Object} Resultado da operação
     */
    updateDishQuantity(proposalId, proposalDishId, newQuantity) {
        try {
            const proposal = this.getProposalById(proposalId);
            if (!proposal) {
                return {
                    success: false,
                    message: 'Proposta não encontrada'
                };
            }

            // Atualizar quantidade
            const dish = proposal.dishes.find(d => d.id === proposalDishId);
            if (dish) {
                dish.quantity = newQuantity;
                dish.totalCost = dish.costPerServing * newQuantity;
                dish.totalPrice = dish.pricePerServing * newQuantity;

                // Salvar
                return this.saveProposal(proposal);
            }

            return {
                success: false,
                message: 'Prato não encontrado'
            };
        } catch (error) {
            console.error('Erro ao atualizar quantidade:', error);
            return {
                success: false,
                message: 'Erro ao atualizar quantidade',
                error: error.message
            };
        }
    }

    /**
     * Atualiza preço por porção de um prato
     * @param {string} proposalId - ID da proposta
     * @param {string} proposalDishId - ID do prato na proposta
     * @param {number} newPrice - Novo preço por porção
     * @returns {Object} Resultado da operação
     */
    updateDishPrice(proposalId, proposalDishId, newPrice) {
        try {
            const proposal = this.getProposalById(proposalId);
            if (!proposal) {
                return {
                    success: false,
                    message: 'Proposta não encontrada'
                };
            }

            // Atualizar preço
            const dish = proposal.dishes.find(d => d.id === proposalDishId);
            if (dish) {
                dish.pricePerServing = newPrice;
                dish.totalPrice = newPrice * dish.quantity;

                // Salvar
                return this.saveProposal(proposal);
            }

            return {
                success: false,
                message: 'Prato não encontrado'
            };
        } catch (error) {
            console.error('Erro ao atualizar preço:', error);
            return {
                success: false,
                message: 'Erro ao atualizar preço',
                error: error.message
            };
        }
    }

    /**
     * Atualiza custos adicionais (transporte, mão de obra, etc.)
     * @param {string} proposalId - ID da proposta
     * @param {Object} costsData - Dados dos custos
     * @returns {Object} Resultado da operação
     */
    updateAdditionalCosts(proposalId, costsData) {
        try {
            const proposal = this.getProposalById(proposalId);
            if (!proposal) {
                return {
                    success: false,
                    message: 'Proposta não encontrada'
                };
            }

            // Atualizar custos
            proposal.transportCost = costsData.transportCost || 0;
            proposal.laborCost = costsData.laborCost || 0;
            proposal.otherCosts = costsData.otherCosts || 0;

            // Salvar
            return this.saveProposal(proposal);
        } catch (error) {
            console.error('Erro ao atualizar custos:', error);
            return {
                success: false,
                message: 'Erro ao atualizar custos',
                error: error.message
            };
        }
    }

    /**
     * Atualiza markup da proposta
     * @param {string} proposalId - ID da proposta
     * @param {number} markupPercent - Percentual de markup
     * @returns {Object} Resultado da operação
     */
    updateMarkup(proposalId, markupPercent) {
        try {
            const proposal = this.getProposalById(proposalId);
            if (!proposal) {
                return {
                    success: false,
                    message: 'Proposta não encontrada'
                };
            }

            proposal.markupPercent = markupPercent;

            // Salvar
            return this.saveProposal(proposal);
        } catch (error) {
            console.error('Erro ao atualizar markup:', error);
            return {
                success: false,
                message: 'Erro ao atualizar markup',
                error: error.message
            };
        }
    }

    /**
     * Atualiza status da proposta
     * @param {string} proposalId - ID da proposta
     * @param {string} newStatus - Novo status (draft, sent, approved, rejected)
     * @returns {Object} Resultado da operação
     */
    updateStatus(proposalId, newStatus) {
        try {
            const proposal = this.getProposalById(proposalId);
            if (!proposal) {
                return {
                    success: false,
                    message: 'Proposta não encontrada'
                };
            }

            const validStatuses = ['draft', 'sent', 'approved', 'rejected'];
            if (!validStatuses.includes(newStatus)) {
                return {
                    success: false,
                    message: 'Status inválido'
                };
            }

            proposal.status = newStatus;
            if (newStatus === 'sent') {
                proposal.sentAt = new Date().toISOString();
            } else if (newStatus === 'approved') {
                proposal.approvedAt = new Date().toISOString();
            }

            // Salvar
            return this.saveProposal(proposal);
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            return {
                success: false,
                message: 'Erro ao atualizar status',
                error: error.message
            };
        }
    }

    /**
     * Duplica uma proposta
     * @param {string} proposalId - ID da proposta a duplicar
     * @returns {Object} Resultado da operação
     */
    duplicateProposal(proposalId) {
        try {
            const proposal = this.getProposalById(proposalId);
            if (!proposal) {
                return {
                    success: false,
                    message: 'Proposta não encontrada'
                };
            }

            // Criar cópia
            const duplicatedProposal = {
                ...proposal,
                id: null, // Novo ID será gerado
                proposalNumber: null, // Novo número será gerado
                proposalName: `${proposal.proposalName} (Cópia)`,
                status: 'draft',
                sentAt: null,
                approvedAt: null,
                createdAt: null,
                updatedAt: null
            };

            return this.saveProposal(duplicatedProposal);
        } catch (error) {
            console.error('Erro ao duplicar proposta:', error);
            return {
                success: false,
                message: 'Erro ao duplicar proposta',
                error: error.message
            };
        }
    }

    /**
     * Deleta proposta (soft delete - marca como inativo)
     * @param {string} proposalId - ID da proposta
     * @returns {Object} Resultado da operação
     */
    deleteProposal(proposalId) {
        try {
            console.log('🗑️ [deleteProposal] Excluindo proposta permanentemente:', proposalId);

            const proposals = this.getAllProposals();
            const proposalIndex = proposals.findIndex(p => p.id === proposalId);

            if (proposalIndex === -1) {
                console.error('🗑️ [deleteProposal] Proposta não encontrada:', proposalId);
                return {
                    success: false,
                    message: 'Proposta não encontrada'
                };
            }

            console.log('🗑️ [deleteProposal] Proposta encontrada no índice:', proposalIndex);
            console.log('🗑️ [deleteProposal] Total de propostas ANTES:', proposals.length);

            // Remover proposta permanentemente do array
            const filteredProposals = proposals.filter(p => p.id !== proposalId);

            console.log('🗑️ [deleteProposal] Total de propostas DEPOIS:', filteredProposals.length);

            // Salvar no localStorage
            localStorage.setItem(this.storageKey, JSON.stringify(filteredProposals));

            console.log('✅ [deleteProposal] Proposta excluída permanentemente');

            return {
                success: true,
                message: 'Proposta excluída com sucesso'
            };
        } catch (error) {
            console.error('❌ [deleteProposal] Erro ao deletar proposta:', error);
            return {
                success: false,
                message: 'Erro ao deletar proposta',
                error: error.message
            };
        }
    }

    /**
     * Deleta proposta permanentemente
     * @param {string} proposalId - ID da proposta
     * @returns {Object} Resultado da operação
     */
    deleteProposalPermanently(proposalId) {
        try {
            const proposals = this.getAllProposals();
            const filteredProposals = proposals.filter(p => p.id !== proposalId);

            localStorage.setItem(this.storageKey, JSON.stringify(filteredProposals));

            return {
                success: true,
                message: 'Proposta deletada permanentemente'
            };
        } catch (error) {
            console.error('Erro ao deletar proposta:', error);
            return {
                success: false,
                message: 'Erro ao deletar proposta',
                error: error.message
            };
        }
    }

    /**
     * Retorna estatísticas das propostas
     * @returns {Object} Estatísticas
     */
    getStatistics() {
        const proposals = this.getAllProposals();
        const activeProposals = proposals.filter(p => p.isActive);

        return {
            total: activeProposals.length,
            byStatus: this.groupByStatus(activeProposals),
            byType: this.groupByType(activeProposals),
            totalRevenue: this.calculateTotalRevenue(activeProposals),
            avgTicket: this.calculateAverageTicket(activeProposals),
            conversionRate: this.calculateConversionRate(activeProposals)
        };
    }

    /**
     * Agrupa propostas por status
     * @private
     */
    groupByStatus(proposals) {
        return proposals.reduce((acc, proposal) => {
            const status = proposal.status || 'draft';
            if (!acc[status]) {
                acc[status] = 0;
            }
            acc[status]++;
            return acc;
        }, {});
    }

    /**
     * Agrupa propostas por tipo
     * @private
     */
    groupByType(proposals) {
        return proposals.reduce((acc, proposal) => {
            const type = proposal.proposalType || 'standard';
            if (!acc[type]) {
                acc[type] = 0;
            }
            acc[type]++;
            return acc;
        }, {});
    }

    /**
     * Calcula receita total (propostas aprovadas)
     * @private
     */
    calculateTotalRevenue(proposals) {
        return proposals
            .filter(p => p.status === 'approved')
            .reduce((sum, p) => sum + (p.finalTotal || 0), 0);
    }

    /**
     * Calcula ticket médio
     * @private
     */
    calculateAverageTicket(proposals) {
        const approvedProposals = proposals.filter(p => p.status === 'approved');
        if (approvedProposals.length === 0) return 0;

        const totalRevenue = this.calculateTotalRevenue(proposals);
        return totalRevenue / approvedProposals.length;
    }

    /**
     * Calcula taxa de conversão
     * @private
     */
    calculateConversionRate(proposals) {
        const sentProposals = proposals.filter(p => p.status === 'sent' || p.status === 'approved');
        const approvedProposals = proposals.filter(p => p.status === 'approved');

        if (sentProposals.length === 0) return 0;

        return (approvedProposals.length / sentProposals.length) * 100;
    }

    /**
     * Exporta propostas para JSON
     * @returns {string} JSON string
     */
    exportToJSON() {
        const proposals = this.getAllProposals();
        return JSON.stringify(proposals, null, 2);
    }

    /**
     * Importa propostas de JSON
     * @param {string} jsonString - JSON string
     * @returns {Object} Resultado da operação
     */
    importFromJSON(jsonString) {
        try {
            const importedProposals = JSON.parse(jsonString);

            if (!Array.isArray(importedProposals)) {
                return {
                    success: false,
                    message: 'Formato inválido - esperado array de propostas'
                };
            }

            const proposals = this.getAllProposals();
            const now = new Date().toISOString();

            // Adicionar propostas importadas com novos IDs
            importedProposals.forEach(proposal => {
                proposals.push({
                    ...proposal,
                    id: this.generateId(),
                    proposalNumber: this.generateProposalNumber(),
                    createdAt: now,
                    updatedAt: now
                });
            });

            localStorage.setItem(this.storageKey, JSON.stringify(proposals));

            return {
                success: true,
                message: `${importedProposals.length} propostas importadas com sucesso`
            };
        } catch (error) {
            console.error('Erro ao importar propostas:', error);
            return {
                success: false,
                message: 'Erro ao importar propostas',
                error: error.message
            };
        }
    }
}

// Exportar instância singleton
export const proposalManager = new ProposalManager();

// Expor para window (browser global)
if (typeof window !== 'undefined') {
    window.ProposalManager = ProposalManager;
    window.proposalManager = proposalManager;
}
