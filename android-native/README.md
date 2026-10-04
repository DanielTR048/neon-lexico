# Neon Léxico para Android

Aplicativo Kotlin e Jetpack Compose, com tabuleiros, teclado, perfis, campanhas e persistência nativos. O catálogo e as fontes acompanham o APK; as partidas funcionam offline. O mesmo código de conexão LEX- conecta Daniel e Larissa ao progresso do site. As campanhas de Cruzadas, Cascata e Caça-palavras são separadas.

## Windows

Na pasta principal, execute:

```powershell
npm ci
npx tsx scripts/generate-native-fixtures.ts
./android-native/BUILD-ANDROID.ps1 -Release
```

O script sincroniza o catálogo e usa JDK 17, Android SDK 35 e Gradle 8.11.1. As ferramentas podem estar em `Jogos/.android-toolchain` ou configuradas no ambiente. Ele executa testes e lint antes de gerar `output/Neon-Lexico-Android-release.apk`.

A primeira compilação de release cria uma identidade de assinatura em `.signing/`, ignorada pelo Git. Preserve essa pasta em backup privado: atualizações instaláveis sobre a versão publicada precisam da mesma chave. As senhas ficam protegidas pelo usuário Windows. O CI produz somente APK de prévia; a publicação usa a versão release assinada.

Para testar sincronização real, use `NEON_LIVE_SYNC=1` apenas com conexão disponível. O teste cria uma família de teste independente e verifica ida e volta de uma campanha web no Android. Os testes normais não precisam do serviço remoto.

## Publicar APK

Copie o APK release para `public/android/neon-lexico.apk`, registre seu SHA-256 e faça o build web. O botão de download está disponível na seleção de perfis e nas configurações. A instalação é feita pelo usuário após baixar; o Android pode solicitar autorização para instalar pelo navegador.
