# Calculadora Precificação — app iOS (documentação de desenvolvimento)

App nativo do iPhone/iPad. Ele **não tem código de tela próprio**: é a mesma aplicação web
(`precificacao-cloud`) embutida no projeto Xcode e exibida num `WKWebView` pelo
[Capacitor](https://capacitorjs.com/docs/ios). Tudo o que é específico do iPhone (PDF pelo
compartilhar, API de produção, esconder compra) está no código da web, protegido por
"se for app nativo".

| Item | Valor |
|---|---|
| Repositório git | `precificacao-ios/ios/App` (remoto `azambuja13/App`) — **não** a pasta `precificacao-ios/` |
| Branch de trabalho | `release/1.2` |
| Bundle ID | `com.precificacao.app` |
| Nome exibido | Calculadora Precificação |
| Team (Apple Developer) | `JD65CCS858` |
| Dispositivos | Universal — iPhone + iPad (`TARGETED_DEVICE_FAMILY = "1,2"`) |
| Deployment target | iOS 17.6 (Podfile declara `platform :ios, '15.0'`) |
| Capacitor | `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli` 7.4.x — **sem plugins** extras |
| Código web embutido | `App/App/public/` (cópia do branch `precificacao/v2` da web) |
| Versão / build | Committed no `release/1.2`: **1.2, build 9**. A cópia local do Rafael tem `MARKETING_VERSION = 1.2.1` e `CURRENT_PROJECT_VERSION = 10` **ainda não commitados** no `project.pbxproj` |

## Documentos

| Arquivo | Conteúdo |
|---|---|
| [arquitetura.md](arquitetura.md) | Projeto Xcode, Capacitor, como a web detecta o app, limitações do WKWebView e soluções, offline, armazenamento, API |
| [fluxo-de-atualizacao.md](fluxo-de-atualizacao.md) | Da mudança na web até o build no Xcode (sync, commits, build number, conferência) e armadilhas |
| [publicacao-app-store.md](publicacao-app-store.md) | Archive, TestFlight, App Store Connect, conta de revisão, rejeições anteriores, checklist |
| [solucao-de-problemas.md](solucao-de-problemas.md) | Problemas conhecidos e como foram resolvidos |

## Documentação relacionada

- App web (telas, managers, cálculos): `precificacao-cloud/docs/`
- API (rotas, banco, integrações): `precificacao-api/docs/`
- Vendas / licenças: `precificacao-vendas/docs/` e `precificacao-vendas-api/docs/`

## Começo rápido

```bash
# 1. trazer a web atual para dentro do app (copia do branch precificacao/v2)
bash sync-ios-com-web.sh            # na pasta precificacao/

# 2. commitar o bundle no repositório do iOS
cd precificacao-ios/ios/App && git status && git add App/public && git commit -m "..."

# 3. abrir no Xcode (sempre o workspace, ícone branco)
open App.xcworkspace
```

> O `README.md` da raiz de `precificacao-ios/` é o original gerado pelo Capacitor e está
> desatualizado (fala em `www/`, `npx cap sync` e iOS 13). Use esta pasta `docs/`.
