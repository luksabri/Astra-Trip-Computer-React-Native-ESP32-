# 🚗 Astra Trip Computer (ESP32 + React Native)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![ESP32](https://img.shields.io/badge/Hardware-ESP32-green.svg)
![React Native](https://img.shields.io/badge/Mobile-React%20Native%20%2F%20Expo-61dafb.svg)
![Bluetooth](https://img.shields.io/badge/Bluetooth-Classic%20(SPP)-0082fc.svg)

Computador de bordo e sistema de telemetria automotiva desenvolvido sob medida para veículos da linha **Chevrolet Astra 2.0 8V Flexpower**. 

O projeto captura pulsos de injeção eletrônica, sensor de velocidade (VSS) e bóia de combustível diretamente dos sensores do veículo por meio de condicionamento de sinal com optocopladores, processa os dados em tempo real no **ESP32** utilizando FreeRTOS e os transmite via **Bluetooth SPP** para um dashboard responsivo em **React Native**.

---

## 📸 Painel da Aplicação

O aplicativo mobile possui uma interface com alto contraste projetada para ambiente automotivo, contendo:

- 🏎️ **Velocímetro Digital:** Atualização contínua via pulsos do sensor VSS.
- ⛽ **Consumo Instantâneo:** Alternância automática entre **km/L** (em movimento) e **L/h** (parado/marcha lenta).
- ⚡ **Detecção de Cut-Off:** Badge visual indicando quando o freio motor está atuando sem injeção de combustível.
- 📊 **Controle de Trips (Trip A / Trip B):** Métricas acumuladas de consumo médio, distância percorrida, tempo de motor ligado, velocidade média e custo financeiro estimado.
- 🔋 **Medidor do Tanque & Autonomia:** Leitura percentual, volume restante em litros (tanque de 57L) e cálculo dinâmico de autonomia residual.
- 🔄 **Comandos Remotos:** Botões de reset direto para limpar contadores de Trip salvos na RAM do microcontrolador.

---

## 🛠️ Arquitetura do Sistema & Hardware

### Componentes Utilizados
* **Microcontrolador:** ESP32 NodeMCU (30 pinos).
* **Condicionamento de Sinal (Injeção/VSS):** Módulos Optocopladores (Ex: PC817 ou L9637D) isolando os sinais de 12V/GND da ECU para as portas GPIO de 3.3V do ESP32.
* **Leitura de Bóia:** Módulo divisor de tensão / sensor 0-25V ligado ao canal ADC.

### Mapeamento de Pinos (GPIOs)
| Sinal do Veículo | Pino ESP32 | Tipo de Entrada | Modo de Leitura |
| :--- | :--- | :--- | :--- |
| **Bico Injetor** | `GPIO 33` | Input / Interrupt | Interrupção por borda (`CHANGE`) |
| **VSS (Velocidade)** | `GPIO 27` | Input / Interrupt | Interrupção por borda (`RISING`) |
| **Bóia de Combustível** | `GPIO 32` | Analog (ADC) | Leitura ADC (`0 - 4095`) |

---

## 📡 Protocolo de Comunicação Bluetooth (JSON)

O ESP32 atua como um servidor Bluetooth SPP com o nome de broadcast **`Astra_Trip_Computer`** e transmite um pacote JSON estruturado a cada **1 segundo**:

### Estrutura do Payload Enviado (ESP32 ➔ App)
```json
{
  "instantaneo": {
    "velocidade": 85.0,
    "consumo": 11.8,
    "unidade": "km/L",
    "cutoff": false
  },
  "tanque": {
    "porcentagem": 45.0,
    "litros_restantes": 25.6,
    "autonomia_km": 281.0
  },
  "trip_a": {
    "km": 182.4,
    "litros": 16.8,
    "media_kml": 10.8,
    "tempo_min": 175
  },
  "trip_b": {
    "km": 1420.0,
    "litros": 126.7,
    "media_kml": 11.2,
    "tempo_min": 1360
  }
}
```
# Comandos de Controle (App ➔ ESP32)
Para resetar os acumuladores via aplicativo, envie as seguintes strings seriais com quebra de linha:

RESET_TRIP_A\n : Zera os dados de distância, litros e tempo da Trip A.

RESET_TRIP_B\n : Zera os dados de distância, litros e tempo da Trip B.

## 🚀 Como Executar o Projetos
1. Programação do ESP32 (Firmware)
Pré-requisitos:
Arduino IDE ou PlatformIO.

Placa ESP32 instalada no gerenciador de placas.

Biblioteca ArduinoJson (versão 6.x) instalada.

Passos:
Abra o arquivo .ino na sua IDE.

Selecione a placa ESP32 Dev Module.

Compile e faça o upload para o dispositivo.

Abra o Monitor Serial a 115200 baud para verificar os registros de inicialização.

2. Compilação do App Mobile (React Native)
Devido ao uso de bibliotecas de Bluetooth Classic nativas (react-native-bluetooth-classic), é recomendado compilar utilizando o Expo Development Build (EAS) ou o React Native CLI.

Pré-requisitos:
Node.js (v18+)

Android Studio configurado com SDK e NDK (para compilação local).

# Passos de Instalação:
Para rodar essa aplicação no seu dispositivo Android ou em um emulador, o caminho ideal é gerar um Development Build (Build de Desenvolvimento) do Expo.
Isso é necessário porque a biblioteca *react-native-bluetooth-classic* utiliza código nativo do Android para gerenciar a antena Bluetooth e a porta serial (SPP), algo que o aplicativo Expo Go tradicional não consegue executar sozinho.
Abaixo está o passo a passo completo utilizando a ferramenta EAS (Expo Application Services) em modo local.

1 .Instalar o EAS CLI:Ferramenta de compilação da Expo.Abra o terminal na pasta do projeto e instale o EAS CLI globalmente no Node.js:
```Bash
npm install -g eas-cli
```
2 .Configurar o projeto para Builds Nativos:
Gera o arquivo eas.json.
Inicialize a configuração do EAS executando o comando abaixo. Ele criará o arquivo eas.json no diretório raiz do projeto:
```Bash
eas build:configure
```
3 .Compilar o APK de Desenvolvimento (Opção 1: Compilação Local):Requer Android Studio e Java configurados na máquina.
Se você tem o Android Studio (com SDK e NDK) instalado no computador, pode gerar o app e instalá-lo diretamente no celular via cabo USB:
```Bash
npx expo run:android
```
Este comando injeta a pasta /android com as pontes nativas do Bluetooth e faz o deploy direto para o celular conectado.

4 .Compilar o APK via Nuvem Expo (Opção 2: Sem Android Studio):
Requer conta gratuita na Expo.
Caso prefira que a Expo compile o aplicativo nos servidores dela (sem precisar instalar o Android Studio no seu PC):
Faça login na sua conta Expo:
```Bash
eas login
```
Execute a compilação gerando um arquivo .apk:
```Bash
eas build --profile development --platform android --local
```
(Ou remova o --local para compilar diretamente na nuvem da Expo. No final, será fornecido um link/QR Code para baixar o APK no celular).

# 📱 Utilização
No seu smartphone Android, acesse as configurações de Bluetooth e pareie manualmente com o dispositivo Astra_Trip_Computer.

Certifique-se de que a Localização (GPS) do smartphone está ligada (requisito de permissão do sistema Android para varredura Bluetooth).

Abra o aplicativo Astra Trip Computer.

Toque no botão 🔌 CONECTAR BLUETOOTH DO VEÍCULO localizado no rodapé do app e selecione o dispositivo pareado.

⚙️ Parâmetros de Calibração (Firmware)
Se você estiver aplicando este projeto em outro veículo com especificações diferentes, ajuste as seguintes constantes no arquivo C++ do ESP32:
```BASH 
C++
const int NUMERO_BICOS = 4;             // Número de cilindros/bicos
const float VAZAO_BICO_ML_MS = 0.0035;  // Vazão individual (mL/ms)
const float PULSOS_VSS_POR_METRO = 8.0; // Razão de pulsos/metro do VSS
const float CAPACIDADE_TANQUE_LITROS = 57.0; // Capacidade máxima do tanque
```
📄 Licença
Este projeto é distribuído sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.
