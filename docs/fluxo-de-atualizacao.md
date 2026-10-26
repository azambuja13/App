# Fluxo de atualização (web → iOS → Xcode)

Desde 07/10/2026 o app iOS tem **exatamente o mesmo código** da web. Nunca edite
`App/App/public/` direto: toda mudança nasce na web e é copiada.

## Passo a passo

### 1. Mudar e commitar na web
- Repositório `precificacao-cloud`, branch **`main`** (produção; `publicar-producao.sh` leva
  `staging` → `main`).
- Ao mudar um `.js` carregado pelo `index.html`, suba o `?v=` daquele `<script>` (cache do navegador).
- Arquivo novo em `utils/`, `vendor/`… precisa da tag `<script>` no `index.html`.

### 2. Copiar para o app — `bash sync-ios-com-web.sh` (pasta `precificacao/`)
O script:
1. Faz `git archive main` do `precificacao-cloud` para uma pasta temporária
   (outro branch: `WEB_BRANCH=main bash sync-ios-com-web.sh`; de uma pasta qualquer:
   `WEB_SRC=/caminho bash sync-ios-com-web.sh`).
2. Copia com `rsync -a` as pastas `adapters config constants core services styles ui ui-compiled
   utils manual vendor fonts` e os arquivos soltos da raiz (`index.html`, `api-client.js`,
   `init-managers.js`, `session-auth.js`, `mobile-optimizations.css`, `MANUAL-DO-USUARIO.md`…) para
   `precificacao-ios/ios/App/App/public/`.
3. Ignora cópias de conflito do iCloud (`* 2.js`, `* 3/`), `*.backup*` e `.DS_Store`.
4. Não apaga nada que só existe no iOS (`cordova.js`, plugins do Capacitor etc.).

**Por que do branch e não da pasta:** a pasta `precificacao-cloud` do Mac costuma estar em outro
branch (ex.: `staging`), com arquivos antigos. A versão anterior do script copiava da pasta e, em
out/2026, sobrescreveu o bundle do iOS com arquivos antigos (incluindo um `index.html` sem
`pricing-rules.js`/`support-rules.js`/`offline-cache.js`). Copiando do branch isso não acontece.

### 3. Commitar no repositório do iOS
```bash
cd precificacao-ios/ios/App
git status --short              # deve listar só App/public/... (e o pbxproj se você mudou versão)
git add App/public
git commit -m "release 1.2: <o que mudou> — igual à web"
git push origin release/1.2
```

### 4. Build no Xcode
- `open App.xcworkspace` → alvo **App**.
- Rodar no aparelho: escolha o iPhone (não "Any iOS Device") e ▶️. Para publicar, ver
  [publicacao-app-store.md](publicacao-app-store.md).
- Se o app parecer não ter mudado: Product → Clean Build Folder (⇧⌘K) e, se persistir, apague o
  app do aparelho antes de instalar de novo (cache do WKWebView).

## Versão e build number
- Xcode → alvo App → General → Identity:
  - **Version** (`MARKETING_VERSION`): muda só quando é versão nova na loja (1.2 → 1.2.1).
  - **Build** (`CURRENT_PROJECT_VERSION`): **tem que aumentar a cada envio** ao App Store Connect
    (9 → 10 → 11…), mesmo dentro da mesma versão.
- A mudança fica no `App.xcodeproj/project.pbxproj` — commite junto
  (`git add App.xcodeproj/project.pbxproj`). Hoje há 1.2.1 / build 10 só na cópia local do Mac.
- Atualize também os textos de `publicar-ios-1.2.sh` se mudar a versão/build.

## Conferir que o bundle está igual à web
Compare os blobs do git (rápido e exato):

```bash
WEB=~/…/precificacao/precificacao-cloud
IOS=~/…/precificacao/precificacao-ios/ios/App
for f in $(git -C "$WEB" ls-tree -r --name-only main -- ui-compiled utils ui core config adapters services vendor index.html api-client.js | grep -v ' [0-9]'); do
  a=$(git -C "$WEB" rev-parse "main:$f")
  b=$(git -C "$IOS" rev-parse "HEAD:App/public/$f" 2>/dev/null)
  [ "$a" = "$b" ] || echo "DIFERENTE: $f"
done
```
Sem saída = idêntico. Rodar `sync-ios-com-web.sh` logo depois de um commit bem feito também não
deve gerar nenhuma mudança (`git status` limpo, salvo o `project.pbxproj`).

## Armadilhas conhecidas

| Problema | Como evitar / resolver |
|---|---|
| Pasta local da web em outro branch | O sync já usa o branch; não copie arquivos da pasta à mão |
| `git` no iCloud deixa `*.lock` (`index.lock`, `HEAD.lock`, `refs/heads/…lock`) e o próximo comando falha com "File exists" | Mover os locks órfãos para a **raiz** de `.git/` (ex.: `mv .git/index.lock .git/stale-index.lock`). **Nunca** deixá-los dentro de `.git/refs/` (o git tenta ler como ref: `bad object refs/...lock.bak`) |
| Objetos do git "só na nuvem" (iCloud) → `Bus error` / `Resource deadlock avoided` | Baixar a pasta no Finder ("Manter baixado") antes de operar o git |
| Arquivos `nome 2.js`, `App 2.xcodeproj` (conflito de sincronização do iCloud) | Não são usados. O sync os ignora; podem ser movidos para `_to_delete/` |
| `git add -A` com a pasta cheia de lixo | Adicionar só `App/public` e o `pbxproj`; `_to_delete/` fica sem commit |
| Commitar com índice vazio / desatualizado no iCloud | Rode `git status` (e `git reset -q` se o índice estiver estranho) antes de `git add` |
| `npx cap sync` / `npx cap copy` | Não usar: copiam a pasta `www/` antiga por cima de `App/public/` |
| Pasta `precificacao-ios/_git_init_errado_ignorar/` | Um `git init` feito por engano na raiz; ignorar. O repositório real é `ios/App/.git` |
| `App/Info.plist` modificado localmente pelo Xcode | Confira o diff antes de commitar; não misture com mudanças de bundle |
