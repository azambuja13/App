# Publicação na App Store

Dados fixos: bundle `com.precificacao.app` · Team `JD65CCS858` · universal (iPhone + iPad) ·
iOS 17.6+ · categoria Negócios (secundária Produtividade) · idioma principal pt-BR.
Política de privacidade: https://www.chefazambuja.com/privacy-policy.html ·
Suporte: https://www.chefazambuja.com/suporte.html.

## Ordem de publicação de uma versão

1. **Backend e web primeiro** (o app usa a API de produção):
   `bash publicar-staging.sh` → testar → `bash publicar-producao.sh`
   (API `staging → main`, espera o deploy no Railway, depois web).
2. **Bundle do iOS** atualizado e commitado ([fluxo-de-atualizacao.md](fluxo-de-atualizacao.md)).
3. **`bash publicar-ios-1.2.sh`** (pasta `precificacao/`): move locks órfãos, recusa se houver
   mudanças não commitadas (fora `_to_delete`), faz checkout de `release/1.2` e `push`.
   ⚠️ O script considera o `project.pbxproj` modificado como "mudança não salva" — commite a
   versão/build antes.
4. **Archive no Xcode** (abaixo) → **TestFlight** → **enviar para revisão**.

## Archive e upload (Xcode)

1. Abrir `precificacao-ios/ios/App/App.xcworkspace` (ícone branco; aparecem `App` e `Pods`).
2. Alvo App → General → Identity: **Version** e **Build** (build maior que o último enviado).
3. Destino: **Any iOS Device (arm64)** (não simulador).
4. **Product → Archive**.
5. Organizer (Window → Organizer) → arquivo mais recente → **Distribute App → App Store Connect →
   Upload** → opções padrão.
6. Signing: "Automatically manage signing" ligado; no Archive o Xcode usa "Apple Distribution"
   sozinho. Erro "Your team has no devices / No profiles" ao rodar no aparelho = destino genérico
   selecionado; escolha o iPhone conectado (é só o perfil de desenvolvimento, não afeta o Archive).
7. A Apple exige builds feitos com o Xcode/SDK atual (desde 28/04/2026: Xcode 26+). Confira em
   Xcode → About Xcode.

## TestFlight
- O build aparece em TestFlight depois do processamento (e-mail da Apple, 15–60 min).
- Testador interno → instalar pelo app TestFlight → testar o fluxo completo: login, Pratos,
  Cardápio → lista de compras, Itens, Propostas → Visualizar → Imprimir (PDF pelo compartilhar),
  ficha técnica, Eventos, iPad em pé e deitado.

## App Store Connect
- App ID e registro do app já existem (`com.precificacao.app`). Para versão nova: **+ Versão**
  (ex.: 1.2) → selecionar o build → "O que há de novo" → enviar.
- Uma versão em análise precisa ser aprovada ou cancelada antes de enviar outra.
- Imagens: prints iPhone 6.9" (1320×2868) e iPad 13" (2064×2752), geradas com dados fictícios
  ("Buffet Sabor & Brasa") — arquivo `precificacao/imagens-app-store.zip`.
- App Privacy: coleta só dados de contato dos clientes do próprio negócio, vinculados ao usuário,
  sem rastreamento nem publicidade.
- Textos da ficha (descrição, palavras-chave, notas ao revisor): doc do projeto
  `guia-publicacao-app-store.md`.

## Conta de revisão da Apple
- Existe uma conta de demonstração dedicada à revisão (conta de suporte da empresa), plano Premium,
  com dados de exemplo (cliente, pratos, cardápio, proposta). A senha **não** fica em documento
  nem no repositório: está só no campo *App Review Information* do App Store Connect (e com o
  Rafael).
- **Não usar essa conta para testes nem apagar dados dela.** Antes de cada envio: entrar com ela
  no app e conferir que funciona.

## Regras da Apple que já afetaram o app

| Regra | Situação e solução |
|---|---|
| **3.1.1 / 3.1.3(b)** — compra fora do app | No app nativo não há botão, preço nem link de compra (`window.isNativeApp()` esconde em `LicenseActivation`, `FeatureGate`, `UpgradeModal`, alertas e selo do plano). O app só faz login com conta comprada no site (serviço multiplataforma). Qualquer tela nova que fale de plano/preço precisa respeitar isso |
| **2.1(b)** — modelo de negócio (10/10/2026, versão 1.0 build 3) | Respondido por mensagem, sem build novo: usuários são profissionais de buffet/eventos; compra só no site; planos Offline/Standard/Premium; contas criadas no site (compra ou teste de 7 dias); venda para empresas. Texto completo: doc do projeto `resposta-apple-2-1b.md` |
| Ícone placeholder do Capacitor | Substituído por ícone próprio (1024×1024, sem alfa) |
| Permissões de câmera/fotos | `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` no Info.plist |
| Criptografia | `ITSAppUsesNonExemptEncryption = false` |
| Privacy Manifest | Não precisa de um próprio: o app não usa APIs que exigem declaração; os pods do Capacitor já trazem `PrivacyInfo.xcprivacy` |

## Checklist antes de enviar
- [ ] API e web publicadas em produção e testadas.
- [ ] `sync-ios-com-web.sh` rodado; bundle igual à web (conferência em fluxo-de-atualizacao.md).
- [ ] Version/Build ajustados e `project.pbxproj` commitado; `release/1.2` (ou branch da versão) no GitHub.
- [ ] Nenhum texto de compra/preço visível no app (testar Pratos, Cardápio, Ingredientes, login).
- [ ] Imprimir proposta, ficha técnica, lista de compras, cardápio salvo e exportar pratos geram arquivo pelo compartilhar (um arquivo só, sem `.txt` extra).
- [ ] iPhone e iPad (em pé e deitado) sem conteúdo cortado.
- [ ] Conta de revisão entra e está Premium com dados de exemplo.
- [ ] Testado via TestFlight.
