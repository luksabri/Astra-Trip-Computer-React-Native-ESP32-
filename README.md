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