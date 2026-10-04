import type { Theme } from './types';

// Pistas autorais. A resposta usa A–Z para funcionar no teclado e nas interseções.
// Formato editorial: RESPOSTA | dificuldade (1–3) | pista.
function theme(id: string, name: string, icon: string, description: string, words: string): Theme {
  return {
    id, name, icon, description,
    entries: words.trim().split('\n').map((line, index) => {
      const [answer, difficulty, clue] = line.trim().split('|');
      return { id: `${id}-${index + 1}`, answer, clue, difficulty: Number(difficulty) as 1 | 2 | 3 };
    }),
  };
}

export const themes: Theme[] = [
  theme('marvel', 'Universo Marvel', 'atom', 'Máscaras, mutantes e uma equipe extraordinária.', `
THOR|1|Herói de Asgard que empunha o martelo Mjolnir.
HULK|1|Alter ego verde de Bruce Banner.
STARK|1|Sobrenome do inventor que se torna o Homem de Ferro.
WAKANDA|2|Reino africano fictício protegido pelo Pantera Negra.
LOKI|1|Irmão adotivo de Thor, associado à trapaça.
GROOT|1|Integrante dos Guardiões da Galáxia com aparência de árvore.
ROCKET|2|Guaxinim falante dos Guardiões da Galáxia.
VENOM|1|Simbionte alienígena conhecido por se unir a Eddie Brock.
MUTANTE|1|Indivíduo cujo gene X origina poderes no universo dos X-Men.
VIBRANIUM|2|Metal fictício que absorve vibrações, abundante em Wakanda.
ASGARD|2|Reino mítico que é o lar de Thor nas histórias da Marvel.
MJOLNIR|3|Nome do martelo encantado de Thor.
LOGAN|2|Nome pelo qual Wolverine também é conhecido.
SCOTT|2|Primeiro nome de Summers, o Ciclope dos X-Men.
XAVIER|2|Sobrenome do professor que fundou os X-Men.
MAGNETO|1|Mutante capaz de controlar campos magnéticos.
THANOS|1|Titã que busca reunir as Joias do Infinito.
ULTRON|2|Vilão robótico que enfrenta os Vingadores.
ELEKTRA|3|Assassina ninja associada às histórias do Demolidor.
MYSTIQUE|3|Codinome em inglês da mutante azul Raven Darkhölme, capaz de mudar de aparência.
`),
  theme('dc', 'Lendas da DC', 'shield', 'Detetives, amazonas e símbolos de esperança.', `
BATMAN|1|Herói de Gotham cuja identidade civil é Bruce Wayne.
SUPERMAN|1|Herói criado em Smallville e nascido em Krypton.
GOTHAM|1|Cidade fictícia protegida pelo Cavaleiro das Trevas.
KRYPTON|2|Planeta natal de Kal-El.
FLASH|1|Identidade heroica compartilhada por Barry Allen e Wally West.
DIANA|1|Primeiro nome da Mulher-Maravilha.
AQUAMAN|1|Herói atlante também conhecido como Arthur Curry.
ROBIN|1|Título usado por jovens parceiros do Batman.
CORINGA|1|Vilão de Gotham que costuma usar maquiagem de palhaço.
ALFRED|2|Primeiro nome do mordomo da família Wayne.
LEX|2|Primeiro nome de Luthor, adversário de Superman.
MERA|2|Heroína atlante capaz de manipular água, parceira de Aquaman.
SHAZAM|2|Palavra mágica que transforma Billy Batson em um herói adulto.
CYBORG|2|Nome heroico em inglês de Victor Stone, com partes do corpo cibernéticas.
RAVENA|2|Integrante dos Titãs, filha do demônio Trigon.
ESTELAR|2|Nome brasileiro da princesa alienígena Koriand'r.
ARLEQUINA|1|Nome brasileiro da personagem também chamada Harley Quinn.
CHARADA|1|Vilão do Batman obcecado por enigmas.
BANE|2|Vilão mascarado que quebrou a coluna de Batman nos quadrinhos.
ZATANNA|3|Heroína ilusionista que costuma pronunciar encantamentos ao contrário.
`),
  theme('superpoderes', 'Manual do Herói', 'bolt', 'Poderes, identidades secretas e grandes aventuras.', `
CAPA|1|Peça de tecido que muitos heróis usam presa aos ombros.
MASCARA|1|Acessório que esconde o rosto de uma identidade secreta.
ESCUDO|1|Arma defensiva circular usada pelo Capitão América.
TELEPATIA|2|Poder fictício de ler ou transmitir pensamentos.
TELECINESE|2|Poder fictício de mover objetos apenas com a mente.
VOO|1|Poder de atravessar o céu sem veículo ou asas mecânicas.
INVISIBILIDADE|2|Poder de deixar o corpo impossível de ser visto.
REGENERACAO|2|Capacidade de reconstruir tecidos lesionados, exagerada em Wolverine.
VELOCIDADE|1|Grandeza que o poder do Flash eleva a níveis extraordinários.
FORCA|1|Atributo muscular que permite a Hulk erguer objetos extremamente pesados.
ARANHA|1|Animal cuja picada dá origem aos poderes de Peter Parker.
RAIO|1|Descarga elétrica representada no símbolo do Flash.
ARMADURA|1|Traje metálico de combate do Homem de Ferro.
MULTIVERSO|2|Conjunto de universos paralelos nas histórias de ficção.
ANTIHEROI|2|Protagonista que foge do modelo moral do herói tradicional.
ALIADO|1|Quem se une a um herói para enfrentar o mesmo adversário.
VILAO|1|Personagem que costuma criar os conflitos de uma aventura heroica.
ORIGEM|1|Tipo de história que explica como alguém se tornou herói.
JUSTICA|2|Ideal de dar a cada pessoa o que lhe é devido, buscado por heróis.
PROTECAO|2|Ato de defender alguém de um perigo.
`),
  theme('cinema', 'Cinema & Ficção', 'film', 'Da cabine de projeção aos universos imaginários.', `
ROTEIRO|1|Texto que organiza cenas, falas e ações de um filme.
ELENCO|1|Conjunto de atores e atrizes de uma produção.
DIRETOR|1|Profissional que conduz as escolhas artísticas de um filme.
TRILHA|1|Complete: a música de um filme compõe sua ___ sonora.
CLAQUETE|2|Instrumento batido diante da câmera para identificar uma tomada.
CENA|1|Unidade dramática de um filme que reúne uma ação.
PLANO|2|Trecho filmado entre o início e o fim de uma tomada.
MONTAGEM|2|Processo de selecionar e organizar os planos de um filme.
DUBLAGEM|1|Gravação de vozes que substitui falas originais, inclusive em traduções.
LEGENDA|1|Texto na tela que traduz ou transcreve uma fala.
ANIMACAO|1|Técnica que cria movimento pela exibição sequencial de imagens.
DOCUMENTARIO|2|Gênero cinematográfico que aborda pessoas ou fatos reais.
SUSPENSE|1|Gênero que mantém o público na expectativa de um perigo.
FAROESTE|1|Gênero com cowboys e histórias do velho oeste americano.
CURTA|2|Nome informal de um filme de pequena duração.
FIGURINO|1|Conjunto de roupas usadas pelos personagens de uma produção.
CENARIO|1|Ambiente construído ou escolhido para uma cena.
EFEITO|1|Complete: um recurso visual extraordinário é um ___ especial.
PROJECAO|2|Exibição de imagens ampliadas numa tela de cinema.
STOPMOTION|3|Técnica que anima objetos reais fotografados quadro a quadro.
`),
  theme('programacao', 'Código-Fonte', 'code', 'Variáveis, funções e ideias que viram programas.', `
VARIAVEL|1|Nome associado a um valor que pode mudar durante um programa.
FUNCAO|1|Bloco reutilizável de código que pode receber argumentos.
CLASSE|2|Modelo para criar objetos na programação orientada a objetos.
OBJETO|1|Instância de uma classe na programação orientada a objetos.
STRING|1|Nome inglês do tipo usado para representar texto.
BOOLEANO|2|Tipo de dado que admite verdadeiro ou falso.
INTEIRO|1|Tipo numérico usado para valores sem parte fracionária.
ARRAY|1|Estrutura indexada também conhecida como vetor em muitas linguagens.
LOOP|1|Termo inglês para uma repetição de instruções.
COMPILADOR|2|Programa que traduz código-fonte para outra representação executável.
SINTAXE|2|Conjunto de regras de escrita de uma linguagem de programação.
DEBUG|1|Termo inglês associado à investigação de defeitos em um programa.
EXCECAO|2|Ocorrência tratável que interrompe o fluxo normal de execução.
RECURSAO|3|Técnica em que uma função chama a si mesma.
HERANCA|2|Mecanismo pelo qual uma classe deriva características de outra.
ESCOPO|2|Região do código onde um identificador pode ser acessado.
CONSTANTE|1|Valor nomeado que não deve ser reatribuído após sua definição.
RETORNO|1|Valor que uma função devolve a quem a chamou.
PARAMETRO|2|Nome declarado por uma função para receber um argumento.
ITERACAO|2|Cada execução de um bloco repetido por um laço.
`),
  theme('web', 'Arquitetos da Web', 'globe', 'Páginas, navegadores e interfaces conectadas.', `
HTML|1|Linguagem de marcação usada para estruturar páginas da web.
CSS|1|Linguagem de folhas de estilo usada para apresentar páginas.
JAVASCRIPT|1|Linguagem de programação executada diretamente pelos navegadores.
NAVEGADOR|1|Programa usado para visitar páginas da internet.
LINK|1|Elemento clicável que leva a outro endereço ou seção.
FORMULARIO|1|Conjunto de campos que recolhe dados de uma pessoa.
BOTAO|1|Controle de interface pressionado para executar uma ação.
DOM|2|Modelo de objetos que representa a estrutura de uma página.
COOKIE|2|Pequeno dado que um site pode armazenar no navegador.
CACHE|2|Armazenamento de dados para acelerar acessos posteriores.
FRONTEND|2|Camada de uma aplicação com a qual o usuário interage.
BACKEND|2|Camada da aplicação que executa regras e operações no servidor.
RESPONSIVO|2|Adjetivo de um layout que se adapta a diferentes telas.
SEMANTICA|3|Propriedade da marcação que expressa o significado de cada elemento.
ACESSIBILIDADE|2|Qualidade de uma interface utilizável por pessoas com diferentes capacidades.
VIEWPORT|3|Nome inglês da área visível de uma página no navegador.
FAVICON|2|Pequeno ícone de site exibido na aba do navegador.
LOCALSTORAGE|3|API do navegador que guarda pares de chave e valor entre sessões.
FETCH|3|API JavaScript usada para iniciar requisições de recursos pela rede.
ROTA|2|Caminho que identifica uma página ou recurso numa aplicação.
`),
  theme('hardware', 'Dentro da Máquina', 'chip', 'Hardware e engenharia de computação por dentro.', `
PROCESSADOR|1|Componente que interpreta e executa instruções de um computador.
MEMORIA|1|Complete: a RAM é um tipo de ___ de acesso aleatório.
PLACA|1|Complete: a ___-mãe conecta os principais componentes do computador.
TECLADO|1|Periférico de entrada com teclas de letras e números.
MOUSE|1|Periférico usado para mover o cursor e clicar.
MONITOR|1|Dispositivo que mostra a imagem gerada pelo computador.
GABINETE|1|Estrutura que abriga as peças internas de um computador de mesa.
FONTE|1|Componente que fornece energia elétrica adequada às peças do computador.
SSD|1|Unidade de armazenamento sem partes móveis, baseada em memória flash.
GPU|2|Sigla da unidade especializada no processamento de gráficos.
CPU|1|Sigla inglesa da unidade central de processamento.
RAM|1|Sigla da memória volátil usada pelos programas em execução.
BIOS|2|Firmware tradicional que inicializa componentes antes do sistema operacional.
SOQUETE|2|Encaixe da placa-mãe onde se instala um processador compatível.
BARRAMENTO|3|Caminho de comunicação compartilhado entre componentes de um computador.
DISSIPADOR|2|Peça metálica que ajuda a transferir calor de um componente.
VENTOINHA|1|Componente com hélices que movimenta ar para resfriar o computador.
TRANSISTOR|2|Componente semicondutor que pode funcionar como chave ou amplificador.
PERIFERICO|2|Categoria de dispositivo como teclado, mouse ou impressora.
FIRMWARE|3|Software de baixo nível gravado para controlar um dispositivo.
`),
  theme('redes', 'Redes & Conexões', 'network', 'Pacotes em trânsito pela cidade digital.', `
ROTEADOR|1|Equipamento que encaminha pacotes entre redes distintas.
SWITCH|2|Equipamento que conecta dispositivos numa rede local usando endereços MAC.
MODEM|1|Equipamento cujo nome vem de modulador e demodulador.
SERVIDOR|1|Computador ou programa que fornece serviços a outros dispositivos.
CLIENTE|1|Programa que solicita um serviço a outro numa arquitetura de rede.
PACOTE|2|Unidade de dados transmitida por uma rede de comutação.
PROTOCOLO|2|Conjunto de regras para a comunicação entre sistemas.
ETHERNET|2|Tecnologia muito usada em redes locais cabeadas.
FIBRA|1|Complete: cabos de ___ óptica transportam sinais de luz.
LATENCIA|2|Atraso entre enviar uma solicitação e perceber sua resposta.
DNS|2|Sistema que associa nomes de domínio a endereços de rede.
TCP|2|Protocolo de transporte orientado à conexão que ordena a entrega de dados.
UDP|3|Protocolo de transporte por datagramas sem garantia de entrega.
HTTPS|1|Versão do protocolo da web protegida por TLS.
PORTA|2|Número lógico que identifica um serviço de transporte numa máquina.
SUBREDE|2|Divisão lógica de uma rede IP maior.
MASCARA|3|Em IPv4, valor que distingue a parte da rede da parte do host.
PING|1|Ferramenta que costuma testar alcance e tempo de resposta na rede.
DOMINIO|1|Nome legível de um endereço da internet, como exemplo.com.
LARGURA|2|Complete: a capacidade de transmissão é a ___ de banda.
`),
  theme('seguranca', 'Segurança Digital', 'lock', 'Identidades, chaves e defesa de informações.', `
SENHA|1|Segredo digitado para demonstrar acesso a uma conta.
TOKEN|2|Credencial digital usada para representar autorização ou autenticação.
CRIPTOGRAFIA|2|Área que transforma dados para protegê-los com técnicas matemáticas.
CHAVE|1|Dado usado por um algoritmo para cifrar ou decifrar informações.
FIREWALL|2|Sistema que filtra tráfego de rede conforme regras definidas.
PHISHING|2|Golpe que imita uma comunicação confiável para roubar informações.
MALWARE|1|Termo geral para software criado com finalidade maliciosa.
RANSOMWARE|3|Tipo de programa malicioso que exige resgate após bloquear dados.
BACKUP|1|Cópia de segurança que permite recuperar arquivos perdidos.
HASH|2|Resultado de uma função que resume dados em um valor de tamanho fixo.
SALT|3|Valor aleatório acrescentado a uma senha antes de gerar seu resumo.
AUTENTICACAO|2|Processo de verificar a identidade de quem tenta acessar um sistema.
AUTORIZACAO|2|Processo de decidir quais ações uma identidade pode realizar.
PRIVACIDADE|1|Proteção do controle sobre informações pessoais.
ASSINATURA|2|Complete: uma ___ digital permite verificar autoria e integridade.
CERTIFICADO|2|Documento digital que associa uma identidade a uma chave pública.
MALICIOSO|2|Adjetivo de um programa criado com a intenção de causar dano.
AUDITORIA|2|Exame sistemático de registros e controles de um sistema.
INTEGRIDADE|2|Propriedade de dados que permanecem corretos e sem alteração indevida.
PERMISSAO|1|Regra que permite a um usuário executar uma ação específica.
`),
  theme('algoritmos', 'Lógica do Código', 'branch', 'Caminhos eficientes entre problemas e soluções.', `
ALGORITMO|1|Sequência finita de passos para resolver um problema.
PILHA|2|Estrutura em que o último elemento inserido é o primeiro removido.
FILA|2|Estrutura em que o primeiro elemento inserido é o primeiro removido.
GRAFO|2|Estrutura formada por vértices e arestas.
ARVORE|2|Grafo conexo sem ciclos, usado em estruturas hierárquicas.
ARESTA|2|Ligação entre dois vértices de um grafo.
VERTICE|2|Ponto de um grafo ao qual podem se conectar arestas.
BUSCA|1|Operação de procurar um elemento numa coleção de dados.
ORDENACAO|1|Processo de organizar elementos conforme um critério comparativo.
BINARIA|2|Tipo de busca que divide repetidamente um intervalo ordenado ao meio.
LINEAR|2|Tipo de busca que examina elementos sequencialmente.
QUICKSORT|3|Algoritmo de ordenação que particiona elementos em torno de um pivô.
MERGESORT|3|Algoritmo de ordenação que divide listas e depois intercala partes ordenadas.
HEAP|3|Estrutura que mantém um extremo de prioridade em sua raiz.
PIVO|2|Elemento de referência usado no particionamento do quicksort.
CICLO|2|Caminho de um grafo que retorna ao vértice de partida.
RAIZ|1|Nó inicial de uma estrutura de dados em árvore.
FOLHA|2|Nó de uma árvore que não possui filhos.
MEMOIZACAO|3|Técnica de guardar resultados de chamadas para evitar cálculos repetidos.
COMPLEXIDADE|3|Medida de como o custo de um algoritmo cresce com a entrada.
`),
  theme('dados', 'Dados & Sistemas', 'database', 'Registros, consultas e organização da informação.', `
TABELA|1|Estrutura de banco relacional organizada em linhas e colunas.
COLUNA|1|Parte vertical de uma tabela que representa um atributo.
REGISTRO|1|Conjunto de valores de uma única linha numa tabela.
CONSULTA|1|Operação usada para buscar informações num banco de dados.
SQL|1|Linguagem usada para consultar e manipular bancos relacionais.
INDICE|2|Estrutura adicional que pode acelerar a localização de registros.
TRANSACAO|2|Conjunto de operações de banco tratado como uma unidade de trabalho.
ESQUEMA|2|Descrição da estrutura de tabelas e relações de um banco.
CHAVE|1|Complete: a ___ primária identifica unicamente uma linha.
RELACAO|2|No modelo relacional, conjunto de tuplas com os mesmos atributos.
TUPLA|3|Nome formal de uma linha no modelo relacional.
JOIN|2|Operação SQL que combina linhas de tabelas relacionadas.
SELECT|1|Comando SQL usado para obter dados.
INSERT|1|Comando SQL usado para acrescentar registros.
UPDATE|1|Comando SQL usado para alterar registros existentes.
DELETE|1|Comando SQL usado para excluir registros.
COMMIT|2|Operação que confirma as alterações de uma transação.
ROLLBACK|2|Operação que desfaz alterações ainda não confirmadas de uma transação.
NORMALIZACAO|3|Organização de tabelas para reduzir redundâncias e anomalias de dados.
REPLICACAO|3|Manutenção de cópias de dados entre instâncias de um sistema.
`),
  theme('automacao', 'Automação', 'flow', 'Gatilhos, rotinas e máquinas que executam tarefas.', `
GATILHO|1|Evento que inicia automaticamente a execução de um fluxo.
FLUXO|1|Sequência organizada de etapas de um processo automatizado.
SENSOR|1|Dispositivo que detecta uma grandeza física do ambiente.
ATUADOR|2|Dispositivo que transforma um comando em ação física.
RELE|2|Chave elétrica acionada por um sinal de controle.
TEMPORIZADOR|1|Dispositivo ou recurso que aciona algo após um intervalo.
CLP|2|Sigla de controlador lógico programável, comum na indústria.
SCADA|3|Sigla de sistema de supervisão e aquisição de dados industriais.
WEBHOOK|2|Notificação HTTP enviada automaticamente quando acontece um evento.
SCRIPT|1|Pequeno programa usado para executar uma sequência de tarefas.
CRON|2|Agendador tradicional de tarefas periódicas em sistemas Unix.
AGENDAMENTO|1|Definição de um horário para uma tarefa acontecer.
ROTINA|1|Sequência de ações executada regularmente.
INTEGRACAO|2|Ligação entre sistemas para que troquem dados e operações.
ORQUESTRACAO|3|Coordenação de várias tarefas automáticas e suas dependências.
IDEMPOTENCIA|3|Propriedade de repetir uma operação sem alterar o resultado final.
TELEMETRIA|2|Coleta e transmissão de medições feitas à distância.
SETPOINT|3|Valor desejado usado como referência num sistema de controle.
RETROACAO|3|Retorno da saída ao controle para corrigir desvios do processo.
ESTEIRA|1|Equipamento contínuo que transporta peças numa linha industrial.
`),
  theme('robotica', 'Robótica', 'bot', 'Braços mecânicos e máquinas em movimento.', `
ROBO|1|Máquina programável que executa ações no ambiente.
SERVO|2|Nome curto de motor controlado para atingir uma posição.
GARRA|1|Peça na ponta de um braço robótico que segura objetos.
JUNTA|2|Articulação que permite movimento entre partes de um robô.
ELO|2|Segmento rígido que conecta duas articulações de um braço mecânico.
LIDAR|3|Sensor que mede distâncias usando pulsos de laser.
SONAR|2|Sistema que mede distâncias ou detecta objetos por ondas sonoras.
ENCODER|3|Sensor que converte posição ou rotação em sinais digitais.
GIROSCOPIO|2|Sensor usado para medir velocidade angular.
ACELEROMETRO|2|Sensor que mede aceleração em um ou mais eixos.
CINEMATICA|3|Estudo do movimento sem considerar as forças que o causam.
TRAJETORIA|1|Caminho percorrido por um robô ou objeto em movimento.
AUTONOMO|1|Adjetivo de um robô que decide ações sem controle humano contínuo.
TELEOPERACAO|3|Controle de uma máquina por uma pessoa à distância.
HUMANOIDE|1|Robô cuja forma lembra a do corpo humano.
DRONE|1|Aeronave que voa sem piloto embarcado.
ROVER|2|Veículo robótico usado para explorar superfícies planetárias.
MOTOR|1|Dispositivo que converte energia em movimento mecânico.
ENGRENAGEM|1|Roda dentada que transmite movimento a outra.
CALIBRACAO|2|Operação que relaciona indicações de um instrumento a valores de padrões de medição.
`),
  theme('ia', 'Inteligência Artificial', 'spark', 'Padrões, modelos e aprendizagem de máquina.', `
MODELO|1|Representação aprendida dos dados usada para fazer previsões.
TREINAMENTO|1|Etapa em que um sistema ajusta seus parâmetros com exemplos.
INFERENCIA|2|Uso de um modelo já treinado para produzir uma saída.
NEURONIO|2|Unidade de cálculo de uma rede neural artificial, inspirada numa célula do cérebro.
CAMADA|1|Conjunto de unidades de uma rede neural no mesmo estágio.
PESO|2|Parâmetro que regula a influência de uma conexão numa rede neural.
VIES|2|Desvio sistemático que pode afetar previsões de um modelo.
GRADIENTE|3|Vetor de derivadas usado para orientar ajustes no treinamento.
PERDA|2|Função que mede o erro a ser reduzido durante o treinamento.
EPOCA|2|Uma passagem completa pelo conjunto de treinamento.
LOTE|2|Grupo de exemplos processado junto durante o treinamento.
TOKEN|2|Unidade de texto processada por muitos modelos de linguagem.
PROMPT|1|Instrução ou entrada fornecida a um modelo generativo.
EMBEDDING|3|Representação numérica vetorial que pode codificar significado.
ATENCAO|3|Mecanismo que pondera a relevância de partes da entrada de um modelo.
REGRESSAO|2|Tarefa de prever um valor numérico contínuo.
CLASSIFICACAO|2|Tarefa de atribuir uma entrada a uma categoria.
AGRUPAMENTO|2|Tarefa de reunir exemplos semelhantes sem classes previamente indicadas.
REFORCO|2|Tipo de aprendizagem em que um agente recebe recompensas por ações.
VALIDACAO|2|Avaliação durante o desenvolvimento com dados separados do treinamento.
`),
  theme('psicologia', 'Psicologia', 'mind', 'Percepção, aprendizagem e comportamento humano.', `
COGNICAO|2|Conjunto de processos mentais envolvidos em conhecer e compreender.
PERCEPCAO|1|Processo de organizar e interpretar informações dos sentidos.
MEMORIA|1|Capacidade de registrar, conservar e recuperar informações.
ATENCAO|1|Processo de selecionar informações para processamento mental.
APRENDIZAGEM|1|Mudança relativamente duradoura produzida por experiência ou prática.
MOTIVACAO|1|Processos que iniciam e orientam um comportamento em direção a uma meta.
PERSONALIDADE|2|Padrões relativamente estáveis de pensar, sentir e agir.
EMPATIA|1|Capacidade de compreender a experiência ou perspectiva de outra pessoa.
EXTROVERSAO|2|Traço de personalidade associado à sociabilidade e à busca de interação.
REFORCO|2|Consequência que aumenta a probabilidade futura de um comportamento.
ESTIMULO|1|Evento do ambiente capaz de influenciar uma resposta.
RESPOSTA|1|Reação de um organismo diante de uma situação ou estímulo.
GESTALT|3|Abordagem conhecida por estudar a percepção de formas como totalidades.
PSICANALISE|2|Abordagem clínica e teórica desenvolvida por Sigmund Freud.
INCONSCIENTE|2|Na teoria freudiana, domínio psíquico que não está diretamente consciente.
INTROSPECCAO|2|Observação que uma pessoa faz de seus próprios estados mentais.
HABITO|1|Comportamento repetido que tende a ocorrer de modo automático.
EXTINCAO|3|Redução de uma resposta aprendida quando o reforço deixa de ocorrer.
ASSOCIACAO|2|Ligação mental estabelecida entre duas ideias ou experiências.
RESILIENCIA|2|Processo de adaptação diante de adversidades significativas.
`),
  theme('emocoes', 'Mapa das Emoções', 'heart', 'Palavras para reconhecer o que sentimos.', `
ALEGRIA|1|Emoção agradável ligada a acontecimentos positivos e celebrações.
TRISTEZA|1|Emoção comum diante de uma perda ou decepção.
MEDO|1|Emoção ligada à percepção de uma ameaça.
RAIVA|1|Emoção que pode surgir diante de uma ofensa ou injustiça.
NOJO|1|Emoção de repulsa que pode ocorrer diante de comida estragada.
SURPRESA|1|Reação emocional a algo inesperado.
SAUDADE|1|Sentimento de falta de alguém, de um lugar ou de um tempo vivido.
ESPERANCA|1|Expectativa de que algo desejado possa acontecer.
ORGULHO|1|Satisfação por uma realização própria ou de alguém querido.
CULPA|2|Sentimento associado à percepção de ter feito algo errado.
VERGONHA|2|Sentimento de exposição ligado à avaliação negativa de si.
GRATIDAO|1|Reconhecimento afetivo por um benefício recebido.
FRUSTRACAO|2|Sentimento que pode surgir quando uma expectativa é impedida.
ENTUSIASMO|1|Animação intensa diante de uma ideia ou atividade.
ALIVIO|1|Sensação agradável quando uma preocupação ou ameaça diminui.
TERNURA|2|Sentimento delicado de carinho e cuidado.
ADMIRACAO|1|Sentimento de apreço pelas qualidades de alguém ou de algo.
INVEJA|2|Descontentamento diante de uma vantagem que outra pessoa possui.
CIUME|2|Sentimento ligado ao temor de perder um vínculo para outra pessoa.
NOSTALGIA|2|Sentimento de saudade idealizada de um período passado.
`),
  theme('neurociencia', 'Cérebro em Rede', 'neuron', 'Sinais elétricos e caminhos da mente.', `
NEURONIO|1|Célula especializada na transmissão de sinais do sistema nervoso.
SINAPSE|2|Região de comunicação entre neurônios ou entre neurônio e outra célula.
AXONIO|2|Prolongamento neuronal que conduz sinais para longe do corpo celular.
DENDRITO|2|Prolongamento neuronal ramificado que costuma receber sinais.
MIELINA|2|Bainha isolante que acelera a condução em muitos axônios.
CEREBELO|2|Estrutura encefálica importante para coordenação e equilíbrio.
HIPOCAMPO|2|Estrutura cerebral importante na formação de memórias declarativas.
AMIGDALA|2|Estrutura cerebral envolvida no processamento de emoções e ameaças.
CORTEX|2|Camada externa de substância cinzenta dos hemisférios cerebrais.
TALAMO|3|Estrutura que retransmite grande parte das informações sensoriais ao córtex.
HIPOTALAMO|3|Estrutura que participa do controle da temperatura, fome e sede.
DOPAMINA|2|Neurotransmissor relacionado, entre outras funções, ao movimento e à recompensa.
SEROTONINA|2|Neurotransmissor também chamado 5-HT, envolvido em múltiplas funções cerebrais.
GLIA|3|Conjunto de células de suporte e regulação do sistema nervoso.
MEDULA|1|Complete: a ___ espinhal fica protegida dentro da coluna vertebral.
REFLEXO|1|Resposta rápida e involuntária a um estímulo.
SONO|1|Estado fisiológico cíclico essencial ao descanso e a processos de memória.
REM|2|Sigla da fase do sono marcada por movimentos rápidos dos olhos.
PLASTICIDADE|3|Capacidade do sistema nervoso de modificar suas conexões e funcionamento.
IMPULSO|1|Complete: o sinal elétrico propagado no neurônio é um ___ nervoso.
`),
  theme('astronomia', 'Além das Estrelas', 'star', 'Planetas, nebulosas e noites de observação.', `
SOL|1|Estrela situada no centro do nosso sistema planetário.
LUA|1|Satélite natural da Terra.
MARTE|1|Planeta conhecido como o planeta vermelho.
VENUS|1|Segundo planeta a partir do Sol.
JUPITER|1|Maior planeta do Sistema Solar.
SATURNO|1|Planeta conhecido por seus anéis muito visíveis.
URANO|2|Sétimo planeta do Sistema Solar, com eixo de rotação muito inclinado.
NETUNO|2|Planeta mais distante do Sol entre os oito reconhecidos.
MERCURIO|1|Planeta mais próximo do Sol.
TERRA|1|Planeta em que vivemos.
GALAXIA|1|Grande conjunto de estrelas, gás e poeira ligado pela gravidade.
NEBULOSA|2|Nuvem de gás e poeira no espaço interestelar.
COMETA|1|Pequeno corpo gelado que pode formar cauda ao se aproximar do Sol.
ASTEROIDE|1|Corpo rochoso menor que um planeta que orbita o Sol.
METEORO|2|Fenômeno luminoso popularmente chamado de estrela cadente.
ECLIPSE|1|Ocultação aparente de um astro pela posição de outro.
ORBITA|1|Trajetória de um corpo ao redor de outro sob ação da gravidade.
QUASAR|3|Núcleo galáctico extremamente luminoso alimentado por um buraco negro.
PULSAR|3|Estrela de nêutrons observada por pulsos regulares de radiação.
SUPERNOVA|2|Explosão estelar extremamente energética.
`),
  theme('espaco', 'Missão Espacial', 'rocket', 'Engenharia e exploração para além da atmosfera.', `
FOGUETE|1|Veículo que se move pela expulsão de gases em alta velocidade.
ASTRONAUTA|1|Pessoa treinada para viajar ao espaço.
CAPSULA|1|Compartimento espacial projetado para transportar tripulação ou carga.
SATELITE|1|Objeto artificial colocado em órbita para comunicação ou observação.
SONDA|1|Veículo não tripulado enviado para investigar corpos celestes.
LANCAMENTO|1|Momento em que um foguete parte de sua plataforma.
PROPULSAO|2|Processo que produz o empuxo para mover uma nave.
EMPUXO|2|Força gerada pela expulsão de massa de um motor-foguete.
APOGEU|3|Ponto de uma órbita terrestre mais distante da Terra.
PERIGEU|3|Ponto de uma órbita terrestre mais próximo da Terra.
REENTRADA|2|Retorno de uma nave à atmosfera de um planeta.
ACOPLAMENTO|2|União controlada de duas naves no espaço.
ESCOTILHA|2|Abertura com tampa usada para entrar numa nave.
TRAJE|1|Complete: astronautas usam um ___ espacial fora da nave.
MODULO|1|Unidade funcional de uma nave ou estação espacial.
APOLLO|2|Programa da NASA que levou seres humanos à Lua em 1969.
SPUTNIK|2|Nome do primeiro satélite artificial colocado em órbita da Terra.
GAGARIN|2|Sobrenome do primeiro ser humano a viajar ao espaço.
ARMSTRONG|2|Sobrenome do primeiro ser humano a pisar na Lua.
MICROGRAVIDADE|3|Condição de queda livre que produz aparente quase ausência de peso.
`),
  theme('fisica', 'Leis da Física', 'wave', 'Movimento, forças, luz e matéria.', `
FORCA|1|Grandeza vetorial associada à alteração do movimento de um corpo.
MASSA|1|Grandeza que mede a inércia de um corpo.
ENERGIA|1|Grandeza conservada que pode assumir formas cinética e potencial.
INERCIA|2|Tendência de um corpo a manter seu estado de movimento.
GRAVIDADE|1|Interação que atrai massas e mantém planetas em órbita.
ATRITO|1|Força que se opõe ao deslizamento entre superfícies em contato.
PRESSAO|1|Força perpendicular por unidade de área.
DENSIDADE|2|Razão entre a massa e o volume de um material.
VELOCIDADE|1|Variação da posição por unidade de tempo.
ACELERACAO|2|Variação da velocidade por unidade de tempo.
TRABALHO|2|Transferência de energia por uma força ao longo de um deslocamento.
POTENCIA|2|Taxa de transferência ou transformação de energia por tempo.
CALOR|1|Energia transferida entre corpos por diferença de temperatura.
TEMPERATURA|1|Grandeza medida por um termômetro.
ONDA|1|Perturbação que se propaga transportando energia.
FREQUENCIA|2|Número de ciclos de um fenômeno periódico por segundo.
REFRACAO|2|Mudança na propagação da luz ao passar entre meios diferentes.
REFLEXAO|1|Retorno da luz ao atingir uma superfície como um espelho.
ENTROPIA|3|Grandeza termodinâmica ligada ao número de microestados possíveis.
FOTON|3|Quantum da radiação eletromagnética.
`),
  theme('quimica', 'Laboratório Químico', 'flask', 'Átomos, ligações e transformações.', `
ATOMO|1|Unidade de um elemento químico com núcleo e elétrons.
PROTON|1|Partícula do núcleo atômico com carga positiva.
NEUTRON|1|Partícula do núcleo atômico sem carga elétrica.
ELETRON|1|Partícula de carga negativa presente ao redor do núcleo atômico.
MOLECULA|1|Conjunto de átomos ligados que forma uma unidade química.
ELEMENTO|1|Substância definida pelo número de prótons de seus átomos.
ISOTOPO|2|Átomo do mesmo elemento que difere no número de nêutrons.
CATALISADOR|2|Substância que acelera uma reação sem ser consumida globalmente.
SOLVENTE|1|Componente de uma solução que dissolve o soluto.
SOLUTO|2|Substância dissolvida em um solvente.
SOLUCAO|1|Mistura homogênea de duas ou mais substâncias.
ACIDO|1|Substância que doa prótons na definição de Brønsted-Lowry.
BASE|1|Substância que recebe prótons na definição de Brønsted-Lowry.
SAL|1|Composto iônico frequentemente formado na neutralização entre ácido e base.
OXIDACAO|2|Processo químico em que uma espécie perde elétrons.
REDUCAO|2|Processo químico em que uma espécie ganha elétrons.
POLIMERO|2|Macromolécula formada pela repetição de unidades menores.
COVALENTE|2|Tipo de ligação química em que átomos compartilham elétrons.
IONICA|2|Tipo de ligação associado à atração entre íons de cargas opostas.
ESTEQUIOMETRIA|3|Estudo das proporções quantitativas numa reação química.
`),
  theme('biologia', 'Código da Vida', 'dna', 'Células, genes e a diversidade dos seres vivos.', `
CELULA|1|Unidade estrutural e funcional básica dos seres vivos.
DNA|1|Molécula que armazena informação genética na maioria dos organismos.
RNA|1|Ácido nucleico que inclui formas mensageira e transportadora.
GENE|1|Segmento de material genético com uma informação funcional.
NUCLEO|1|Compartimento das células eucarióticas que abriga grande parte do DNA.
MITOCONDRIA|2|Organela importante na produção de ATP pela respiração celular.
RIBOSSOMO|2|Estrutura celular que realiza a síntese de proteínas.
MEMBRANA|1|Complete: a ___ plasmática delimita a célula.
CITOPLASMA|2|Região celular entre a membrana plasmática e o núcleo.
FOTOSSINTESE|1|Processo que usa luz para produzir matéria orgânica a partir de carbono inorgânico.
CLOROFILA|2|Pigmento verde que absorve luz na fotossíntese.
ENZIMA|2|Catalisador biológico, geralmente de natureza proteica.
PROTEINA|1|Macromolécula formada por cadeias de aminoácidos.
MITOSE|2|Divisão celular que normalmente preserva o número de cromossomos.
MEIOSE|2|Divisão celular que reduz à metade o número de cromossomos.
EVOLUCAO|1|Mudança de características hereditárias de populações ao longo de gerações.
ESPECIE|1|Unidade de classificação biológica situada abaixo de gênero.
ECOSSISTEMA|2|Conjunto dos seres vivos e fatores físicos em interação num ambiente.
SIMBIOSE|3|Associação íntima e duradoura entre organismos de espécies diferentes.
HOMEOSTASE|3|Manutenção de condições internas relativamente estáveis num organismo.
`),
  theme('matematica', 'Matemática', 'sigma', 'Números, formas e padrões elegantes.', `
SOMA|1|Operação que reúne duas ou mais parcelas num total.
PRODUTO|1|Nome do resultado de uma multiplicação.
QUOCIENTE|2|Nome do resultado de uma divisão.
FRACAO|1|Representação numérica formada por numerador e denominador.
RAIZ|1|Complete: a ___ quadrada de nove é três.
POTENCIA|1|Operação que expressa uma multiplicação repetida de fatores iguais.
EQUACAO|1|Igualdade matemática que envolve uma ou mais incógnitas.
INCOGNITA|2|Valor desconhecido representado por uma letra numa equação.
TRIANGULO|1|Polígono de três lados.
QUADRADO|1|Quadrilátero de quatro lados iguais e quatro ângulos retos.
CIRCULO|1|Região plana limitada por uma circunferência.
DIAMETRO|2|Segmento que atravessa o centro e liga dois pontos da circunferência.
PERIMETRO|2|Soma das medidas dos lados de um polígono.
AREA|1|Medida da superfície de uma figura plana.
VOLUME|1|Medida do espaço ocupado por um sólido.
PRIMO|2|Número inteiro maior que um com exatamente dois divisores positivos.
MATRIZ|2|Arranjo retangular de elementos em linhas e colunas.
DERIVADA|3|Grandeza que expressa a taxa de variação instantânea de uma função.
INTEGRAL|3|Conceito do cálculo que expressa acumulação e permite obter áreas sob curvas.
LOGARITMO|3|Expoente ao qual uma base deve ser elevada para obter certo número.
`),
  theme('engenharia', 'Engenharia Civil', 'bridge', 'Estruturas, obras e soluções que sustentam cidades.', `
VIGA|1|Elemento estrutural geralmente horizontal que suporta cargas transversais.
PILAR|1|Elemento estrutural geralmente vertical que transmite cargas à fundação.
LAJE|1|Elemento estrutural plano que forma pisos ou coberturas.
FUNDACAO|1|Parte da estrutura que transfere as cargas da construção ao solo.
CONCRETO|1|Material obtido pela mistura de cimento, água e agregados.
CIMENTO|1|Aglomerante em pó que reage com água e integra o concreto.
ARGAMASSA|1|Mistura usada para assentar tijolos e revestir paredes.
ARMADURA|2|Conjunto de barras de aço que reforça elementos de concreto.
SAPATA|2|Fundação superficial que distribui a carga de um pilar no terreno.
ESTACA|2|Elemento de fundação profunda cravado ou executado no solo.
TRELICA|2|Estrutura de barras conectadas, frequentemente formando triângulos.
CANTEIRO|1|Área organizada para instalações e atividades de uma obra.
PRUMO|1|Instrumento usado para verificar a verticalidade de uma parede.
NIVEL|1|Instrumento usado para verificar a horizontalidade de uma superfície.
ALVENARIA|1|Sistema construtivo de unidades como tijolos ou blocos unidas por juntas.
DRENAGEM|2|Sistema que coleta e conduz a água para evitar seu acúmulo.
COMPACTACAO|2|Processo que aumenta a densidade de um solo por esforço mecânico.
CISALHAMENTO|3|Esforço que tende a deslizar partes de uma seção em sentidos opostos.
FLEXAO|2|Solicitação estrutural que tende a curvar uma viga.
TORCAO|2|Solicitação que tende a girar seções de uma peça em torno de seu eixo.
`),
  theme('arquitetura', 'Traços & Espaços', 'arch', 'Desenhos, materiais e lugares para viver.', `
PLANTA|1|Desenho de um edifício visto em corte horizontal.
FACHADA|1|Face externa de uma edificação.
CORTE|2|Desenho arquitetônico que mostra o interior após uma seção vertical.
ESCALA|1|Relação entre uma medida no desenho e a medida real.
COTA|2|Indicação numérica de uma dimensão num desenho técnico.
MAQUETE|1|Representação física de uma construção em tamanho reduzido.
CROQUI|1|Esboço rápido, geralmente feito à mão, de uma ideia de projeto.
AMBIENTE|1|Espaço de uma edificação destinado a determinada atividade.
ATRIO|2|Espaço central ou de entrada de um edifício, frequentemente amplo.
CLARABOIA|2|Abertura envidraçada na cobertura para entrada de luz natural.
BRISE|3|Elemento de fachada que protege o interior da incidência direta do sol.
PERGOLADO|2|Estrutura de vigas espaçadas usada para sombrear áreas externas.
BEIRAL|2|Parte do telhado que avança para além da parede externa.
MARQUISE|2|Cobertura em balanço sobre uma entrada ou passagem.
PATAMAR|2|Área plana entre lances de uma escada.
CORRIMAO|1|Barra de apoio instalada ao longo de escadas ou rampas.
ACUSTICA|2|Área que estuda o som e sua propagação nos ambientes.
INSOLACAO|2|Incidência de luz solar direta sobre um edifício ou terreno.
VENTILACAO|1|Renovação e circulação de ar num ambiente.
PAISAGISMO|2|Projeto de espaços livres com vegetação e outros elementos.
`),
  theme('eletronica', 'Circuito Aberto', 'circuit', 'Componentes, medidas e pequenos sinais.', `
RESISTOR|1|Componente usado para limitar corrente e produzir quedas de tensão.
CAPACITOR|2|Componente que armazena energia em um campo elétrico.
INDUTOR|2|Componente que armazena energia em um campo magnético.
DIODO|1|Componente que conduz corrente principalmente em um sentido.
LED|1|Sigla de diodo emissor de luz.
TRANSISTOR|2|Componente semicondutor usado para amplificar ou chavear sinais.
TENSAO|1|Diferença de potencial elétrico entre dois pontos.
CORRENTE|1|Fluxo de carga elétrica por unidade de tempo.
RESISTENCIA|1|Grandeza elétrica medida em ohms.
VOLTIMETRO|2|Instrumento usado para medir diferença de potencial elétrico.
AMPERIMETRO|2|Instrumento usado para medir corrente elétrica.
MULTIMETRO|1|Instrumento que reúne medições como tensão, corrente e resistência.
OSCILOSCOPIO|3|Instrumento que mostra a forma de um sinal ao longo do tempo.
PROTOBOARD|2|Placa de montagem de circuitos sem necessidade de solda.
SOLDA|1|Material ou processo usado para unir terminais a uma placa eletrônica.
TRILHA|2|Caminho condutor de cobre numa placa de circuito impresso.
FUSIVEL|1|Dispositivo que interrompe o circuito ao fundir por excesso de corrente.
POTENCIOMETRO|3|Resistor variável com contato deslizante, comum em controles giratórios.
RETIFICADOR|3|Circuito que converte corrente alternada em corrente unidirecional.
AMPLIFICADOR|2|Circuito que aumenta a amplitude de um sinal.
`),
  theme('cyberpunk', 'Noites de Neon', 'neon', 'Futuro decadente, chuva e tecnologia analógica.', `
NEON|1|Gás nobre cujo nome evoca letreiros luminosos de cidades futuristas.
CIBORGUE|1|Ser que combina partes orgânicas e componentes artificiais.
IMPLANTE|1|Dispositivo inserido no corpo, comum na ficção cibernética.
HOLOGRAMA|2|Imagem produzida por técnica que registra informação tridimensional da luz.
DISTOPIA|2|Sociedade fictícia marcada por opressão ou condições de vida indesejáveis.
MEGACORPORACAO|3|Empresa gigantesca que costuma dominar governos em histórias cyberpunk.
HACKER|1|Pessoa que explora profundamente sistemas computacionais e suas possibilidades.
TERMINAL|1|Interface de texto para enviar comandos a um computador.
CRT|2|Sigla do tubo de raios catódicos dos monitores antigos.
DISQUETE|1|Mídia magnética removível que precedeu a popularização dos pendrives.
CASSETE|1|Fita magnética em cartucho usada em aparelhos de som portáteis.
ANALOGICO|2|Adjetivo de um sinal que varia continuamente.
PIXEL|1|Menor elemento endereçável de uma imagem digital rasterizada.
GLITCH|2|Termo inglês para uma falha breve, também explorada como efeito visual.
SINTETIZADOR|2|Instrumento eletrônico que cria e modifica sons.
METROPOLE|1|Grande cidade que exerce influência sobre uma região.
SUBMUNDO|2|Ambiente social clandestino, frequente em narrativas urbanas sombrias.
CHUVA|1|Água que cai das nuvens, presença frequente em cenários noir.
REPLICANTE|3|Ser humano artificial da ficção de Blade Runner.
DECK|3|Complete o termo inglês para um terminal portátil cyberpunk: cyber___.
`),
  theme('minecraft', 'Mundo de Blocos', 'cube', 'Mineração, construção e aventuras quadradas.', `
CREEPER|1|Criatura verde do Minecraft que se aproxima e explode.
ZUMBI|1|Morto-vivo do Minecraft que queima ao sol sem proteção.
ESQUELETO|1|Inimigo de ossos do Minecraft que usa arco.
ENDERMAN|2|Criatura alta do Minecraft que se teletransporta e carrega blocos.
NETHER|2|Dimensão do Minecraft com muita lava e portais de obsidiana.
END|2|Dimensão do Minecraft onde fica o dragão final.
OBSIDIANA|2|Bloco resistente formado quando água encontra uma fonte de lava no Minecraft.
REDSTONE|1|Material do Minecraft usado para transmitir sinais em circuitos.
DIAMANTE|1|Gema azul-clara usada em ferramentas resistentes no Minecraft.
PICARETA|1|Ferramenta usada para extrair minérios e quebrar pedra no Minecraft.
FORNALHA|1|Bloco do Minecraft usado para fundir minério e cozinhar alimentos.
TOCHA|1|Objeto feito com carvão e graveto que ilumina cavernas no Minecraft.
BAU|1|Bloco do Minecraft que armazena itens em um inventário.
BIGORNA|2|Bloco do Minecraft usado para renomear e combinar equipamentos.
VILLAGER|2|Nome inglês do aldeão do Minecraft que pode oferecer trocas de itens.
BIOMA|1|Região com características próprias, como deserto ou floresta, no Minecraft.
SLIME|2|Criatura gelatinosa que se divide em versões menores ao ser derrotada.
GHAST|2|Criatura flutuante branca do Nether que dispara bolas de fogo.
BLAZE|2|Criatura flamejante das fortalezas do Nether que deixa varas.
ELYTRA|3|Nome em inglês das asas encontradas em navios do End, usadas para planar.
`),
  theme('videogames', 'Arcade Retrô', 'gamepad', 'Controles, fases e lendas do videogame.', `
ARCADE|1|Termo associado a máquinas de videogame operadas por fichas.
JOYSTICK|1|Alavanca de controle usada em jogos e simuladores.
CONSOLE|1|Aparelho dedicado a executar videogames.
CARTUCHO|1|Mídia física encaixada em muitos consoles clássicos.
SPRITE|2|Imagem bidimensional usada como personagem ou objeto num jogo.
PLATAFORMA|1|Gênero em que saltar entre superfícies é uma mecânica central.
PUZZLE|1|Termo inglês para um jogo centrado em resolver quebra-cabeças.
CHECKPOINT|2|Ponto de uma fase a partir do qual o jogador pode recomeçar.
RESPAWN|2|Termo inglês para reaparecer no jogo após ser eliminado.
SCORE|1|Termo inglês para a pontuação de uma partida.
COMBO|1|Sequência de ações encadeadas que aumenta o efeito ou a pontuação.
CHEFE|1|Adversário especialmente forte geralmente encontrado ao final de uma fase.
MARIO|1|Encanador de boné vermelho, irmão de Luigi.
SONIC|1|Ouriço azul conhecido por correr em alta velocidade.
LINK|1|Herói que costuma empunhar a Master Sword em The Legend of Zelda.
SAMUS|2|Primeiro nome da caçadora de recompensas protagonista de Metroid.
TETRIS|1|Jogo em que peças de quatro quadrados formam linhas completas.
PACMAN|1|Personagem amarelo que come pontos num labirinto e foge de fantasmas.
PORTAL|2|Jogo da Valve em que uma arma cria passagens entre duas superfícies.
COOPERATIVO|2|Modo em que jogadores trabalham juntos para atingir um objetivo.
`),
  theme('fantasia', 'Reinos da Fantasia', 'sword', 'Criaturas, jornadas e magia entre páginas.', `
DRAGAO|1|Criatura mítica reptiliana frequentemente representada cuspindo fogo.
ELFO|1|Ser fantástico de orelhas pontudas comum em histórias de fantasia.
ANAO|1|Povo de baixa estatura ligado à mineração na fantasia de Tolkien.
ORC|2|Criatura guerreira comum como adversária em mundos de fantasia.
MAGO|1|Personagem que estuda e pratica artes mágicas.
FEITICO|1|Ato ou fórmula de magia usado para produzir um efeito.
POCAO|1|Mistura mágica líquida preparada para ser bebida.
VARINHA|1|Pequena haste usada para lançar encantamentos em muitas histórias.
GRIMORIO|3|Livro de fórmulas e conhecimentos mágicos.
AMULETO|1|Objeto levado consigo ao qual se atribui poder de proteção.
RUNAS|2|Sinais de antigos alfabetos germânicos usados como símbolos mágicos na fantasia.
ESPADA|1|Arma branca de lâmina longa, comum em aventuras medievais.
ESCUDO|1|Peça de defesa empunhada para bloquear golpes.
ARMADURA|1|Vestimenta de proteção usada por guerreiros.
MASMORRA|1|Prisão subterrânea de um castelo, comum em aventuras.
TABERNA|2|Estabelecimento de bebidas onde aventureiros se encontram em muitas narrativas.
GUILDA|2|Associação de pessoas que exercem um mesmo ofício num mundo medieval.
UNICORNIO|1|Criatura parecida com cavalo que possui um chifre na testa.
FENIX|2|Ave lendária que renasce das próprias cinzas.
GRIFO|3|Criatura com corpo de leão e cabeça e asas de águia.
`),
  theme('mitologia', 'Mitos & Deuses', 'temple', 'Narrativas antigas e criaturas lendárias.', `
ZEUS|1|Deus grego do céu e dos raios.
HERA|2|Deusa grega ligada ao casamento, esposa de Zeus.
ATENA|1|Deusa grega associada à sabedoria e à estratégia.
APOLO|1|Deus grego associado à música e às artes.
ARTEMIS|2|Deusa grega da caça, irmã gêmea de Apolo.
HERMES|2|Mensageiro dos deuses gregos, associado aos viajantes.
POSEIDON|1|Deus grego dos mares, geralmente representado com tridente.
HADES|1|Deus grego que governa o mundo dos mortos.
AFRODITE|1|Deusa grega do amor e da beleza.
ARES|2|Deus grego ligado ao combate e à guerra.
HEFESTO|2|Deus grego do fogo e da forja.
DEMETER|2|Deusa grega associada à agricultura e às colheitas.
ODIN|2|Deus nórdico ligado à sabedoria, pai de Thor.
FREYA|2|Deusa nórdica associada ao amor, à magia e à fertilidade.
ANUBIS|2|Deus egípcio associado à mumificação e representado com cabeça de chacal.
OSIRIS|2|Deus egípcio associado ao mundo dos mortos, esposo de Ísis.
ISIS|2|Deusa egípcia, mãe de Hórus e esposa de Osíris.
MEDUSA|1|Figura grega cujo olhar transforma pessoas em pedra.
MINOTAURO|1|Criatura grega com corpo humano e cabeça de touro.
CERBERO|3|Cão de múltiplas cabeças que guarda a entrada do mundo dos mortos grego.
`),
  theme('oceanos', 'Oceano Profundo', 'water', 'Correntes, recifes e vidas sob as ondas.', `
BALEIA|1|Mamífero marinho que inclui os maiores animais existentes.
GOLFINHO|1|Cetáceo conhecido por seu rostro alongado e uso de ecolocalização.
TUBARAO|1|Peixe cartilaginoso conhecido por dentes que se renovam.
POLVO|1|Molusco marinho com oito braços.
LULA|1|Molusco com oito braços e dois tentáculos mais longos.
CORAL|1|Animal marinho cujas colônias podem formar esqueletos que constroem recifes.
RECIFE|1|Formação submersa próxima à superfície, muitas vezes construída por corais.
PLANCTON|2|Organismos aquáticos transportados principalmente pelas correntes.
KRILL|3|Pequeno crustáceo semelhante a camarão que alimenta muitas baleias.
ANEMONA|2|Cnidário de tentáculos que vive aderido a superfícies e pode abrigar peixes-palhaço.
ESTRELA|1|Complete: equinodermo de vários braços chamado ___-do-mar.
OURICO|1|Complete: equinodermo marinho de corpo arredondado e espinhos, o ___-do-mar.
CAVALO|1|Complete: peixe de cabeça semelhante à de um equino, o ___-marinho.
MARE|1|Variação periódica do nível do mar influenciada pela Lua e pelo Sol.
CORRENTE|1|Movimento persistente de grandes massas de água no oceano.
ABISSAL|3|Adjetivo relativo a regiões oceânicas de grande profundidade.
SALINIDADE|2|Quantidade de sais dissolvidos em uma massa de água.
ESTUARIO|2|Região onde águas de um rio se encontram com águas do mar.
MANGUEZAL|2|Ecossistema costeiro de águas salobras com árvores adaptadas à lama.
BATIMETRIA|3|Medição e representação das profundidades de corpos d'água.
`),
  theme('natureza', 'Natureza Viva', 'leaf', 'Florestas, animais e relações do ambiente.', `
FLORESTA|1|Formação vegetal com predominância de árvores.
SAVANA|2|Formação com gramíneas e árvores esparsas, comum em clima tropical sazonal.
DESERTO|1|Região que recebe pouquíssima precipitação.
TUNDRA|2|Bioma frio com vegetação baixa e ausência de árvores altas.
TAIGA|3|Floresta de coníferas encontrada em altas latitudes do hemisfério norte.
CERRADO|1|Bioma brasileiro com árvores de troncos retorcidos e casca espessa.
CAATINGA|1|Bioma brasileiro do semiárido, com muitas plantas adaptadas à seca.
PANTANAL|1|Grande planície inundável brasileira com rica diversidade de animais.
AMAZONIA|1|Região conhecida pela maior floresta tropical úmida do mundo.
PAMPA|2|Bioma de campos que ocorre no extremo sul do Brasil.
POLINIZACAO|2|Transferência de pólen que permite a reprodução de muitas plantas.
SEMENTE|1|Estrutura de uma planta que contém um embrião e pode germinar.
RAIZ|1|Órgão vegetal que geralmente fixa a planta e absorve água do solo.
CAULE|1|Órgão vegetal que sustenta folhas e conduz substâncias.
FOLHA|1|Órgão vegetal geralmente achatado e especializado em captar luz.
DECOMPOSITOR|2|Organismo que transforma matéria orgânica morta em substâncias mais simples.
PREDADOR|1|Animal que caça outro animal para se alimentar.
HERBIVORO|1|Animal cuja alimentação é composta principalmente por plantas.
ONIVORO|2|Animal que se alimenta tanto de vegetais quanto de outros animais.
BIODIVERSIDADE|3|Variedade de seres vivos, genes e ecossistemas de uma região.
`),
  theme('musica', 'Frequência Musical', 'music', 'Ritmos, instrumentos e ondas sonoras.', `
MELODIA|1|Sequência de notas percebida como uma linha musical.
HARMONIA|2|Combinação e organização de sons tocados simultaneamente.
RITMO|1|Organização das durações e dos acentos ao longo do tempo musical.
COMPASSO|2|Divisão regular da música em grupos de tempos.
TEMPO|1|Nome de cada pulsação contada em um compasso.
ACORDE|1|Conjunto de notas tocadas juntas como unidade harmônica.
ESCALA|1|Sequência ordenada de notas segundo um padrão de intervalos.
OITAVA|2|Intervalo entre duas notas cujas frequências estão na razão de dois para um.
TIMBRE|2|Qualidade que permite distinguir instrumentos tocando a mesma nota.
PARTITURA|1|Representação escrita de uma composição musical.
CLAVE|2|Símbolo no início da pauta que define a referência das notas.
PAUTA|2|Conjunto tradicional de cinco linhas para escrever notas musicais.
VIOLAO|1|Instrumento acústico de seis cordas muito usado na música brasileira.
PIANO|1|Instrumento de teclas em que martelos percutem cordas.
VIOLINO|1|Instrumento de quatro cordas normalmente tocado com arco junto ao ombro.
FLAUTA|1|Instrumento de sopro em que o ar incide sobre uma borda.
BATERIA|1|Conjunto de tambores e pratos tocados por uma só pessoa.
BAIXO|1|Instrumento que costuma sustentar a região grave de uma banda.
METRONOMO|2|Aparelho que marca pulsações regulares para estudo musical.
ARPEJO|3|Execução sucessiva das notas de um acorde.
`),
  theme('literatura', 'Biblioteca Infinita', 'book', 'Histórias, versos e o poder das palavras.', `
ROMANCE|1|Narrativa ficcional longa, geralmente publicada em livro.
CONTO|1|Narrativa ficcional curta com ação concentrada.
CRONICA|2|Texto breve que frequentemente parte de acontecimentos cotidianos.
POEMA|1|Composição literária que pode ser organizada em versos e estrofes.
VERSO|1|Cada linha de um poema.
ESTROFE|1|Conjunto de versos que forma uma unidade num poema.
RIMA|1|Repetição de sons semelhantes, geralmente no final dos versos.
SONETO|2|Forma poética tradicional composta por quatorze versos.
NARRADOR|1|Voz que conta os acontecimentos de uma história.
PERSONAGEM|1|Ser que participa das ações de uma narrativa.
ENREDO|1|Conjunto organizado dos acontecimentos de uma história.
PROTAGONISTA|2|Personagem principal de uma narrativa.
ANTAGONISTA|2|Personagem ou força que se opõe ao protagonista.
METAFORA|2|Figura que aproxima ideias por semelhança sem usar uma comparação explícita.
ALITERACAO|3|Repetição expressiva de sons consonantais numa frase ou verso.
HIPERBOLE|2|Figura de linguagem que usa exagero intencional.
EPILOGO|2|Parte final que comenta ou conclui os acontecimentos de uma obra.
PROLOGO|2|Parte introdutória que antecede o início principal de uma obra.
FABULA|1|Narrativa curta que costuma apresentar animais e uma lição moral.
HAICAI|3|Forma poética de origem japonesa tradicionalmente escrita em três versos.
`),
  theme('historia', 'Ecos da História', 'hourglass', 'Vestígios, invenções e formas de viver.', `
ARQUEOLOGIA|2|Área que investiga sociedades por seus vestígios materiais.
FOSSIL|1|Resto ou vestígio de um ser vivo preservado do passado geológico.
PERGAMINHO|2|Material de escrita produzido a partir de pele animal preparada.
PAPIRO|2|Suporte de escrita do Egito antigo feito de uma planta aquática.
CUNEIFORME|3|Escrita antiga feita com sinais em forma de cunha na argila.
HIEROGLIFO|2|Sinal da escrita figurativa usada no Egito antigo.
FARAO|1|Título do soberano do Egito antigo.
PIRAMIDE|1|Monumento de faces triangulares usado como tumba no Egito antigo.
POLIS|2|Cidade-Estado da Grécia antiga.
AGORA|3|Espaço público central das cidades da Grécia antiga.
SENADO|1|Instituição política romana cujo nome também existe em parlamentos modernos.
LEGIAO|2|Grande unidade militar do exército de Roma antiga.
FEUDO|2|Domínio territorial ligado a relações de obrigação na sociedade medieval.
VASSALO|2|Pessoa ligada a um senhor por compromisso de fidelidade no feudalismo.
MOSTEIRO|1|Edificação onde vive uma comunidade de monges.
RENASCIMENTO|2|Movimento cultural europeu inspirado também na antiguidade clássica.
ILUMINISMO|2|Movimento intelectual do século XVIII que valorizava a razão.
IMPRENSA|1|Técnica de reprodução de textos transformada pelos tipos móveis de Gutenberg.
NAVEGACAO|1|Arte de conduzir embarcações, essencial às expedições marítimas.
REVOLUCAO|1|Mudança profunda que transforma a ordem política ou social.
`),
  theme('geografia', 'Atlas do Mundo', 'map', 'Paisagens, mapas e coordenadas da Terra.', `
CONTINENTE|1|Grande extensão contínua de terras emersas.
OCEANO|1|Vasta massa de água salgada entre continentes.
ILHA|1|Porção de terra cercada de água por todos os lados.
PENINSULA|2|Porção de terra cercada de água quase por completo.
ISTMO|3|Faixa estreita de terra que liga duas áreas maiores.
ARQUIPELAGO|2|Conjunto de ilhas próximas umas das outras.
PLANALTO|1|Forma de relevo em que predominam processos erosivos.
PLANICIE|1|Área de relevo onde predomina a acumulação de sedimentos.
MONTANHA|1|Elevação natural de grande altitude em relação ao terreno próximo.
VALE|1|Depressão alongada entre áreas elevadas, frequentemente atravessada por rio.
DELTA|2|Depósito sedimentar na foz de um rio, muitas vezes em forma de leque.
NASCENTE|1|Local onde um curso d'água tem início.
FOZ|1|Local onde um rio deságua em outro corpo d'água.
AFLUENTE|2|Rio que deságua em outro rio.
LATITUDE|2|Distância angular de um ponto ao norte ou ao sul do equador.
LONGITUDE|2|Distância angular de um ponto a leste ou oeste de Greenwich.
EQUADOR|1|Linha imaginária que divide a Terra nos hemisférios norte e sul.
MERIDIANO|2|Semicírculo imaginário que liga os polos terrestres.
CARTOGRAFIA|2|Área dedicada à produção e ao estudo de mapas.
ALTITUDE|1|Distância vertical de um lugar em relação ao nível médio do mar.
`),
  theme('artes', 'Ateliê Visual', 'palette', 'Cor, composição e formas de expressão.', `
PINTURA|1|Arte de aplicar pigmentos a uma superfície para criar imagens.
ESCULTURA|1|Arte de criar formas tridimensionais por modelagem, entalhe ou montagem.
DESENHO|1|Representação visual feita principalmente por linhas e traços.
GRAVURA|2|Imagem obtida pela impressão de uma matriz preparada.
AQUARELA|1|Técnica de pintura com pigmentos diluídos em água, geralmente sobre papel.
GUACHE|2|Tinta à base de água caracterizada pela cobertura opaca.
AFRESCO|3|Pintura executada sobre uma camada de argamassa ainda úmida.
MOSAICO|1|Imagem formada pela combinação de pequenas peças coloridas.
COLAGEM|1|Técnica que compõe uma imagem fixando materiais sobre um suporte.
PERSPECTIVA|2|Técnica que representa profundidade numa superfície plana.
HORIZONTE|1|Complete: linha de referência da altura dos olhos, a linha do ___.
CONTRASTE|1|Diferença visual acentuada entre elementos de uma composição.
SATURACAO|2|Atributo de cor associado à intensidade em relação ao cinza.
MATIZ|2|Atributo que distingue uma família de cor, como azul ou vermelho.
TEXTURA|1|Qualidade visual ou tátil da superfície de um material.
SIMETRIA|1|Correspondência de partes em relação a um eixo ou centro.
ABSTRATO|2|Adjetivo de uma arte que não representa necessariamente objetos reconhecíveis.
RETRATO|1|Representação visual de uma pessoa, especialmente de seu rosto.
PAISAGEM|1|Representação artística de um cenário natural ou urbano.
XILOGRAVURA|3|Técnica de impressão cuja matriz é entalhada em madeira.
`),
  theme('gastronomia', 'Mesa de Sabores', 'bowl', 'Ingredientes e transformações da cozinha.', `
ARROZ|1|Grão que forma uma dupla clássica com o feijão no prato brasileiro.
FEIJAO|1|Leguminosa usada no preparo da feijoada.
MANDIOCA|1|Raiz também chamada de aipim ou macaxeira.
TAPIOCA|1|Preparo de frigideira feito com goma hidratada de mandioca.
CACAU|1|Fruto cujas sementes são a base do chocolate.
CAFE|1|Bebida preparada com grãos torrados e moídos, famosa pelo aroma.
CANELA|1|Especiaria aromática obtida da casca de certas árvores.
GENGIBRE|1|Rizoma de sabor picante usado em chás e receitas.
MANJERICAO|2|Erva aromática tradicionalmente usada no molho pesto.
ALECRIM|2|Erva de folhas estreitas e aroma intenso, comum em assados.
FERMENTO|1|Ingrediente que ajuda uma massa a crescer.
GLUTEN|2|Rede proteica formada ao hidratar e trabalhar farinha de trigo.
EMULSAO|3|Mistura em que um líquido fica disperso em outro, como na maionese.
REFOGAR|1|Cozinhar rapidamente ingredientes em pequena quantidade de gordura.
ASSAR|1|Cozinhar usando calor seco, geralmente dentro de um forno.
GRELHAR|1|Cozinhar um alimento em contato com uma grelha aquecida.
MARINADA|2|Mistura temperada na qual se deixa um alimento antes do preparo.
CALDO|1|Líquido saboroso obtido ao cozinhar ingredientes em água.
RISOTO|2|Prato italiano de arroz cozido com caldo adicionado aos poucos.
UMAMI|3|Sabor básico associado ao glutamato e presente em alimentos como cogumelos.
`),
  theme('portugues', 'Nossa Língua', 'type', 'Palavras, sentidos e a construção das frases.', `
SUBSTANTIVO|1|Classe de palavras que nomeia seres, objetos, lugares e conceitos.
ADJETIVO|1|Classe de palavras que atribui características a substantivos.
VERBO|1|Classe de palavras que expressa ações, estados ou fenômenos.
ADVERBIO|2|Classe que pode modificar um verbo e indicar modo, tempo ou lugar.
PRONOME|1|Palavra que pode substituir ou acompanhar um nome.
ARTIGO|1|Classe das palavras o, a, os, as, um e uma.
PREPOSICAO|2|Classe de palavras como de, com, por e para.
CONJUNCAO|2|Palavra que liga orações ou termos de mesma função.
INTERJEICAO|2|Palavra ou expressão que manifesta uma reação, como ufa!
SUJEITO|1|Termo da oração sobre o qual se declara algo.
PREDICADO|2|Parte da oração que declara algo a respeito do sujeito.
SILABA|1|Unidade sonora pronunciada em uma emissão de voz.
FONEMA|2|Menor unidade sonora capaz de distinguir palavras numa língua.
DITONGO|2|Encontro de uma vogal e uma semivogal na mesma sílaba.
HIATO|2|Encontro de vogais pronunciadas em sílabas separadas.
DIGRAFO|2|Par de letras que representa um só fonema, como ch.
SINONIMO|1|Palavra de sentido igual ou semelhante ao de outra.
ANTONIMO|1|Palavra de sentido oposto ao de outra.
PREFIXO|2|Elemento acrescentado antes do radical para formar uma palavra.
SUFIXO|2|Elemento acrescentado depois do radical para formar uma palavra.
`),
  theme('anatomia', 'Corpo Humano', 'pulse', 'Órgãos, tecidos e sistemas em ação.', `
CORACAO|1|Órgão muscular que bombeia o sangue pelo corpo.
PULMAO|1|Órgão onde ocorrem trocas gasosas entre ar e sangue.
FIGADO|1|Órgão que produz bile e participa de muitas funções metabólicas.
RIM|1|Órgão que filtra o sangue e participa da produção de urina.
ESTOMAGO|1|Órgão digestivo que mistura alimentos com secreções ácidas.
INTESTINO|1|Complete: no ___ delgado ocorre grande parte da absorção de nutrientes.
PANCREAS|2|Órgão que produz insulina e enzimas digestivas.
PELE|1|Órgão que recobre a superfície externa do corpo.
OSSO|1|Cada peça rígida do esqueleto, formada principalmente por tecido mineralizado.
MUSCULO|1|Órgão contrátil que pode movimentar partes do corpo, como o bíceps.
TENDAO|2|Estrutura fibrosa que liga um músculo a um osso.
LIGAMENTO|2|Faixa de tecido que une ossos e estabiliza articulações.
CARTILAGEM|2|Tecido flexível que reveste superfícies articulares e forma parte da orelha.
ARTERIA|1|Vaso que conduz sangue para fora do coração.
VEIA|1|Vaso que conduz sangue de volta ao coração.
CAPILAR|2|Vaso sanguíneo muito fino onde ocorrem trocas com os tecidos.
HEMACIA|2|Célula sanguínea especializada no transporte de oxigênio.
LEUCOCITO|2|Célula sanguínea que participa da defesa do organismo.
PLAQUETA|2|Fragmento celular do sangue importante na coagulação.
DIAFRAGMA|3|Músculo que separa tórax e abdome e é essencial à respiração.
`),
  theme('energia', 'Energia do Futuro', 'sun', 'Fontes, armazenamento e transformações de energia.', `
SOLAR|1|Adjetivo de energia obtida a partir da radiação do Sol.
EOLICA|1|Tipo de energia produzida pelo aproveitamento dos ventos.
HIDRAULICA|1|Tipo de energia associado ao movimento ou à posição da água.
GEOTERMICA|2|Tipo de energia que aproveita o calor do interior da Terra.
BIOMASSA|2|Matéria orgânica usada como fonte de energia.
BIOGAS|2|Mistura gasosa combustível produzida pela decomposição de matéria orgânica.
ETANOL|1|Álcool combustível que pode ser produzido a partir de cana-de-açúcar.
HIDROGENIO|2|Elemento mais leve, estudado como vetor de armazenamento de energia.
BATERIA|1|Dispositivo que armazena energia química e fornece energia elétrica.
TURBINA|1|Máquina que gira pela passagem de um fluido e fornece trabalho mecânico.
GERADOR|1|Máquina que converte energia mecânica em energia elétrica.
INVERSOR|2|Equipamento que converte corrente contínua em corrente alternada.
PAINEL|1|Complete: um módulo que capta luz para gerar eletricidade é um ___ solar.
FOTOVOLTAICO|3|Adjetivo do efeito que converte luz diretamente em eletricidade.
RENOVAVEL|1|Adjetivo de fonte que se recompõe naturalmente em escala humana.
EFICIENCIA|2|Relação entre a energia útil produzida e a energia fornecida.
WATT|1|Unidade de potência do Sistema Internacional.
JOULE|2|Unidade de energia do Sistema Internacional.
FISSAO|3|Divisão de um núcleo atômico pesado, usada em usinas nucleares.
FUSAO|3|União de núcleos leves que libera energia no interior do Sol.
`),
  theme('maker', 'Oficina Maker', 'tool', 'Ideias que ganham forma na bancada.', `
PROTOTIPO|1|Primeira versão usada para experimentar e avaliar uma ideia.
ARDUINO|2|Plataforma de placas e software muito usada em projetos eletrônicos educativos.
RASPBERRY|2|Complete o nome do pequeno computador de placa única: ___ Pi.
IMPRESSORA|1|Complete: uma ___ 3D constrói objetos físicos em camadas.
FILAMENTO|2|Material em fio alimentado numa impressora 3D de extrusão.
RESINA|2|Material líquido endurecido por luz em certos processos de impressão 3D.
FATIADOR|3|Programa que converte um modelo 3D em instruções por camadas de impressão.
BICO|1|Peça por onde sai o material fundido de uma impressora 3D.
EXTRUSOR|2|Mecanismo que empurra o filamento no sistema de impressão 3D.
CNC|2|Sigla de controle numérico computadorizado em máquinas de fabricação.
LASER|1|Feixe de luz concentrado usado por máquinas de corte e gravação.
FRESA|2|Ferramenta de corte rotativa usada para remover material de uma peça.
PAQUIMETRO|2|Instrumento com bicos deslizantes para medir dimensões externas e internas.
LIMA|1|Ferramenta manual de superfície áspera usada para desbastar material.
ALICATE|1|Ferramenta de duas hastes usada para segurar, dobrar ou cortar peças.
FURADEIRA|1|Ferramenta que gira uma broca para abrir furos.
BROCA|1|Peça de corte giratória usada para perfurar materiais.
BANCADA|1|Mesa resistente em que se executam trabalhos de oficina.
TORNO|2|Máquina-ferramenta que gira a peça para realizar operações de corte.
GABARITO|2|Molde ou dispositivo usado para repetir marcações ou posições com precisão.
`),
  theme('logica', 'Enigmas da Lógica', 'puzzle', 'Dedução, argumentos e raciocínio preciso.', `
PREMISSA|2|Afirmação usada como ponto de partida de um argumento.
CONCLUSAO|1|Afirmação que um argumento procura sustentar.
DEDUCAO|2|Raciocínio que extrai uma conclusão necessária a partir de suas premissas.
INDUCAO|2|Raciocínio que generaliza a partir de casos observados.
ABDUCAO|3|Raciocínio que propõe uma explicação plausível para uma observação.
SILOGISMO|3|Argumento clássico formado por duas premissas e uma conclusão.
FALACIA|2|Erro de raciocínio que pode fazer um argumento parecer convincente.
PARADOXO|2|Afirmação ou situação que desafia a intuição e parece contraditória.
AXIOMA|3|Proposição aceita como ponto de partida dentro de um sistema formal.
TEOREMA|2|Proposição demonstrada a partir de axiomas e resultados anteriores.
PROVA|1|Sequência de passos que demonstra uma afirmação matemática.
NEGACAO|1|Operação lógica que inverte o valor de verdade de uma proposição.
CONJUNCAO|2|Operação lógica verdadeira apenas quando as duas proposições são verdadeiras.
DISJUNCAO|2|Operação lógica inclusiva verdadeira quando pelo menos uma proposição é verdadeira.
IMPLICACAO|3|Relação lógica expressa pela forma se P, então Q.
TAUTOLOGIA|3|Proposição composta verdadeira em todas as combinações de valores de verdade.
CONTRADICAO|2|Proposição composta falsa em todas as combinações de valores de verdade.
HIPOTESE|1|Suposição formulada para ser examinada ou testada.
PADRAO|1|Regularidade que pode ser identificada numa sequência.
SEQUENCIA|1|Lista de elementos dispostos em uma ordem definida.
`),
];

// The first districts use everyday vocabulary and direct clues before technical subjects.
export const beginnerThemeIds = ['natureza', 'gastronomia', 'anatomia', 'musica', 'artes', 'geografia', 'astronomia', 'superpoderes', 'emocoes', 'literatura', 'cinema', 'portugues'];
const starterWords: Record<string, string> = {
  natureza: 'SOL|Estrela que ilumina a Terra.\nLUA|Astro que vemos brilhar à noite.\nRIO|Curso natural de água doce.\nMAR|Grande extensão de água salgada.\nFLOR|Parte colorida de muitas plantas.\nARVORE|Planta com tronco e galhos.\nCHUVA|Água que cai das nuvens.\nPEDRA|Pedaço duro de rocha.\nFOLHA|Parte verde que cresce nos galhos.\nVENTO|Ar em movimento.\nGATO|Animal que faz miau.\nCAO|Animal doméstico que late.',
  gastronomia: 'PAO|Alimento da padaria feito com farinha.\nARROZ|Grão que costuma acompanhar o feijão.\nLEITE|Bebida usada para fazer queijo.\nSAL|Tempero que deixa a comida salgada.\nMEL|Alimento doce produzido pelas abelhas.\nOVO|Ingrediente com clara e gema.\nBOLO|Doce de aniversário que recebe velinhas.\nSUCO|Bebida feita com frutas.\nFRUTA|Maçã, banana e laranja são exemplos.\nMASSA|Nome geral do macarrão e do espaguete.',
  anatomia: 'OLHO|Órgão usado para enxergar.\nMAO|Parte do corpo com palma e dedos.\nPES|Partes do corpo que apoiamos no chão ao andar.\nBOCA|Parte do rosto usada para falar e comer.\nNARIZ|Parte do rosto usada para sentir cheiros.\nOSSO|Estrutura dura que forma o esqueleto.\nSANGUE|Líquido vermelho que circula no corpo.\nDEDO|Cada uma das cinco pontas de uma mão.\nDENTE|Estrutura da boca usada para mastigar.\nPELE|Camada que recobre o corpo.',
  musica: 'SOM|Aquilo que os ouvidos escutam.\nNOTA|Dó, ré e mi são exemplos musicais.\nPIANO|Instrumento com teclas pretas e brancas.\nVIOLA|Instrumento de cordas comum na música caipira.\nCANTO|Ato de cantar uma música.\nVOZ|Som que produzimos ao falar.\nFLAUTA|Instrumento de sopro com pequenos furos.\nRITMO|Sequência de batidas de uma música.\nTAMBOR|Instrumento que tocamos batendo na pele esticada.\nBANDA|Grupo de pessoas que toca música junto.',
  artes: 'COR|Qualidade visual como azul ou amarelo.\nTINTA|Material colorido usado para pintar.\nLAPIS|Objeto de grafite usado para escrever ou desenhar.\nPAPEL|Material das folhas de um caderno.\nLINHA|Traço feito com um lápis.\nAZUL|Cor do céu em um dia sem nuvens.\nVERDE|Cor comum das folhas das plantas.\nROSA|Cor obtida ao misturar vermelho e branco.\nPINCEL|Objeto com cerdas usado para pintar.\nFORMA|Círculo, quadrado e triângulo são exemplos.',
  geografia: 'MAPA|Desenho que representa um lugar.\nILHA|Porção de terra cercada por água.\nRIO|Curso de água que corre até outro rio ou o mar.\nMAR|Grande porção de água salgada.\nTERRA|Planeta em que vivemos.\nNORTE|Ponto cardeal indicado pela letra N.\nSUL|Ponto cardeal oposto ao norte.\nLAGO|Água cercada por terra.\nMUNDO|O planeta e todos os seus lugares.\nPRAIA|Faixa de areia junto ao mar.',
  astronomia: 'SOL|Estrela que fica no centro do nosso sistema.\nLUA|Satélite natural da Terra.\nTERRA|Terceiro planeta a partir do Sol.\nMARTE|Planeta conhecido como planeta vermelho.\nVENUS|Planeta entre Mercúrio e a Terra.\nCEU|Espaço que vemos acima de nós.\nASTRO|Corpo celeste como uma estrela ou um planeta.\nNOITE|Parte do dia em que podemos observar estrelas.\nCOMETA|Corpo celeste que pode apresentar uma cauda.\nORBITA|Caminho que um planeta percorre ao redor do Sol.',
  superpoderes: 'CAPA|Peça de tecido que um herói usa nas costas.\nRAIO|Descarga elétrica representada no símbolo do Flash.\nFORCA|Poder de levantar objetos muito pesados.\nVOO|Poder de atravessar o céu sem avião.\nHEROI|Personagem que protege outras pessoas.\nVILAO|Personagem que cria problemas para o herói.\nESCUDO|Objeto usado para se proteger de golpes.\nALIADO|Pessoa que ajuda outra em uma missão.\nARANHA|Animal de oito pernas ligado ao Homem-Aranha.\nORIGEM|Começo da história de um herói.',
  emocoes: 'AMOR|Sentimento de carinho muito forte por alguém.\nMEDO|Sentimento diante de um perigo.\nRAIVA|Sentimento quando algo nos irrita muito.\nCALMA|Estado de tranquilidade.\nRISO|Reação que acompanha algo engraçado.\nSORRIR|Mostrar alegria com os lábios.\nAFETO|Carinho que demonstramos a alguém.\nABRACO|Gesto de envolver alguém com os braços.\nFELIZ|Como fica alguém que sente alegria.\nTRISTE|Como fica alguém que sente tristeza.',
  literatura: 'LIVRO|Objeto de páginas que conta histórias ou ensina.\nCONTO|História curta.\nPOEMA|Texto escrito em versos.\nVERSO|Cada linha de um poema.\nRIMA|Semelhança de som entre palavras, como amor e flor.\nAUTOR|Pessoa que escreve uma obra.\nLEITOR|Pessoa que lê um texto.\nPAGINA|Cada lado de uma folha de um livro.\nTEXTO|Conjunto de palavras organizado para comunicar algo.\nFABULA|História curta com animais e uma lição moral.',
  cinema: 'FILME|História contada com imagens em movimento.\nCENA|Parte de um filme em que uma ação acontece.\nATOR|Homem que interpreta um personagem.\nATRIZ|Mulher que interpreta uma personagem.\nTELA|Superfície onde aparece a imagem do cinema.\nSALA|Lugar do cinema onde o público assiste ao filme.\nELENCO|Grupo de atores de uma produção.\nTRILHA|Complete: a música de um filme é sua ___ sonora.\nEFEITO|Complete: explosões feitas no computador são um ___ especial.\nCAMERA|Equipamento usado para filmar.',
  portugues: 'LETRA|Cada símbolo do alfabeto.\nFRASE|Conjunto de palavras que comunica uma ideia.\nNOME|Palavra que identifica uma pessoa ou coisa.\nVERBO|Palavra que indica ação, como correr.\nVOGAL|A, E, I, O e U são exemplos.\nPONTO|Sinal que costuma encerrar uma frase.\nACENTO|Marca gráfica usada em palavras como café.\nPLURAL|Forma usada para indicar mais de um.\nSILABA|Parte sonora de uma palavra, como ca em casa.\nTEXTO|Conjunto de frases organizado para comunicar algo.',
};
for (const selected of themes) {
  for (const line of (starterWords[selected.id] || '').split('\n').filter(Boolean)) {
    const [answer, clue] = line.split('|');
    const existing = selected.entries.find(entry => entry.answer === answer);
    if (existing) { existing.difficulty = 1; existing.clue = clue; }
    else selected.entries.push({ id: `${selected.id}-starter-${answer.toLowerCase()}`, answer, clue, difficulty: 1 });
  }
}
