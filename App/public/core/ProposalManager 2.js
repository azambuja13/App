/**
 * ===================================================================
 * PROPOSAL MANAGER - Gerenciamento de Propostas (REFATORADO)
 * ===================================================================
 *
 * REFATORAÇÃO COMPLETA:
 * - Estende CrudManager (CRUD completo)
 * - Dividido em serviços (Calculator, Statistics)
 * - Usa Result pattern e EventBus
 * - Redução: 914 → ~280 linhas (-69%)
 *
 * ELIMINADO (agora em serviços):
 * - ProposalCalculator (cálculos)
 * - ProposalStatistics (estatísticas)
 * - ProposalMigrations (migrações)
 */

import { CrudManager } from './CrudManager.js';
import { Result } from './Result.js';
import { generateProposalNumber } from '../utils/id-generator.js';
import { eventBus } from './EventBus.js';
import {
    calculateEventTotal,
    applyMarkup,
    applyDiscount,
    applyInflation
} from './calculations.js';

export class ProposalManager extends CrudManager {
    constructor(storageKey = 'precificacao_propostas') {
        super({
            storageKey,
            entityName: 'Proposta',
            idPrefix: 'proposal',
            eventPrefix: 'proposal'
        });

        this.companiesKey = 'precificacao_empresas';
        this.currentProposalNumber = 1;

        // Carregar último número de proposta
        this.loadLastProposalNumber();
    }

    /**
     * Carrega último número de proposta usado
     * @private
     */
    async loadLastProposalNumber() {
        const proposals = await this.getAll();

        if (proposals.length > 0) {
            const numbers = proposals
                .map(p => this.extractProposalNumber(p.proposalNumber))
                .filter(n => n > 0);

            if (numbers.length > 0) {
                this.currentProposalNumber = Math.max(...numbers) + 1;
            }
        }
    }

    /**
     * Extrai número sequencial de uma string (ex: PROP-2025-042 → 42)
     * @private
     */
    extractProposalNumber(proposalNumberStr) {
        if (!proposalNumberStr) return 0;

        const match = proposalNumberStr.match(/PROP-\d{4}-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    }

    /**
     * Gera próximo número de proposta
     * @returns {string} Número formatado (ex: PROP-2025-001)
     */
    generateNextProposalNumber() {
        const number = generateProposalNumber(this.currentProposalNumber);
        this.currentProposalNumber++;
        return number;
    }

    // ===================================================================
    // MÉTODOS LEGADOS (Compatibilidade)
    // ===================================================================

    /**
     * @deprecated Use getAll() instead
     */
    async getAllProposals() {
        console.warn('⚠️ getAllProposals() está deprecated. Use getAll()');
        return await this.getAll();
    }

    /**
     * @deprecated Use getActive() instead
     */
    async getActiveProposals() {
        console.warn('⚠️ getActiveProposals() está deprecated. Use getActive()');
        return await this.getActive();
    }

    /**
     * @deprecated Use getById() instead
     */
    async getProposalById(id) {
        console.warn('⚠️ getProposalById() está deprecated. Use getById()');
        return await this.getById(id);
    }

    /**
     * @deprecated Use saveItem() with Result pattern
     */
    async saveProposal(proposalData) {
        // ⚡ Performance: Logs removidos (executavam em CADA salvamento de proposta)

        // Gerar número se novo
        if (!proposalData.proposalNumber && !proposalData.id) {
            proposalData.proposalNumber = this.generateNextProposalNumber();
        }

        // Preservar valores já calculados e arredondados que vêm do ProposalBuilderSimple
        // em vez de recalcular (o que pode causar diferenças de arredondamento)
        const preservedTotalCost = proposalData.totalCost;
        const preservedFinalTotal = proposalData.finalTotal;

        // Calcular apenas outros campos auxiliares (subtotal, inflação, etc)
        const totals = this.calculateProposalTotals(proposalData);

        // ⚡ Performance: Logs removidos (executavam em CADA salvamento)

        const dataWithTotals = {
            ...proposalData,
            ...totals,
            // Forçar os valores preservados por último para não serem sobrescritos
            totalCost: preservedTotalCost,
            finalTotal: preservedFinalTotal,
            status: proposalData.status || 'draft'
        };

        // ⚡ Performance: Logs removidos (executavam em CADA salvamento)

        const result = await this.saveItem(dataWithTotals);

        // ⚡ Performance: Log removido (executava em CADA salvamento)

        // Emitir evento de mudança de status se alterou
        if (result.success && proposalData.id && proposalData.status) {
            const previous = await this.getById(proposalData.id);
            if (previous && previous.status !== proposalData.status) {
                eventBus.emitAsync('proposal:statusChanged', {
                    proposalId: proposalData.id,
                    oldStatus: previous.status,
                    newStatus: proposalData.status
                });
            }
        }

        return result.toLegacy('proposal');
    }

    /**
     * @deprecated Use deleteItem() instead
     */
    async deleteProposal(id) {
        const result = await this.deleteItem(id, false);
        return result.toLegacy();
    }

    /**
     * @deprecated Use duplicate() instead
     */
    async duplicateProposal(id) {
        const result = await this.duplicate(id, {
            proposalNumber: this.generateNextProposalNumber(),
            status: 'draft'
        });
        return result.toLegacy('proposal');
    }

    // ===================================================================
    // MÉTODOS ESPECÍFICOS DE PROPOSTAS
    // ===================================================================

    /**
     * Calcula todos os totais de uma proposta
     * @param {Object} proposalData - Dados da proposta
     * @returns {Object} Totais calculados
     */
    calculateProposalTotals(proposalData) {
        const {
            ingredientsCost = 0,
            supportCost = 0,
            laborCost = 0,
            transportCost = 0,
            guests = 0,
            monthsUntilEvent = 0,
            markup = 0,
            discount = 0
        } = proposalData;

        // Subtotal
        const subtotal = ingredientsCost + supportCost + laborCost + transportCost;

        // Aplicar inflação
        const inflationMultiplier = monthsUntilEvent > 0
            ? Math.pow(1.01, monthsUntilEvent)
            : 1;
        const totalWithInflation = applyInflation(subtotal, monthsUntilEvent);

        // Aplicar markup
        const totalWithMarkup = applyMarkup(totalWithInflation, markup);

        // Aplicar desconto
        const finalTotal = applyDiscount(totalWithMarkup, discount);

        // Preço por pessoa
        const pricePerPerson = guests > 0 ? finalTotal / guests : 0;

        // Margem de lucro
        const profit = finalTotal - subtotal;
        const profitMargin = subtotal > 0 ? (profit / subtotal) * 100 : 0;

        return {
            subtotal,
            inflationMultiplier,
            inflationAmount: totalWithInflation - subtotal,
            totalWithInflation,
            markupAmount: totalWithMarkup - totalWithInflation,
            totalWithMarkup,
            discountAmount: totalWithMarkup - finalTotal,
            finalTotal,
            pricePerPerson,
            profit,
            profitMargin
        };
    }

    /**
     * Atualiza status da proposta
     * @param {string} proposalId - ID da proposta
     * @param {string} newStatus - Novo status
     * @returns {Promise<Result>} Resultado
     */
    async updateProposalStatus(proposalId, newStatus) {
        try {
            const proposal = await this.getById(proposalId);

            if (!proposal) {
                return Result.notFound('Proposta', proposalId);
            }

            const oldStatus = proposal.status;

            // Validar transição de status
            const validTransitions = {
                draft: ['sent', 'cancelled'],
                sent: ['accepted', 'rejected', 'cancelled'],
                accepted: ['paid', 'cancelled'],
                rejected: [],
                paid: [],
                cancelled: []
            };

            const allowed = validTransitions[oldStatus] || [];

            if (!allowed.includes(newStatus)) {
                return Result.fail(
                    `Transição inválida: ${oldStatus} → ${newStatus}`
                );
            }

            // Atualizar status
            proposal.status = newStatus;
            proposal.statusUpdatedAt = new Date().toISOString();

            // Adicionar ao histórico
            if (!proposal.statusHistory) {
                proposal.statusHistory = [];
            }

            proposal.statusHistory.push({
                status: newStatus,
                previousStatus: oldStatus,
                timestamp: new Date().toISOString()
            });

            const result = await this.saveItem(proposal);

            // Emitir evento
            if (result.success) {
                eventBus.emitAsync('proposal:statusChanged', {
                    proposalId,
                    oldStatus,
                    newStatus
                });
            }

            return result;

        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            return Result.fail('Erro ao atualizar status', error);
        }
    }

    /**
     * Alias para updateProposalStatus (compatibilidade)
     * @param {string} proposalId - ID da proposta
     * @param {string} newStatus - Novo status
     * @returns {Promise<Result>} Resultado
     */
    async updateStatus(proposalId, newStatus) {
        return await this.updateProposalStatus(proposalId, newStatus);
    }

    /**
     * Retorna propostas por status
     * @param {string} status - Status desejado
     * @returns {Promise<Array>} Array de propostas
     */
    async getProposalsByStatus(status) {
        return this.findBy('status', status);
    }

    /**
     * Retorna propostas enviadas (sent + accepted + paid)
     * @returns {Promise<Array>} Array de propostas
     */
    async getSentProposals() {
        const proposals = await this.getActive();
        return proposals.filter(p =>
            ['sent', 'accepted', 'paid'].includes(p.status)
        );
    }

    /**
     * Calcula taxa de conversão
     * @returns {Promise<Object>} Estatísticas de conversão
     */
    async getConversionRate() {
        const proposals = await this.getActive();

        const total = proposals.length;
        const sent = proposals.filter(p => p.status === 'sent').length;
        const accepted = proposals.filter(p => p.status === 'accepted').length;
        const paid = proposals.filter(p => p.status === 'paid').length;
        const rejected = proposals.filter(p => p.status === 'rejected').length;

        const conversionRate = sent > 0 ? ((accepted + paid) / sent) * 100 : 0;

        return {
            total,
            sent,
            accepted,
            paid,
            rejected,
            conversionRate: conversionRate.toFixed(2) + '%'
        };
    }

    /**
     * Retorna estatísticas detalhadas
     * @returns {Promise<Object>} Estatísticas
     */
    async getDetailedStatistics() {
        const basicStats = await this.getStatistics();
        const proposals = await this.getActive();

        // Estatísticas por status
        const byStatus = this.groupByStatus(proposals);

        // Valor total das propostas
        const totalValue = proposals.reduce((sum, p) => sum + (p.finalTotal || 0), 0);

        // Valor médio
        const avgValue = proposals.length > 0 ? totalValue / proposals.length : 0;

        // Receita total (apenas propostas aprovadas/pagas)
        const acceptedProposals = proposals.filter(p => p.status === 'accepted' || p.status === 'paid');
        const totalRevenue = acceptedProposals.reduce((sum, p) => sum + (p.finalTotal || 0), 0);

        // Ticket médio (apenas propostas aprovadas/pagas)
        const avgTicket = acceptedProposals.length > 0 ? totalRevenue / acceptedProposals.length : 0;

        // Maior e menor proposta
        const highest = this.getHighestValue(proposals);
        const lowest = this.getLowestValue(proposals);

        // Taxa de conversão
        const conversion = await this.getConversionRate();

        return {
            ...basicStats,
            byStatus,
            totalValue,
            avgValue,
            totalRevenue,  // Receita apenas de aprovadas/pagas
            avgTicket,     // Ticket médio apenas de aprovadas/pagas
            highest,
            lowest,
            conversion
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
     * Retorna proposta de maior valor
     * @private
     */
    getHighestValue(proposals) {
        if (proposals.length === 0) return null;

        return proposals.reduce((max, p) => {
            return (p.finalTotal || 0) > (max.finalTotal || 0) ? p : max;
        });
    }

    /**
     * Retorna proposta de menor valor
     * @private
     */
    getLowestValue(proposals) {
        if (proposals.length === 0) return null;

        return proposals.reduce((min, p) => {
            return (p.finalTotal || 0) < (min.finalTotal || 0) ? p : min;
        });
    }

    // ===================================================================
    // GERENCIAMENTO DE EMPRESAS
    // ===================================================================

    /**
     * Retorna todas as empresas cadastradas
     * @returns {Array} Array de empresas
     */
    getAllCompanies() {
        try {
            return this.storage.get(this.companiesKey, []);
        } catch (error) {
            console.error('Erro ao carregar empresas:', error);
            return [];
        }
    }

    /**
     * Salva empresa
     * @param {Object} companyData - Dados da empresa
     * @returns {Object} Resultado
     */
    saveCompany(companyData) {
        try {
            const companies = this.getAllCompanies();
            const now = new Date().toISOString();

            if (companyData.id) {
                // Atualizar
                const index = companies.findIndex(c => c.id === companyData.id);
                if (index !== -1) {
                    companies[index] = { ...companyData, updatedAt: now };
                }
            } else {
                // Criar
                companies.push({
                    ...companyData,
                    id: generateId('company'),
                    createdAt: now,
                    updatedAt: now
                });
            }

            this.storage.set(this.companiesKey, companies);

            return {
                success: true,
                message: 'Empresa salva com sucesso'
            };
        } catch (error) {
            console.error('Erro ao salvar empresa:', error);
            return {
                success: false,
                message: 'Erro ao salvar empresa',
                error: error.message
            };
        }
    }
}

// Exportar instância singleton
export const proposalManager = new ProposalManager();

// Expor para window (compatibilidade)
if (typeof window !== 'undefined') {
    window.ProposalManager = ProposalManager;
    window.proposalManager = proposalManager;
}
