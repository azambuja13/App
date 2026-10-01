/**
 * CompanyManager - Gerencia dados da empresa
 * Persiste informações da empresa no IndexedDB (keyValueStore)
 */

import { smartSave } from '../utils/smart-storage.js';

const COMPANY_STORAGE_KEY = 'precificacao_company_data';

export class CompanyManager {
    constructor() {
        this.companyData = null;
        this.isInitialized = false;
        this.isLoading = false; // Flag para evitar carregamentos simultâneos
    }

    /**
     * Inicializa o manager (carrega dados do IndexedDB)
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('ℹ️ [CompanyManager] Já inicializado, pulando...');
            return;
        }

        if (this.isLoading) {
            console.warn('⚠️ [CompanyManager] Já está carregando, aguardando...');
            // Aguardar até que o carregamento termine
            while (this.isLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.isLoading = true;

        try {
            console.log('🏢 [CompanyManager] Inicializando...');
            const data = await this.loadCompanyData();
            this.companyData = data;
            this.isInitialized = true;
            console.log('✅ [CompanyManager] Inicializado com sucesso');
        } catch (error) {
            console.error('❌ [CompanyManager] Erro ao inicializar:', error);
            // Usar dados padrão em caso de erro
            this.companyData = this.getDefaultData();
            this.isInitialized = true;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Retorna dados padrão
     * @private
     * @returns {Object} Dados padrão
     */
    getDefaultData() {
        return {
            companyName: '',
            companyPhone: '',
            companyEmail: '',
            companyAddress: '',
            companyHistory: '',
            companyMission: '',
            companyVision: '',
            companyValues: '',
            companyMotivation: '',
            companyPhoto1: null,
            companyPhoto2: null,
            companyPhoto3: null
        };
    }

    /**
     * Carrega dados da empresa do IndexedDB
     * @returns {Promise<Object>} Dados da empresa
     */
    async loadCompanyData() {
        try {
            console.log('📂 [CompanyManager] Carregando dados do IndexedDB...');

            // Tentar carregar do IndexedDB primeiro
            if (window.indexedDB) {
                const db = await new Promise((resolve, reject) => {
                    const req = indexedDB.open('precificacao_db', 3);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });

                const tx = db.transaction(['keyValueStore'], 'readonly');
                const data = await new Promise((resolve, reject) => {
                    const req = tx.objectStore('keyValueStore').get(COMPANY_STORAGE_KEY);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });

                db.close();

                if (data && data.value) {
                    console.log('✅ [CompanyManager] Dados carregados do IndexedDB:', data.value);
                    return data.value;
                }
            }

            // Fallback: tentar localStorage (SEM migração automática para evitar loop)
            console.log('ℹ️ [CompanyManager] Tentando localStorage como fallback...');
            const localData = localStorage.getItem(COMPANY_STORAGE_KEY);
            if (localData) {
                const parsedData = JSON.parse(localData);
                console.log('✅ [CompanyManager] Dados carregados do localStorage:', parsedData);

                // NÃO migrar automaticamente - isso causava loop infinito
                // Usuário deve salvar manualmente para migrar para IndexedDB

                return parsedData;
            }

            console.log('ℹ️ [CompanyManager] Nenhum dado encontrado, usando padrão');
            return this.getDefaultData();
        } catch (error) {
            console.error('❌ [CompanyManager] Erro ao carregar dados:', error);
            return this.getDefaultData();
        }
    }

    /**
     * Salva dados da empresa no IndexedDB
     * @param {Object} data - Dados da empresa
     * @returns {Promise<boolean>} Sucesso
     */
    async saveCompanyData(data) {
        try {
            // Garantir que está inicializado
            if (!this.isInitialized) {
                await this.initialize();
            }

            const dataToSave = {
                ...this.companyData,
                ...data,
                updatedAt: new Date().toISOString()
            };

            console.log('💾 [CompanyManager] Salvando dados no IndexedDB...');

            // Salvar no IndexedDB
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open('precificacao_db', 3);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            const tx = db.transaction(['keyValueStore'], 'readwrite');
            await new Promise((resolve, reject) => {
                const req = tx.objectStore('keyValueStore').put({
                    key: COMPANY_STORAGE_KEY,
                    value: dataToSave
                });
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });

            db.close();

            // Salvar via smartStorage (roteará para PostgreSQL ou IndexedDB baseado no plano)
            await smartSave(COMPANY_STORAGE_KEY, dataToSave);

            this.companyData = dataToSave;

            console.log('✅ [CompanyManager] Dados salvos com sucesso no IndexedDB e via smartStorage');
            return true;
        } catch (error) {
            console.error('❌ [CompanyManager] Erro ao salvar dados:', error);
            return false;
        }
    }

    /**
     * Obtém dados da empresa
     * @returns {Object} Dados da empresa
     */
    getCompanyData() {
        // Se não foi inicializado, retornar dados padrão
        if (!this.isInitialized || !this.companyData) {
            console.warn('⚠️ [CompanyManager] Não inicializado, retornando dados padrão');
            return this.getDefaultData();
        }
        return { ...this.companyData };
    }

    /**
     * Obtém dados da empresa (async para garantir inicialização)
     * @returns {Promise<Object>} Dados da empresa
     */
    async getCompanyDataAsync() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        return this.getCompanyData();
    }

    /**
     * Atualiza um campo específico
     * @param {string} field - Nome do campo
     * @param {any} value - Valor
     * @returns {Promise<boolean>} Sucesso
     */
    async updateField(field, value) {
        return await this.saveCompanyData({ [field]: value });
    }

    /**
     * Limpa dados da empresa do IndexedDB e localStorage
     * @returns {Promise<boolean>} Sucesso
     */
    async clearCompanyData() {
        try {
            console.log('🗑️ [CompanyManager] Limpando dados...');

            // Limpar do IndexedDB
            const db = await new Promise((resolve, reject) => {
                const req = indexedDB.open('precificacao_db', 3);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            const tx = db.transaction(['keyValueStore'], 'readwrite');
            await new Promise((resolve, reject) => {
                const req = tx.objectStore('keyValueStore').delete(COMPANY_STORAGE_KEY);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });

            db.close();

            // Limpar do localStorage também
            localStorage.removeItem(COMPANY_STORAGE_KEY);

            this.companyData = this.getDefaultData();

            console.log('✅ [CompanyManager] Dados limpos do IndexedDB e localStorage');
            return true;
        } catch (error) {
            console.error('❌ [CompanyManager] Erro ao limpar dados:', error);
            return false;
        }
    }
}

// Criar instância global e inicializar
export const companyManager = new CompanyManager();

// Inicializar automaticamente quando o módulo for carregado
(async () => {
    try {
        await companyManager.initialize();
    } catch (error) {
        console.error('❌ Erro ao inicializar CompanyManager:', error);
    }
})();

// Expor no window para uso nos componentes
if (typeof window !== 'undefined') {
    window.CompanyManager = CompanyManager;
    window.companyManager = companyManager;
}
