# Neon Léxico

Palavras cruzadas em português com visual cyberpunk, grades de revista e aplicativo Android nativo.

[Jogar](https://danieltr048.github.io/neon-lexico/) · [Baixar APK Android](https://danieltr048.github.io/neon-lexico/android/neon-lexico.apk)

## Jogar e progredir

São 300 fases: 100 de Palavras cruzadas, 100 de Clássico e 100 de Efeito cascata. Cada fase sorteia cinco temas de um catálogo de 44 temas. Nas primeiras fases, as pistas são diretas e as palavras têm até seis letras. Conforme você avança, entram palavras mais longas, assuntos mais difíceis e tabuleiros maiores: os dois modos de cruzadas crescem de 12 a 30 respostas; Cascata de 5 a 14 linhas.

Em Palavras cruzadas, selecione uma pista ou toque na grade numerada, digite a resposta e confirme. As casas compartilhadas mostram a mesma letra nas duas palavras. No Clássico, as pistas ficam dentro das casas cinza, com setas horizontais e verticais, em uma grade de revista de tamanho fixo (10 × 13) totalmente preenchida com palavras de todo o catálogo; os cinco temas sorteados têm prioridade, e a dificuldade das palavras sobe com as fases. As letras ficam livres para edição e a conferência só libera quando toda a grade está preenchida. Se houver algum erro, o jogo pede para revisar sem identificar casas ou palavras erradas. Na Cascata, letras de uma resposta correta aparecem em todas as linhas abaixo.

Nos três modos, toque na casa e digite diretamente na grade, sem outro campo de resposta. O cursor começa na casa escolhida e avança conforme você escreve. No celular, a pista selecionada permanece abaixo da grade e acima do teclado; tocar novamente em um cruzamento alterna entre horizontal e vertical. Use a seta para recolher o teclado e explorar o tabuleiro. Esse fluxo também está disponível no aplicativo Android.

Cada fase permite **três dicas**. Uma dica revela uma letra e ajuda imediatamente nos cruzamentos; na Cascata, revela todas as ocorrências dessa letra nas linhas inferiores, mesmo antes de resolver a palavra. O limite persiste ao fechar e reabrir o jogo. Dicas e erros afetam estrelas e pontuação; não há vidas ou contagem regressiva. Rejogar uma fase concluída preserva os melhores resultados.

As fases são geradas de forma determinística a partir da campanha: palavras e pistas podem se repetir em fases diferentes. O jogo não usa IA online para montar partidas.

## Daniel e Larissa

Escolha seu perfil na entrada. Campanhas, partidas, pontuação e preferências são individuais. O progresso antigo do navegador pertence a Daniel. Trocar de perfil salva a partida atual.

Em **Conectar aparelhos**, crie um código LEX- no primeiro aparelho e cole o mesmo código no outro, incluindo o aplicativo Android. Escolha o mesmo perfil para continuar aquela campanha. O código também pode ser o usado no Lexicon Caça-palavras: cada jogo guarda sua campanha separadamente. Guarde o código com vocês; ele dá acesso aos dois perfis.

O jogo salva localmente mesmo offline. Com conexão, envia as alterações e busca progresso remoto. Se dois aparelhos tiverem campanhas diferentes, pede qual continuar e guarda uma cópia da outra antes da substituição. Use exportar/importar JSON nas configurações para manter um backup adicional. Limpar os dados do navegador remove os salvamentos locais; reconecte o código para recuperar o que foi sincronizado.

## Android e offline

O APK é um aplicativo Kotlin/Jetpack Compose, com interface e motor nativos. A versão 1.2.0 mostra o tabuleiro inteiro na tela (pinça ou botão ZOOM para ampliar) e usa um teclado próprio do jogo, sem abrir o teclado do celular sobre a grade. Letras já desbloqueadas são puladas ao digitar. Para atualizar, baixe pelo botão da seleção de perfis e instale sobre a versão anterior, sem desinstalar: os perfis e o progresso permanecem. O Android pode pedir autorização para instalar aplicativos pelo navegador. O download não instala automaticamente.

A versão web também funciona offline após uma primeira abertura online completa. No Android, pode ser instalada como PWA pelo navegador; no iPhone, use Compartilhar → Adicionar à Tela de Início. A instalação nativa é detalhada em [android-native/README.md](android-native/README.md).

## Desenvolvimento

Use Node.js 20.19+ ou 22.12+. Abra `INICIAR.bat` ou execute:

```powershell
npm ci
npm run dev -- --strictPort
```

Desenvolvimento: `http://localhost:5185`. Build e prévia:

```powershell
npm run build
npm run preview -- --port 4185 --strictPort
```

O build gera `dist/`, com caminhos relativos compatíveis com subpastas do GitHub Pages. Publicação usa o workflow manual `Publish Neon Lexico`. O cache offline recebe uma identidade nova por build para carregar atualizações.

## Verificação

```powershell
npm test
npm run build
npm run test:e2e
./android-native/BUILD-ANDROID.ps1 -Release
```

Testes cobrem as 300 fases, várias sementes, legalidade dos cruzamentos e das pistas embutidas, conferência da grade completa, curva de dificuldade, limite e propagação de dicas, persistência e backups. Playwright exercita desktop e celular emulado, digitação na casa escolhida, perfis, conflitos de sincronização e abertura offline. Android usa testes de domínio e Compose/Robolectric, paridade de partidas e formato de salvamento com a versão web. A emulação não substitui a instalação em um aparelho físico.

Arquivos principais: `src/content.ts`, `src/engine.ts`, `src/storage.ts`, `src/sync.ts`, `src/main.ts` e `android-native/`. O serviço compartilhado de sincronização fica no repositório [Lexicon](https://github.com/DanielTR048/lexicon), com armazenamento separado por jogo e perfil.
