/**
 * CONFIGURAÇÃO PARA BUILD OFFLINE
 *
 * Esta configuração será usada pelo script de build para gerar
 * a versão offline standalone (localStorage apenas).
 */

module.exports = {
    BUILD_MODE: 'OFFLINE',
    FEATURE_BACKEND: false,
    FEATURE_LICENSE: false,
    FEATURE_AUTO_REFRESH: false,
    FEATURE_MULTI_DEVICE: false,
    FEATURE_OFFLINE_FALLBACK: false,

    // Arquivos a excluir no build offline
    excludeFiles: [
        'api-client.js'
    ],

    // Remover código relacionado a backend
    removeComments: true,

    // Output
    outputDir: 'builds/offline',
    outputFile: 'index.html'
};
