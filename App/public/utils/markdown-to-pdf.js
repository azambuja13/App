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
        return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1').replace(/\[(.*?)\]\(.*?\)/g, '$1').trim();
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
