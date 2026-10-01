/**
 * machine-fingerprint.js
 * Sistema de Fingerprint de Máquina
 *
 * Garante que a versão OFFLINE seja usada apenas em uma máquina.
 * Usa características do navegador e hardware para gerar um ID único.
 */

(function() {
    'use strict';

    console.log('🔐 [Fingerprint] Script carregado, aguardando verificação de licença...');

    /**
     * Gera um fingerprint único baseado em características do navegador/hardware
     */
    async function generateFingerprint() {
        const components = [];

        // 1. User Agent
        components.push(navigator.userAgent);

        // 2. Idioma
        components.push(navigator.language);

        // 3. Plataforma
        components.push(navigator.platform);

        // 4. Núcleos de CPU
        components.push(navigator.hardwareConcurrency || 'unknown');

        // 5. Memória do dispositivo (se disponível)
        components.push(navigator.deviceMemory || 'unknown');

        // 6. Timezone
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

        // 7. Resolução de tela
        components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

        // 8. Canvas fingerprint (técnica avançada)
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('MachineID', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('MachineID', 4, 17);
            components.push(canvas.toDataURL());
        } catch (e) {
            components.push('canvas-error');
        }

        // 9. WebGL fingerprint (se disponível)
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
                    components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
                }
            }
        } catch (e) {
            components.push('webgl-error');
        }

        // Combinar todos os componentes
        const fingerprint = components.join('|||');

        // Gerar hash usando SubtleCrypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprint);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        return hashHex;
    }

    /**
     * Verifica se esta máquina está autorizada
     */
    async function checkMachineAuthorization() {
        try {
            const currentFingerprint = await generateFingerprint();
            const storedFingerprint = localStorage.getItem('machine_fingerprint');

            if (!storedFingerprint) {
                // Primeira vez - registrar esta máquina
                localStorage.setItem('machine_fingerprint', currentFingerprint);
                localStorage.setItem('machine_registered_at', new Date().toISOString());
                console.log('✅ Máquina registrada com sucesso');
                return { authorized: true, firstTime: true };
            }

            if (currentFingerprint === storedFingerprint) {
                console.log('✅ Máquina autorizada');
                return { authorized: true, firstTime: false };
            }

            // Máquina diferente!
            console.error('❌ Esta licença está registrada em outra máquina!');
            return {
                authorized: false,
                firstTime: false,
                message: 'Esta licença OFFLINE já está em uso em outra máquina.\n\nPara usar em múltiplas máquinas, adquira a versão ONLINE.'
            };

        } catch (error) {
            console.error('❌ Erro ao verificar fingerprint:', error);
            // Em caso de erro, permitir acesso (fallback)
            return { authorized: true, firstTime: false, error: true };
        }
    }

    /**
     * Bloquear aplicação se máquina não autorizada
     */
    async function enforceSingleMachine() {
        const result = await checkMachineAuthorization();

        if (!result.authorized) {
            // Criar overlay de bloqueio
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: system-ui, -apple-system, sans-serif;
            `;

            overlay.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 16px;
                    padding: 48px;
                    max-width: 500px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                ">
                    <div style="
                        width: 80px;
                        height: 80px;
                        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
                        border-radius: 50%;
                        margin: 0 auto 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 40px;
                    ">
                        🔒
                    </div>
                    <h2 style="
                        margin: 0 0 16px 0;
                        font-size: 24px;
                        color: #2d3748;
                        font-weight: 700;
                    ">
                        Máquina Não Autorizada
                    </h2>
                    <p style="
                        margin: 0 0 24px 0;
                        color: #4a5568;
                        font-size: 16px;
                        line-height: 1.6;
                    ">
                        ${result.message}
                    </p>
                    <div style="
                        padding: 16px;
                        background: #f7fafc;
                        border-radius: 8px;
                        font-size: 14px;
                        color: #718096;
                        line-height: 1.5;
                    ">
                        💾 <strong>Versão OFFLINE:</strong> Uso restrito a uma máquina<br>
                        ☁️ <strong>Versão ONLINE:</strong> Use em quantas máquinas quiser
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Bloquear navegação
            window.addEventListener('beforeunload', function(e) {
                e.preventDefault();
                e.returnValue = '';
            });

            throw new Error('Machine not authorized');
        }

        if (result.firstTime) {
            // Mostrar mensagem de boas-vindas
            console.log('🎉 Versão OFFLINE registrada nesta máquina');
        }
    }

    /**
     * Verifica se deve aplicar fingerprint baseado no tipo de licença atual
     */
    function shouldEnforceFingerprint() {
        if (typeof window.ConfigHelper === 'undefined') {
            console.log('⚠️ [Fingerprint] ConfigHelper não disponível');
            return false;
        }

        // Forçar limpeza do cache do ConfigHelper
        if (window.ConfigHelper._cachedPlan) {
            console.log('🗑️ [Fingerprint] Limpando cache do ConfigHelper...');
            window.ConfigHelper._cachedPlan = null;
            window.ConfigHelper._cacheTime = null;
        }

        // Verificar licenseType diretamente no localStorage
        const licenseType = localStorage.getItem('licenseType');
        console.log('📦 [Fingerprint] licenseType no localStorage:', licenseType);

        const currentPlan = window.ConfigHelper.getCurrentPlan();
        console.log('🔍 [Fingerprint] getCurrentPlan() retornou:', currentPlan);

        if (currentPlan === 'offline') {
            console.log('🔐 [Fingerprint] Licença OFF detectada - fingerprint ATIVO');
            return true;
        } else {
            console.log('🔓 [Fingerprint] Licença STD/PRM detectada - fingerprint DESABILITADO');
            return false;
        }
    }

    /**
     * Inicia verificação de fingerprint (chamado após login)
     */
    async function initFingerprint() {
        if (shouldEnforceFingerprint()) {
            await enforceSingleMachine();
        }
    }

    // Exportar para uso global
    window.MachineFingerprint = {
        check: checkMachineAuthorization,
        generate: generateFingerprint,
        init: initFingerprint,
        shouldEnforce: shouldEnforceFingerprint
    };

    console.log('✅ [Fingerprint] Módulo pronto. Use MachineFingerprint.init() após login.');

})();
