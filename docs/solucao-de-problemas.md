# Solução de problemas (iOS)

Histórico detalhado: doc do projeto `debug-crash-ingredientes-ios.md` (45 itens). Aqui ficam os
problemas que podem voltar e o que fazer.

## Build e Xcode

| Sintoma | Causa | Solução |
|---|---|---|
| `Sandbox: bash deny(1) file-read-data …/Pods-App-frameworks.sh` | `ENABLE_USER_SCRIPT_SANDBOXING = YES` no alvo App (padrão de Xcode novo) | Manter `NO` nas configs Debug/Release do alvo App (`project.pbxproj`); Clean Build Folder |
| "The sandbox is not in sync with the Podfile.lock" | Pods desatualizados | `npm install` em `precificacao-ios/` e `pod install` em `ios/App` |
| "Your team has no devices" / "No profiles for com.precificacao.app" | Destino "Any iOS Device" ao rodar no aparelho | Escolher o iPhone conectado; o Xcode gera o perfil de desenvolvimento |
| App instalado "não mudou nada" | Bundle não sincronizado/commitado, ou cache do WKWebView | Conferir o bundle (fluxo-de-atualizacao.md), Clean Build Folder, apagar o app do aparelho e instalar de novo |
| Upload recusado por build repetido | `CURRENT_PROJECT_VERSION` igual a um já enviado | Aumentar o Build |

## PDF da proposta
Sequência de problemas já resolvidos (não reintroduzir):

| Sintoma | Causa | Solução (atual) |
|---|---|---|
| "Failed to open URL … invalid input parameters" ao imprimir | `window.open('', '_blank')` no WKWebView | Ramo nativo do `handlePrint` não abre janela |
| Imprimir não faz nada | `window.print()` não existe no WKWebView | PDF gerado pela API + compartilhar |
| WebContent reiniciando sem parar ao baixar | Domínio da API em `allowNavigation` → WKWebView tenta exibir resposta `attachment` | Domínio removido do `allowNavigation`; nada de navegar para o PDF |
| `LSApplicationWorkspaceErrorDomain Code=115` | Navegar para `data:application/pdf…` | Não navegar; usar `fetch` + `navigator.share` |
| PDF "todo preto" na tela do app | PDF em `<iframe>` (blob: ou data:) não renderiza no WKWebView | Sem pré-visualização no app |
| Salva **dois** arquivos (PDF + `.txt` com "Proposta") | `navigator.share({ files, title })` | Compartilhar só `{ files: [file] }` (vale para qualquer arquivo) |
| Arquivo "corrompido"/preto no Arquivos | API mandava o `Uint8Array` do Puppeteer 22+ via `res.send` → virava JSON | Backend usa `Buffer.from(pdfRaw)` (`pdfGeneratorService`) |
| PDF diferente da pré-visualização | Template antigo do servidor | Servidor usa os modelos Chef/Moderno iguais à tela |
| Compartilhar não abre depois de gerar | Gesto do toque expirou durante o `fetch` | Overlay com botão "Imprimir / Compartilhar" (toque novo) — já implementado |

## Sessão e rede

| Sintoma | Causa | Solução |
|---|---|---|
| Erro ao imprimir proposta / importar receita após ~15 min com o app aberto | `fetch` direto com token vencido | Usar `api.authFetch()` (renova o token em 401/403 e repete) ou `api.request()` — nunca `fetch` com `localStorage.accessToken` direto |
| Chamadas indo para `localhost:3001` ou para a API de staging | Detecção por `window.location.hostname` (no app é sempre `localhost`) | Sempre `window.APP_CONFIG.backend.baseURL` (no app = produção) |
| "Erro na API: {}" no console do Xcode | O bridge do Capacitor serializa `Error` como `{}` | O `api-client` loga `message`/status/stack como texto; logue strings, não objetos `Error` |
| Evento editado no iPhone não aparece na web (ou o contrário) | Cache em memória sem validade / bugs antigos de update-vs-create | Corrigido (`getEventByIdAsync(id, true)`, update com fallback para create). Reabrir e salvar eventos antigos divergentes |
| Clientes/propostas novos só aparecem ao recarregar | Cache sem validade | Corrigido: cache de 60 s, recarrega ao voltar para o app e busca no servidor quando o id não está no cache |
| "Erro ao sincronizar cache com localStorage" | Cota do `localStorage` estourada pelo backup de eventos | Só afeta o backup offline; a fonte de verdade é a API |

## Telas no iPhone/iPad

| Sintoma | Causa | Solução |
|---|---|---|
| Crash na aba Ingredientes (`Can't find variable: ingredients`) | Bloco de cards fora do escopo | Corrigido (histórico item 1) |
| Conteúdo cortado / botões fora da tela | `grid-cols-N` fixo, `flex` sem `flex-wrap`, tabelas largas | Grades responsivas (`auto-fit` inline), `flex-wrap gap-2`, cards abaixo de `lg` (Itens, Apoio, Clientes, Ingredientes, Cardápio) |
| Classe Tailwind "não funciona" | `styles/output.css` é compilado e versionado; classes novas não existem nele | Usar classes que já existem no CSS ou `style` inline |
| Fim da tela escondido atrás da barra inferior | Barra fixa com 2 linhas + área do indicador | Classes `mobile-bottom-nav` / `mobile-nav-spacer` (safe area) em `mobile-optimizations.css` |
| Barra inferior por cima de modais | z-index igual | `.mobile-bottom-nav { z-index: 40 }` no CSS mobile |
| Banner "Instalar como App" dentro do app | Texto de PWA | Escondido quando `isNativePlatform()` |
| Logo da empresa não aparece no iPhone/PDF | Logo não era enviada ao backend | Corrigido no `CompanyManager`; salvar "Dados da Empresa" uma vez na web |
| Logo grande recusada | Limite de 2 MB | Removido (a imagem é reduzida para 200×200) |

## Arquivos (lista de compras, cardápio salvo, ficha técnica, exportar, Excel)
- No app, todos usam `ShareFile`/`DishSheet`: geram o arquivo e abrem o compartilhar do iOS
  (Imprimir, Salvar em Arquivos, WhatsApp).
- Se algum novo recurso usar `window.open`, `window.print` ou `<a download>`, ele não vai
  funcionar no app — trocar por `ShareFile.printHtml` / `ShareFile.saveFile`.
