/**
 * ===================================================================
 * CUSTOM TEMPLATE MANAGER - Gerenciador de Templates Personalizados (MIGRADO)
 * ===================================================================
 * Gerencia templates customizados salvos que podem ser reutilizados
 *
 * MIGRADO PARA INDEXEDDB:
 * - Usa IndexedDBStorageService com fallback para localStorage
 * - Todos os métodos agora são async
 */

class CustomTemplateManager {
    constructor() {
        this.storageKey = 'custom_templates';
        this.storage = null;
        this.defaultTemplate = {
            headerBgColor: '#ff6b35',
            headerTextColor: '#ffffff',
            accentColor: '#ff6b35',
            fontFamily: 'Arial, sans-serif',
            customPhotos: [],
            customTexts: [],
            showPhotos: true,
            showCustomTexts: true,
            logoSize: 'medium',
            headerStyle: 'gradient',
            sectionSpacing: 'normal'
        };
        this.init();
    }

    /**
     * Inicializa o storage (IndexedDB ou localStorage)
     */
    async init() {
        if (window.indexedDBStorage) {
            this.storage = window.indexedDBStorage;
            console.log('✅ [CustomTemplateManager] Usando IndexedDB');
        } else {
            // Fallback: criar wrapper para localStorage
            this.storage = {
                get: (key, defaultValue) => {
                    try {
                        const data = localStorage.getItem(key);
                        return Promise.resolve(data ? JSON.parse(data) : defaultValue);
                    } catch (error) {
                        console.error('Erro ao ler localStorage:', error);
                        return Promise.resolve(defaultValue);
                    }
                },
                set: (key, value) => {
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                        return Promise.resolve();
                    } catch (error) {
                        console.error('Erro ao salvar localStorage:', error);
                        return Promise.reject(error);
                    }
                }
            };
            console.warn('⚠️ [CustomTemplateManager] IndexedDB não disponível, usando localStorage');
        }
    }

    /**
     * Salvar novo template customizado
     */
    async saveTemplate(name, customization) {
        try {
            const templates = await this.getAllTemplates();
            const newTemplate = {
                id: Date.now().toString(),
                name: name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                customization: customization
            };

            templates.push(newTemplate);
            await this.storage.set(this.storageKey, templates);

            console.log('✅ Template salvo:', name);
            return newTemplate;
        } catch (error) {
            console.error('❌ Erro ao salvar template:', error);
            throw error;
        }
    }

    /**
     * Atualizar template existente
     */
    async updateTemplate(id, name, customization) {
        try {
            const templates = await this.getAllTemplates();
            const index = templates.findIndex(t => t.id === id);

            if (index === -1) {
                throw new Error('Template não encontrado');
            }

            templates[index] = {
                ...templates[index],
                name: name,
                updatedAt: new Date().toISOString(),
                customization: customization
            };

            await this.storage.set(this.storageKey, templates);
            console.log('✅ Template atualizado:', name);
            return templates[index];
        } catch (error) {
            console.error('❌ Erro ao atualizar template:', error);
            throw error;
        }
    }

    /**
     * Obter todos os templates salvos
     */
    async getAllTemplates() {
        try {
            const data = await this.storage.get(this.storageKey, []);
            return data;
        } catch (error) {
            console.error('❌ Erro ao carregar templates:', error);
            return [];
        }
    }

    /**
     * Obter template por ID
     */
    async getTemplateById(id) {
        const templates = await this.getAllTemplates();
        return templates.find(t => t.id === id);
    }

    /**
     * Excluir template
     */
    async deleteTemplate(id) {
        try {
            const templates = await this.getAllTemplates();
            const filtered = templates.filter(t => t.id !== id);
            await this.storage.set(this.storageKey, filtered);
            console.log('✅ Template excluído');
            return true;
        } catch (error) {
            console.error('❌ Erro ao excluir template:', error);
            return false;
        }
    }

    /**
     * Duplicar template
     */
    async duplicateTemplate(id) {
        try {
            const template = await this.getTemplateById(id);
            if (!template) {
                throw new Error('Template não encontrado');
            }

            const newName = `${template.name} (cópia)`;
            return await this.saveTemplate(newName, template.customization);
        } catch (error) {
            console.error('❌ Erro ao duplicar template:', error);
            throw error;
        }
    }

    /**
     * Obter template padrão
     */
    getDefaultTemplate() {
        return { ...this.defaultTemplate };
    }

    /**
     * Exportar template como JSON
     */
    async exportTemplate(id) {
        const template = await this.getTemplateById(id);
        if (!template) {
            throw new Error('Template não encontrado');
        }

        const dataStr = JSON.stringify(template, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `template_${template.name}_${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Importar template de JSON
     */
    async importTemplate(jsonData) {
        try {
            const template = JSON.parse(jsonData);

            // Validar estrutura básica
            if (!template.customization) {
                throw new Error('Formato de template inválido');
            }

            // Salvar com novo ID e timestamp
            return await this.saveTemplate(
                template.name || 'Template Importado',
                template.customization
            );
        } catch (error) {
            console.error('❌ Erro ao importar template:', error);
            throw error;
        }
    }

    /**
     * Obter estatísticas de uso do storage
     */
    async getStorageStats() {
        try {
            const templates = await this.getAllTemplates();
            const jsonString = JSON.stringify(templates);
            const bytes = new Blob([jsonString]).size;
            const kb = (bytes / 1024).toFixed(2);
            const mb = (bytes / (1024 * 1024)).toFixed(2);

            // IndexedDB tem muito mais espaço (GB), então percentUsed é menos relevante
            const estimatedTotal = 1024 * 1024; // 1GB em KB para IndexedDB
            const percentUsed = ((bytes / 1024) / estimatedTotal * 100).toFixed(4);

            return {
                totalTemplates: templates.length,
                sizeBytes: bytes,
                sizeKB: kb,
                sizeMB: mb,
                percentUsed: percentUsed,
                storageType: this.storage === window.indexedDBStorage ? 'IndexedDB' : 'localStorage'
            };
        } catch (error) {
            console.error('❌ Erro ao calcular estatísticas:', error);
            return null;
        }
    }
}

// Expor globalmente
window.CustomTemplateManager = CustomTemplateManager;
window.customTemplateManager = new CustomTemplateManager();

console.log('✅ CustomTemplateManager carregado');
