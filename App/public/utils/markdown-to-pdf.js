/**
 * markdown-to-pdf.js v2.0
 * Converte Markdown para PDF profissional
 */

class MarkdownToPDF {
    constructor() {
        this.isLibrariesLoaded = false;
    }

    async loadLibraries() {
        if (this.isLibrariesLoaded) return;
        if (!window.jspdf) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        }
        this.isLibrariesLoaded = true;
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    cleanMarkdown(text) {
        // O PDF usa fonte padrão (sem emoji nem setas): troca/remove esses caracteres
        return text.replace(/^>\s?/, '').replace(/←/g, '<-').replace(/→/g, '->').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]+ ?/gu, '').replace(/ {2,}/g, ' ').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1').replace(/\[(.*?)\]\(.*?\)/g, '$1').trim();
    }

    parseMarkdown(markdown) {
        const lines = markdown.split('\n');
        const elements = [];
        let currentList = null;

        for (let line of lines) {
            line = line.trimEnd();

            if (!line.trim()) {
                if (currentList) {
                    elements.push(currentList);
                    currentList = null;
                }
                elements.push({ type: 'space' });
                continue;
            }

            const img = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/);
            if (img) {
                if (currentList) elements.push(currentList);
                currentList = null;
                elements.push({ type: 'image', alt: img[1], src: img[2] });
                continue;
            }
            if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue; // separador de tabela
            if (/^\s*\|.*\|\s*$/.test(line)) {
                if (currentList) elements.push(currentList);
                currentList = null;
                elements.push({ type: 'text', text: line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => this.cleanMarkdown(c.trim())).join('  |  ') });
                continue;
            }
            if (/^\s*>/.test(line)) {
                if (currentList) elements.push(currentList);
                currentList = null;
                elements.push({ type: 'tip', text: this.cleanMarkdown(line.trim()) });
                continue;
            }
            line = line.replace(/^\s+(?=[-*] )/, '');

            if (line.startsWith('# ')) {
                if (currentList) elements.push(currentList);
                currentList = null;
                elements.push({ type: 'h1', text: this.cleanMarkdown(line.substring(2)) });
            } else if (line.startsWith('## ')) {
                if (currentList) elements.push(currentList);
                currentList = null;
                elements.push({ type: 'h2', text: this.cleanMarkdown(line.substring(3)) });
            } else if (line.startsWith('### ')) {
                if (currentList) elements.push(currentList);
                currentList = null;
                elements.push({ type: 'h3', text: this.cleanMarkdown(line.substring(4)) });
            } else if (line.startsWith('- ') || line.startsWith('* ')) {
                if (!currentList) currentList = { type: 'bullet', items: [] };
                currentList.items.push(this.cleanMarkdown(line.substring(2)));
            } else if (line.match(/^[-*_]{3,}$/)) {
                if (currentList) elements.push(currentList);
                currentList = null;
                elements.push({ type: 'hr' });
            } else {
                if (currentList) elements.push(currentList);
                currentList = null;
                elements.push({ type: 'text', text: this.cleanMarkdown(line) });
            }
        }

        if (currentList) elements.push(currentList);
        return elements;
    }

    async convertToPDF(markdownContent, filename) {
        try {
            await this.loadLibraries();
            const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const elements = this.parseMarkdown(markdownContent);

            let y = 25;
            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            const margin = 20;
            const maxWidth = pageWidth - (margin * 2);

            doc.setFillColor(255, 87, 34);
            doc.rect(0, 0, pageWidth, 15, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('Manual do Usuário', pageWidth / 2, 10, { align: 'center' });

            for (const element of elements) {
                if (y > pageHeight - 30) {
                    doc.addPage();
                    y = 20;
                }

                switch (element.type) {
                    case 'h1':
                        y += 5;
                        doc.setTextColor(255, 87, 34);
                        doc.setFontSize(16);
                        doc.setFont(undefined, 'bold');
                        const h1Lines = doc.splitTextToSize(element.text, maxWidth);
                        doc.text(h1Lines, margin, y);
                        y += h1Lines.length * 8 + 5;
                        break;

                    case 'h2':
                        y += 4;
                        doc.setTextColor(68, 68, 68);
                        doc.setFontSize(13);
                        doc.setFont(undefined, 'bold');
                        const h2Lines = doc.splitTextToSize(element.text, maxWidth);
                        doc.text(h2Lines, margin, y);
                        y += h2Lines.length * 6 + 3;
                        break;

                    case 'h3':
                        y += 3;
                        doc.setTextColor(68, 68, 68);
                        doc.setFontSize(11);
                        doc.setFont(undefined, 'bold');
                        const h3Lines = doc.splitTextToSize(element.text, maxWidth);
                        doc.text(h3Lines, margin, y);
                        y += h3Lines.length * 5 + 2;
                        break;

                    case 'text':
                        doc.setTextColor(60, 60, 60);
                        doc.setFontSize(10);
                        doc.setFont(undefined, 'normal');
                        const textLines = doc.splitTextToSize(element.text, maxWidth);
                        doc.text(textLines, margin, y);
                        y += textLines.length * 5 + 1;
                        break;

                    case 'bullet':
                        doc.setTextColor(60, 60, 60);
                        doc.setFontSize(10);
                        doc.setFont(undefined, 'normal');
                        for (const item of element.items) {
                            const itemLines = doc.splitTextToSize('• ' + item, maxWidth - 5);
                            doc.text(itemLines, margin + 3, y);
                            y += itemLines.length * 5 + 1;
                            if (y > pageHeight - 30) {
                                doc.addPage();
                                y = 20;
                            }
                        }
                        y += 2;
                        break;

                    case 'tip': {
                        doc.setFontSize(10);
                        doc.setFont(undefined, 'normal');
                        const tipLines = element.text ? doc.splitTextToSize(element.text, maxWidth - 8) : [];
                        const hTip = Math.max(tipLines.length * 5, 1) + 3;
                        if (y + hTip > pageHeight - 25) { doc.addPage(); y = 20; }
                        doc.setFillColor(255, 247, 237);
                        doc.rect(margin, y - 4, maxWidth, hTip, 'F');
                        doc.setFillColor(249, 115, 22);
                        doc.rect(margin, y - 4, 1.2, hTip, 'F');
                        doc.setTextColor(60, 60, 60);
                        if (tipLines.length) doc.text(tipLines, margin + 4, y);
                        y += hTip - 1;
                        break;
                    }

                    case 'image': {
                        const im = await this.loadImage(element.src);
                        if (!im) break;
                        const w = 55;
                        const h = w * im.height / im.width;
                        if (y + h + 8 > pageHeight - 20) { doc.addPage(); y = 20; }
                        try { doc.addImage(im.data, 'JPEG', (pageWidth - w) / 2, y, w, h); } catch (e) { break; }
                        y += h + 4;
                        if (element.alt) {
                            doc.setTextColor(110, 110, 110);
                            doc.setFontSize(8.5);
                            doc.setFont(undefined, 'italic');
                            const cap = doc.splitTextToSize(element.alt, maxWidth);
                            doc.text(cap, pageWidth / 2, y, { align: 'center' });
                            y += cap.length * 4 + 3;
                        }
                        break;
                    }

                    case 'hr':
                        y += 2;
                        doc.setDrawColor(200, 200, 200);
                        doc.setLineWidth(0.3);
                        doc.line(margin, y, pageWidth - margin, y);
                        y += 4;
                        break;

                    case 'space':
                        y += 2;
                        break;
                }
            }

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setTextColor(120, 120, 120);
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.text('Página ' + i + ' de ' + pageCount, pageWidth / 2, pageHeight - 10, { align: 'center' });
                doc.setFontSize(8);
                doc.text('Calculadora de Precificação', margin, pageHeight - 10);
                const today = new Date().toLocaleDateString('pt-BR');
                doc.text(today, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }

            doc.save(filename);
            return { success: true };
        } catch (error) {
            console.error('Erro ao converter para PDF:', error);
            return { success: false, error: error.message };
        }
    }

    // Carrega uma imagem do manual como dataURL (JPEG) + tamanho, para o PDF
    loadImage(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                try {
                    const c = document.createElement('canvas');
                    c.width = img.naturalWidth; c.height = img.naturalHeight;
                    c.getContext('2d').drawImage(img, 0, 0);
                    resolve({ data: c.toDataURL('image/jpeg', 0.85), width: img.naturalWidth, height: img.naturalHeight });
                } catch (e) { resolve(null); }
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    async downloadManualAsPDF() {
        try {
            const response = await fetch('/MANUAL-DO-USUARIO.md');
            if (!response.ok) throw new Error('Manual não encontrado');
            const markdownContent = await response.text();
            await this.convertToPDF(markdownContent, 'Manual-Calculadora-Precificacao.pdf');
            return { success: true };
        } catch (error) {
            console.error('Erro ao baixar manual:', error);
            return { success: false, error: error.message };
        }
    }
}

window.MarkdownToPDF = MarkdownToPDF;

/**
 * Leitor do manual dentro do app (overlay). Usado no botão "Ver":
 * no app do iPhone, window.open() de um .md e o download de PDF não funcionam.
 */
(function () {
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inline = t => esc(t)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const cells = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

    function mdToHtml(md) {
        const out = [];
        let list = null; // 'ul' | 'ol' | 'tip' | 'table'
        const close = () => {
            if (!list) return;
            out.push(list === 'tip' ? '</div>' : list === 'table' ? '</tbody></table></div>' : '</' + list + '>');
            list = null;
        };
        for (const raw of md.split('\n')) {
            const line = raw.trimEnd();
            let m;
            if (!line.trim()) { close(); continue; }
            // imagem sozinha na linha: ![legenda](manual/arquivo.jpg)
            if ((m = line.match(/^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/))) {
                close();
                out.push('<figure class="mv-fig"><img src="' + esc(m[2]) + '" alt="' + esc(m[1]) + '" loading="lazy">' + (m[1] ? '<figcaption>' + inline(m[1]) + '</figcaption>' : '') + '</figure>');
                continue;
            }
            // dica / exemplo: linhas começando com >
            if ((m = line.match(/^\s*>\s?(.*)$/))) {
                if (list !== 'tip') { close(); out.push('<div class="mv-tip">'); list = 'tip'; }
                const sub = m[1].match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
                out.push(sub ? '<p class="mv-tip-li">' + inline(m[1].trim()) + '</p>' : '<p>' + inline(m[1]) + '</p>');
                continue;
            }
            // tabela: | a | b |
            if (/^\s*\|.*\|\s*$/.test(line)) {
                if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) continue; // linha separadora
                if (list !== 'table') { close(); out.push('<div class="mv-table"><table><thead><tr>' + cells(line).map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>'); list = 'table'; continue; }
                out.push('<tr>' + cells(line).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>');
                continue;
            }
            if (/^[-*_]{3,}$/.test(line.trim())) { close(); out.push('<hr>'); continue; }
            if ((m = line.match(/^(#{1,4})\s+(.*)$/))) { close(); const n = m[1].length; out.push('<h' + n + '>' + inline(m[2]) + '</h' + n + '>'); continue; }
            if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); continue; }
            if ((m = line.match(/^\s*(\d+)\.\s+(.*)$/))) { if (list !== 'ol') { close(); out.push('<ol start="' + m[1] + '">'); list = 'ol'; } out.push('<li>' + inline(m[2]) + '</li>'); continue; }
            close();
            out.push('<p>' + inline(line) + '</p>');
        }
        close();
        return out.join('\n');
    }

    const CSS = `
#manual-viewer{position:fixed;inset:0;z-index:10000;background:#fff;display:flex;flex-direction:column;font-family:system-ui,-apple-system,sans-serif;color:#1f2937}
#manual-viewer .mv-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;padding-top:calc(12px + env(safe-area-inset-top));background:linear-gradient(90deg,#ea580c,#dc2626);color:#fff}
#manual-viewer .mv-top b{font-size:17px}
#manual-viewer .mv-close{cursor:pointer;font-weight:700;font-size:15px;background:rgba(255,255,255,.2);border-radius:8px;padding:8px 14px;user-select:none}
#manual-viewer .mv-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 16px calc(32px + env(safe-area-inset-bottom))}
#manual-viewer .mv-doc{max-width:760px;margin:0 auto;font-size:15px;line-height:1.55}
#manual-viewer h1,#manual-viewer h2,#manual-viewer h3,#manual-viewer h4{font-weight:700;line-height:1.3}
#manual-viewer h1{font-size:24px;color:#ea580c;margin:8px 0 4px}
#manual-viewer h2{font-size:19px;margin:22px 0 8px;color:#111827}
#manual-viewer h3{font-size:16px;margin:16px 0 6px;color:#374151}
#manual-viewer p{margin:6px 0}
#manual-viewer ul,#manual-viewer ol{margin:6px 0;padding-left:22px}
#manual-viewer ul{list-style:disc}
#manual-viewer ol{list-style:decimal}
#manual-viewer li{display:list-item}
#manual-viewer li{margin:4px 0}
#manual-viewer hr{border:0;border-top:1px solid #e5e7eb;margin:18px 0}
#manual-viewer code{background:#f3f4f6;border-radius:4px;padding:0 4px}
#manual-viewer a{color:#c2410c;text-decoration:underline}
#manual-viewer .mv-fig{margin:14px auto 18px;text-align:center}
#manual-viewer .mv-fig img{display:block;margin:0 auto;width:100%;max-width:300px;height:auto;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 6px 20px rgba(0,0,0,.10);background:#f9fafb}
#manual-viewer .mv-fig figcaption{font-size:13px;color:#6b7280;margin-top:8px;line-height:1.4}
#manual-viewer .mv-tip{background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #f97316;border-radius:10px;padding:10px 14px;margin:12px 0}
#manual-viewer .mv-tip p{margin:4px 0}
#manual-viewer .mv-tip .mv-tip-li{padding-left:6px}
#manual-viewer .mv-table{overflow-x:auto;margin:10px 0}
#manual-viewer table{border-collapse:collapse;width:100%;font-size:14px}
#manual-viewer th,#manual-viewer td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left;vertical-align:top}
#manual-viewer th{background:#f9fafb;font-weight:700}`;

    window.openManualViewer = async function () {
        if (document.getElementById('manual-viewer')) return;
        if (!document.getElementById('manual-viewer-css')) {
            const st = document.createElement('style');
            st.id = 'manual-viewer-css';
            st.textContent = CSS;
            document.head.appendChild(st);
        }
        const box = document.createElement('div');
        box.id = 'manual-viewer';
        box.innerHTML = '<div class="mv-top"><b>Manual do Usuário</b><div class="mv-close" role="button" tabindex="0">Fechar ✕</div></div><div class="mv-body"><div class="mv-doc">Carregando...</div></div>';
        const fechar = () => { box.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = e => { if (e.key === 'Escape') fechar(); };
        box.querySelector('.mv-close').addEventListener('click', fechar);
        document.addEventListener('keydown', onKey);
        document.body.appendChild(box);
        try {
            const r = await fetch('MANUAL-DO-USUARIO.md', { cache: 'no-cache' });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            box.querySelector('.mv-doc').innerHTML = mdToHtml(await r.text());
        } catch (e) {
            box.querySelector('.mv-doc').textContent = 'Não foi possível abrir o manual. Tente novamente.';
        }
    };
})();
