# Arquitetura do app iOS

## 1. Visão geral

```
iPhone/iPad
└── App (Swift, boilerplate do Capacitor)
    └── CAPBridgeViewController  ── WKWebView
            └── capacitor://localhost/index.html   ← App/App/public (web embutida)
                    │  fetch / WebSocket (HTTPS)
                    ▼
            API de produção (precificacao-api no Railway / api.chefazambuja.com)
```

- O app é um "invólucro": `SceneDelegate.swift` cria a janela com `CAPBridgeViewController()`, que
  carrega `App/App/public/index.html` dentro de um `WKWebView`. O endereço da página é sempre
  `capacitor://localhost`.
- `AppDelegate.swift` é o padrão do Capacitor (só repassa `open url` / `continue userActivity` ao
  `ApplicationDelegateProxy`). Não há código nativo próprio, nem plugins (câmera, arquivos, share,
  impressão) — tudo é feito com APIs web suportadas pelo WKWebView.
- Dependências nativas via **CocoaPods** (`App/Podfile`): `Capacitor` e `CapacitorCordova`, a partir
  de `../../node_modules/@capacitor/ios`. Por isso: abrir sempre **`App.xcworkspace`**, e o
  `node_modules` de `precificacao-ios/` precisa existir (`npm install` na raiz `precificacao-ios/`, depois
  `pod install` em `ios/App` se o Xcode reclamar do `Podfile.lock`).

## 2. Estrutura do repositório (`precificacao-ios/ios/App`)

| Caminho | Papel |
|---|---|
| `App.xcworkspace` | Workspace (App + Pods). Abrir este. |
| `App.xcodeproj/project.pbxproj` | Projeto: versão (`MARKETING_VERSION`), build (`CURRENT_PROJECT_VERSION`), Team, bundle id, `ENABLE_USER_SCRIPT_SANDBOXING = NO` (necessário para o script de frameworks do CocoaPods) |
| `Podfile` / `Podfile.lock` / `Pods/` | CocoaPods |
| `App/AppDelegate.swift`, `App/SceneDelegate.swift` | Boilerplate do Capacitor |
| `App/Info.plist` | Metadados (ver abaixo) |
| `App/capacitor.config.json` | Configuração do Capacitor usada pelo app |
| `App/config.xml` | Resto do Cordova (`<access origin="*">`) |
| `App/Base.lproj/*.storyboard` | `Main` e `LaunchScreen` |
| `App/Assets.xcassets` | Ícone (1024×1024 sem alfa, calculadora "R$" laranja) e cores |
| `App/public/` | **A web embutida** (index.html, `ui-compiled/`, `core/`, `utils/`, `vendor/`, `fonts/`, `styles/`, `manual/`…). Gerada pelo `sync-ios-com-web.sh` — não editar à mão |

### Info.plist (pontos relevantes)

- `CFBundleDevelopmentRegion = pt-BR`, `CFBundleDisplayName = Calculadora Precificação`.
- `CFBundleShortVersionString = $(MARKETING_VERSION)`, `CFBundleVersion = $(CURRENT_PROJECT_VERSION)`.
- `ITSAppUsesNonExemptEncryption = false` (isenção de criptografia — evita a pergunta a cada envio).
- `NSCameraUsageDescription` e `NSPhotoLibraryUsageDescription` — obrigatórios porque a web tem
  `<input type="file">` para fotos de pratos, logo e fotos da empresa. Sem eles o iOS fecha o app
  ao abrir câmera/fotos e a revisão rejeita.
- `UIRequiredDeviceCapabilities = arm64`; todas as orientações (exigido no iPad);
  `UIStatusBarHidden = true`.

## 3. Capacitor (`capacitor.config.json`)

```json
{
  "appId": "com.precificacao.app",
  "appName": "Calculadora Precificação",
  "webDir": "www",
  "server": { "cleartext": true, "allowNavigation": ["precificacao-cloud.pages.dev"] },
  "ios": { "contentInset": "automatic", "backgroundColor": "#f3f4f6" },
  "plugins": { "SplashScreen": { "launchShowDuration": 2000, ... } }
}
```

- **`allowNavigation`** controla só a navegação de página inteira dentro do WKWebView. Qualquer
  outra navegação de página (outro domínio, `data:`, `blob:`) é entregue ao iOS
  (`UIApplication.open`) — que abre o Safari ou falha (`LSApplicationWorkspaceErrorDomain 115`).
  `fetch`, XHR e WebSocket **não** são afetados. O domínio da API foi retirado de propósito
  (ver [solução de problemas](solucao-de-problemas.md#pdf-da-proposta)).
- **`webDir: "www"`** é resquício do projeto gerado pelo Capacitor. O bundle real é mantido
  diretamente em `App/App/public/` pelo `sync-ios-com-web.sh`. **Não rode `npx cap sync` /
  `npx cap copy`**: eles copiariam a pasta `www/` antiga (desatualizada) por cima do `public/`.

## 4. Como a web sabe que está no app

```js
window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()
```

- Helper global: `window.isNativeApp()` (em `config/app-config.js`); `utils/share-file.js` e
  `utils/dish-sheet.js` têm o mesmo teste (`isNative()`).
- O que muda quando é nativo:

| Onde | Comportamento no app |
|---|---|
| `config/app-config.js` → `APP_CONFIG.backend.baseURL` | Sempre API de **produção** (`hostname` dentro do app é sempre `localhost`, então a detecção por hostname não serve). Usa `https://api.chefazambuja.com` se o `/health` dele respondeu nesta sessão, senão `https://precificacao-api-production.up.railway.app` |
| `LicenseActivation`, `FeatureGate`, `UpgradeModal`, alertas de plano, selo do plano (`App-Full`) | Sem botão/preço/link de compra (regras 3.1.1 / 3.1.3(b) da Apple) — só login |
| `App-Full` | Banner "Instalar como App" (PWA) escondido |
| `ProposalPreview` (Imprimir proposta) | PDF gerado pela API + compartilhar do iOS (abaixo) |
| `utils/share-file.js`, `utils/dish-sheet.js`, `ItemsList`, `MenuPreview`, `DishList`, `IngredientsDatabase` | Impressão/arquivos viram arquivo + compartilhar (abaixo) |

## 5. Limitações do WKWebView e soluções adotadas

| Não funciona no app | Por quê | Solução usada |
|---|---|---|
| `window.open('', '_blank')` + `document.write` | Abertura de URL vazia é repassada ao iOS e falha ("Failed to open URL") | Não abrir janela: gerar arquivo e compartilhar |
| `window.print()` | Não tem efeito sem plugin nativo (não dá erro, não faz nada) | PDF + folha de compartilhar (que tem **Imprimir**/AirPrint) |
| `<a download>` / navegar para arquivo | Não há download no WKWebView; navegar para outro domínio/`data:` sai do app ou falha | `navigator.share({ files: [file] })` |
| PDF em `<iframe>` (`blob:` ou `data:`) | O visualizador de PDF do WKWebView só funciona em navegação de página inteira — o iframe fica preto | Não pré-visualizar no app; ir direto para o compartilhar |
| `navigator.share` com `title`/`text` junto de `files` | O iOS salva o título como um segundo arquivo `.txt` | Passar **só** `{ files: [file] }` |
| `navigator.share` depois de operação longa | Exige gesto recente do usuário; após `fetch`/geração de PDF o toque pode ter "expirado" (`NotAllowedError`) | Tentar direto; se falhar, mostrar overlay com botão "Imprimir / Compartilhar" (toque novo) |

### PDF da proposta
`ProposalPreview.js → handlePrint` (ramo nativo):
1. `api.authFetch(GET /api/proposals/:id/pdf)` — o PDF é gerado no servidor (Puppeteer, mesmo
   gerador do WhatsApp; modelo Chef ou Moderno). `authFetch` renova o token vencido e repete.
2. `blob` → `new File([blob], 'proposta.pdf', { type: 'application/pdf' })`.
3. `navigator.share({ files: [file] })`; se falhar por falta de gesto → overlay com botão.

### Outros arquivos (helpers da web)
- **`utils/share-file.js`** (`window.ShareFile`): `isNative`, `saveFile` (iPhone: compartilhar ·
  navegador: baixar), `shareFile`, `printHtml` (navegador: janela de impressão, com iframe se o
  pop-up for bloqueado · iPhone: PDF + compartilhar), `elementToPdfFile`, `htmlToPdfFile`
  (html2canvas + jsPDF, já embutidos em `vendor/`). Usado por: lista de compras (`ItemsList`),
  cardápio salvo (`MenuPreview`), exportar pratos (`DishList`, JSON com ingredientes).
- **`utils/dish-sheet.js`** (`window.DishSheet`): ficha técnica do prato; no app gera o PDF com
  jsPDF (texto vetorial) e compartilha; no navegador abre a impressão.
- **Excel de ingredientes** (`IngredientsDatabase`): SheetJS local (`vendor/xlsx.full.min.js`,
  carregado sob demanda pelo `utils/lazy-loader.js`; no app é pré-carregado para o compartilhar
  ainda contar como parte do toque).

Regra para código novo: **qualquer** recurso que imprime, baixa ou abre janela precisa de um
caminho nativo via `ShareFile`, sem `title`/`text` no `navigator.share`.

## 6. Offline

Base: doc do projeto `offline-ios.md` + código atual.

- **Bibliotecas locais** em `vendor/` (React/ReactDOM 18.3.1, jsPDF 2.5.1, html2canvas 1.4.1,
  socket.io 4.8.1, SheetJS 0.18.5 sob demanda) — sem CDN, o app abre sem internet.
- **`utils/offline-cache.js`** (carrega depois do `app-config` e antes do `api-client`): guarda a
  última resposta de cada GET no IndexedDB `precificacao_offline` (chave `usuário|endpoint`), mostra
  a faixa "📴 Sem internet" e dispara `app-offline-changed`.
- **`api-client.request`** sem rede: GET devolve a cópia guardada; POST/PUT/PATCH/DELETE dão erro
  "Sem internet: não foi possível salvar". Não há fila de sincronização.
- **Login offline** (`core/PasswordManager.js`): após um login online, guarda `offline_credential`
  (e-mail, sal, hash PBKDF2-SHA-256 com 120 mil iterações, licenseKey). Sem internet confere o hash.
- **Limites:** é preciso ter entrado com internet no aparelho e aberto as telas antes; fotos
  (Cloudinary) não carregam offline; nada é salvo offline.

## 7. Armazenamento no aparelho

- `localStorage` do WKWebView (origem `capacitor://localhost`): token de acesso (`accessToken`),
  licença, credencial offline, preferências, backup de eventos (`eventos-salvos-backup`, agora com
  dono por conta) etc. Cota limitada — o backup grande de eventos já estourou a cota antes (só afeta
  o backup local; a fonte de verdade é o PostgreSQL).
- IndexedDB: cache offline (`precificacao_offline`); `config/indexeddb-blocker.js` bloqueia o uso
  antigo de IndexedDB pelo app e expõe `window.__rawIndexedDB` só para o cache offline.
- O WKWebView pode manter recursos em cache: se um build novo "não muda nada", apagar o app do
  aparelho e instalar de novo.

## 8. Backend e rede

- Todas as chamadas vão para a API de produção (`precificacao-api`), por `fetch` com
  `Authorization: Bearer <accessToken>` (renovado automaticamente pelo `api-client`) e WebSocket
  (socket.io) para sincronização. A API libera CORS para `capacitor://localhost`.
- Para API/rotas/banco ver `precificacao-api/docs/`.
