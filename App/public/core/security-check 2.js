/**
 * VERIFICAÇÃO DE SEGURANÇA
 *
 * Sistema que verifica se o código da aplicação está protegido/criptografado.
 * Detecta se o HTML foi ofuscado com Base64 ou outras técnicas de proteção.
 */

class SecurityCheck {
    constructor() {
        this.isProtected = false;
        this.protectionLevel = 'none';
        this.checks = {
            base64Encoding: false,
            codeObfuscation: false,
            integrityCheck: false,
            antiDebug: false,
            antiCopy: false
        };
    }

    /**
     * Executa todas as verificações de segurança
     */
    async runSecurityChecks() {
        console.log('🔒 Iniciando verificações de segurança...');

        // 1. Verificar se código está em Base64
        this.checkBase64Protection();

        // 2. Verificar ofuscação de código
        this.checkCodeObfuscation();

        // 3. Verificar proteções anti-debug
        this.checkAntiDebug();

        // 4. Verificar proteções anti-copy
        this.checkAntiCopy();

        // 5. Calcular nível de proteção
        this.calculateProtectionLevel();

        // 6. Log resultado
        this.logSecurityStatus();

        return {
            isProtected: this.isProtected,
            level: this.protectionLevel,
            checks: this.checks
        };
    }

    /**
     * Verifica se o código HTML está codificado em Base64
     */
    checkBase64Protection() {
        try {
            // Pegar conteúdo do HTML
            const htmlContent = document.documentElement.outerHTML;

            // Verificar se tem indicadores de Base64
            const hasBase64Markers =
                htmlContent.includes('atob(') ||
                htmlContent.includes('btoa(') ||
                htmlContent.includes('base64') ||
                htmlContent.includes('decode');

            // Verificar se o código fonte tem caracteres típicos de Base64
            const base64Pattern = /[A-Za-z0-9+/]{50,}={0,2}/g;
            const base64Matches = htmlContent.match(base64Pattern);
            const hasBase64Content = base64Matches && base64Matches.length > 5;

            this.checks.base64Encoding = hasBase64Markers || hasBase64Content;

            if (this.checks.base64Encoding) {
                console.log('✅ Proteção Base64 detectada');
            } else {
                console.warn('⚠️ Código não está protegido com Base64');
            }
        } catch (error) {
            console.error('Erro ao verificar Base64:', error);
            this.checks.base64Encoding = false;
        }
    }

    /**
     * Verifica ofuscação de código JavaScript
     */
    checkCodeObfuscation() {
        try {
            const scripts = document.getElementsByTagName('script');
            let obfuscatedCount = 0;

            for (let script of scripts) {
                const content = script.textContent;

                // Indicadores de código ofuscado:
                // - Variáveis com nomes curtos/estranhos
                // - Código muito compactado
                // - Uso de eval, Function constructor
                const hasObfuscationMarkers =
                    content.includes('eval(') ||
                    content.includes('Function(') ||
                    /var [a-z]{1,2}=[a-z]{1,2}\([a-z]{1,2}\)/g.test(content) ||
                    content.split('\n').length < 10 && content.length > 1000;

                if (hasObfuscationMarkers) {
                    obfuscatedCount++;
                }
            }

            this.checks.codeObfuscation = obfuscatedCount > 0;

            if (this.checks.codeObfuscation) {
                console.log(`✅ Ofuscação de código detectada (${obfuscatedCount} scripts)`);
            } else {
                console.warn('⚠️ Código JavaScript não está ofuscado');
            }
        } catch (error) {
            console.error('Erro ao verificar ofuscação:', error);
            this.checks.codeObfuscation = false;
        }
    }

    /**
     * Verifica proteções anti-debug
     */
    checkAntiDebug() {
        try {
            // Verificar se DevTools está aberto
            let devtoolsOpen = false;
            const threshold = 160;

            // Técnica 1: Diferença de tamanho
            if (window.outerWidth - window.innerWidth > threshold ||
                window.outerHeight - window.innerHeight > threshold) {
                devtoolsOpen = true;
            }

            // Verificar se há listeners de debug
            const hasDebugProtection =
                typeof window.addEventListener === 'function' &&
                document.addEventListener.toString().includes('[native code]');

            this.checks.antiDebug = hasDebugProtection;

            if (this.checks.antiDebug) {
                console.log('✅ Proteção anti-debug ativa');
            } else {
                console.warn('⚠️ Sem proteção anti-debug');
            }
        } catch (error) {
            console.error('Erro ao verificar anti-debug:', error);
            this.checks.antiDebug = false;
        }
    }

    /**
     * Verifica proteções anti-copy
     */
    checkAntiCopy() {
        try {
            // Verificar se tem proteção contra seleção de texto
            const bodyStyle = window.getComputedStyle(document.body);
            const hasSelectNone = bodyStyle.userSelect === 'none' ||
                                  bodyStyle.webkitUserSelect === 'none';

            // Verificar listeners de copy/paste
            const hasCopyProtection = document.oncopy !== null ||
                                     document.oncontextmenu !== null;

            this.checks.antiCopy = hasSelectNone || hasCopyProtection;

            if (this.checks.antiCopy) {
                console.log('✅ Proteção anti-cópia ativa');
            } else {
                console.warn('⚠️ Sem proteção anti-cópia');
            }
        } catch (error) {
            console.error('Erro ao verificar anti-copy:', error);
            this.checks.antiCopy = false;
        }
    }

    /**
     * Calcula o nível de proteção baseado nas verificações
     */
    calculateProtectionLevel() {
        const checksArray = Object.values(this.checks);
        const passedChecks = checksArray.filter(check => check === true).length;
        const totalChecks = checksArray.length;
        const percentage = (passedChecks / totalChecks) * 100;

        if (percentage >= 75) {
            this.protectionLevel = 'high';
            this.isProtected = true;
        } else if (percentage >= 50) {
            this.protectionLevel = 'medium';
            this.isProtected = true;
        } else if (percentage >= 25) {
            this.protectionLevel = 'low';
            this.isProtected = false;
        } else {
            this.protectionLevel = 'none';
            this.isProtected = false;
        }
    }

    /**
     * Log do status de segurança
     */
    logSecurityStatus() {
        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔒 RELATÓRIO DE SEGURANÇA');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Status: ${this.isProtected ? '✅ PROTEGIDO' : '⚠️ NÃO PROTEGIDO'}`);
        console.log(`Nível: ${this.protectionLevel.toUpperCase()}`);
        console.log('');
        console.log('Verificações:');
        console.log(`  Base64 Encoding:    ${this.checks.base64Encoding ? '✅' : '❌'}`);
        console.log(`  Code Obfuscation:   ${this.checks.codeObfuscation ? '✅' : '❌'}`);
        console.log(`  Anti-Debug:         ${this.checks.antiDebug ? '✅' : '❌'}`);
        console.log(`  Anti-Copy:          ${this.checks.antiCopy ? '✅' : '❌'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('');

        if (!this.isProtected) {
            console.warn('⚠️ ALERTA DE SEGURANÇA: Este código não está protegido adequadamente!');
            console.warn('⚠️ Recomendação: Execute o script APLICAR_PROTECAO.sh para proteger o código.');
        }
    }

    /**
     * Retorna badge HTML baseado no nível de proteção
     */
    getSecurityBadge() {
        const badges = {
            high: {
                icon: '🔒',
                text: 'SEGURO',
                bgColor: '#10b981',
                color: 'white',
                description: 'Código protegido com criptografia'
            },
            medium: {
                icon: '🔐',
                text: 'PROTEGIDO',
                bgColor: '#3b82f6',
                color: 'white',
                description: 'Código com proteção média'
            },
            low: {
                icon: '⚠️',
                text: 'BAIXA PROTEÇÃO',
                bgColor: '#f59e0b',
                color: 'white',
                description: 'Código com proteção insuficiente'
            },
            none: {
                icon: '🔓',
                text: 'NÃO PROTEGIDO',
                bgColor: '#ef4444',
                color: 'white',
                description: 'Código sem proteção - VULNERÁVEL'
            }
        };

        return badges[this.protectionLevel];
    }

    /**
     * Mostra alerta se não estiver protegido
     */
    showSecurityAlert() {
        if (!this.isProtected) {
            const message = `
⚠️ ALERTA DE SEGURANÇA ⚠️

Este código não está adequadamente protegido!

Proteções faltando:
${!this.checks.base64Encoding ? '❌ Base64 Encoding\n' : ''}${!this.checks.codeObfuscation ? '❌ Code Obfuscation\n' : ''}${!this.checks.antiDebug ? '❌ Anti-Debug\n' : ''}${!this.checks.antiCopy ? '❌ Anti-Copy\n' : ''}
Recomendação: Execute o script APLICAR_PROTECAO.sh
para proteger o código contra cópias não autorizadas.
            `.trim();

            console.warn(message);

            // Mostrar alerta visual (apenas em desenvolvimento)
            if (window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1') {
                // Não mostrar em produção para não assustar usuários
                // alert(message);
            }
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.SecurityCheck = SecurityCheck;
}
