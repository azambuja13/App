/**
 * LAZY LOADER - Carregamento sob demanda de bibliotecas pesadas
 *
 * jsPDF, html2canvas e XLSX ficam fora da abertura do app:
 * - XLSX só carrega quando alguém importa/exporta planilha
 * - jsPDF e html2canvas carregam sozinhas logo depois que a tela aparece (ver o fim do arquivo)
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
            script.src = 'vendor/jspdf.umd.min.js?v=2.5.1b';
            script.onload = () => {
                console.log('✅ [Lazy Loader] jsPDF carregado');
                resolve(window.jspdf.jsPDF);
                delete this._loadingPromises.jspdf;
            };
            script.onerror = () => {
                console.error('❌ [Lazy Loader] Erro ao carregar jsPDF');
                reject(new Error('Não foi possível carregar o gerador de PDF. Confira a internet e tente de novo.'));
                delete this._loadingPromises.jspdf;
            };
            document.head.appendChild(script);
        });

        return this._loadingPromises.jspdf;
    },

    /**
     * Carrega html2canvas (transforma a tela em imagem, para o PDF no app do iPhone)
     */
    async loadHtml2canvas() {
        if (typeof window.html2canvas === 'function') {
            return window.html2canvas;
        }
        if (this._loadingPromises.html2canvas) {
            return this._loadingPromises.html2canvas;
        }
        this._loadingPromises.html2canvas = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'vendor/html2canvas.min.js?v=1.4.1';
            script.onload = () => {
                resolve(window.html2canvas);
                delete this._loadingPromises.html2canvas;
            };
            script.onerror = () => {
                console.error('❌ [Lazy Loader] Erro ao carregar html2canvas');
                reject(new Error('Não foi possível carregar o gerador de PDF. Confira a internet e tente de novo.'));
                delete this._loadingPromises.html2canvas;
            };
            document.head.appendChild(script);
        });
        return this._loadingPromises.html2canvas;
    },

    /**
     * jsPDF + html2canvas (nov/2026: saíram da abertura do app). Quem gera PDF espera por aqui;
     * se já estiverem carregadas, resolve na hora.
     */
    loadPdfLibs() {
        return Promise.all([this.loadJsPDF(), this.loadHtml2canvas()]);
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
            // Arquivo local (o CDN não carregava e no app do iPhone só funcionam arquivos do pacote)
            script.src = 'vendor/xlsx.full.min.js?v=0.18.5';
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

// ⚡ nov/2026: jsPDF e html2canvas (549 KB) não seguram mais a abertura. Carregam sozinhas logo
// depois que a tela aparece (ou no primeiro toque), para o botão de PDF/WhatsApp achar tudo pronto
// e o compartilhamento do iPhone continuar dentro do toque. Quem chegar antes espera loadPdfLibs().
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    let aquecido = false;
    const aquecer = () => {
        if (aquecido) return;
        aquecido = true;
        LazyLoader.loadPdfLibs().catch(() => { aquecido = false; }); // sem internet agora: tenta de novo no uso
    };
    const nativo = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    const agendar = () => {
        // no app os arquivos estão no aparelho (rápido); no navegador espera a tela ficar parada
        if (nativo || typeof window.requestIdleCallback !== 'function') setTimeout(aquecer, nativo ? 600 : 2500);
        else setTimeout(() => window.requestIdleCallback(aquecer, { timeout: 3000 }), 1200);
    };
    if (document.readyState === 'complete') agendar();
    else window.addEventListener('load', agendar, { once: true });
    ['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, aquecer, { once: true, capture: true, passive: true }));
}

console.log('✅ [Lazy Loader] Disponível globalmente');
