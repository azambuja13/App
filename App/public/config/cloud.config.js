/**
 * CONFIGURAÇÃO PARA BUILD CLOUD
 *
 * Esta configuração será usada pelo script de build para gerar
 * a versão cloud com backend PostgreSQL e sistema de licenças.
 */

module.exports = {
    BUILD_MODE: 'CLOUD',
    FEATURE_BACKEND: true,
    FEATURE_LICENSE: true,
    FEATURE_AUTO_REFRESH: true,
    FEATURE_MULTI_DEVICE: true,
    FEATURE_OFFLINE_FALLBACK: true,

    // Arquivos adicionais necessários apenas para cloud
    additionalFiles: [
        'api-client.js'
    ],

    // Comentários a remover no build offline
    removeComments: false,

    // Output
    outputDir: 'builds/cloud',
    outputFile: 'index.html'
};
