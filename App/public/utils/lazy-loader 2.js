/**
 * LAZY LOADER - Carregamento sob demanda de bibliotecas pesadas
 *
 * Carrega jsPDF (~200KB) e XLSX (~600KB) apenas quando necessário
 * Economiza ~800KB + tempo de parse no carregamento inicial
 */

const LazyLoader = {
    // Cache de promises para evitar múltiplos carregamentos
    _loadingPromises: {},

    /**
     * Carrega jsPDF (para geração de PDF)
     */
    async loadJsPDF() {
        // Já carregado?
        if (window.jspdf?.jsPDF) {
            return window.jspdf.jsPDF;
        }

        // Já está carregando?
        if (this._loadingPromises.jspdf) {
            return this._loadingPromises.jspdf;
        }

        // Iniciar carregamento
        console.log('📦 [Lazy Loader] Carregando jsPDF...');

        this._loadingPromises.jspdf = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                console.log('✅ [Lazy Loader] jsPDF carregado');
                resolve(window.jspdf.jsPDF);
                delete this._loadingPromises.jspdf;
            };
            script.onerror = () => {
                console.error('❌ [Lazy Loader] Erro ao carregar jsPDF');
                reject(new Error('Falha ao carregar jsPDF'));
                delete this._loadingPromises.jspdf;
            };
            document.head.appendChild(script);
        });

        return this._loadingPromises.jspdf;
    },

    /**
     * Carrega XLSX (para exportação Excel)
     */
    async loadXLSX() {
        // Já carregado?
        if (window.XLSX) {
            return window.XLSX;
        }

        // Já está carregando?
        if (this._loadingPromises.xlsx) {
            return this._loadingPromises.xlsx;
        }

        // Iniciar carregamento
        console.log('📦 [Lazy Loader] Carregando XLSX...');

        this._loadingPromises.xlsx = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
            script.onload = () => {
                console.log('✅ [Lazy Loader] XLSX carregado');
                resolve(window.XLSX);
                delete this._loadingPromises.xlsx;
            };
            script.onerror = () => {
                console.error('❌ [Lazy Loader] Erro ao carregar XLSX');
                reject(new Error('Falha ao carregar XLSX'));
                delete this._loadingPromises.xlsx;
            };
            document.head.appendChild(script);
        });

        return this._loadingPromises.xlsx;
    },

    /**
     * Carrega ambos em paralelo (para quando precisar dos dois)
     */
    async loadAll() {
        console.log('📦 [Lazy Loader] Carregando jsPDF + XLSX em paralelo...');
        return Promise.all([
            this.loadJsPDF(),
            this.loadXLSX()
        ]);
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.LazyLoader = LazyLoader;
}

console.log('✅ [Lazy Loader] Disponível globalmente');
