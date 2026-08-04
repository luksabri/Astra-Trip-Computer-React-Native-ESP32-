import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  TextInput,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

// Pega a altura exata da barra de notificação/status do Android
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

export default function App() {
  // --- ESTADOS DA CONEXÃO BLUETOOTH ---
  const [device, setDevice] = useState(null);
  const [connected, setConnected] = useState(false);
  const [pairedDevices, setPairedDevices] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // --- CONFIGURAÇÕES DO USUÁRIO ---
  const [precoCombustivel, setPrecoCombustivel] = useState('5.80'); // R$/Litro padrão
  const [activeTrip, setActiveTrip] = useState('A'); // 'A' ou 'B'

  // --- TELEMETRIA RECEBIDA DO ESP32 ---
  const [telemetry, setTelemetry] = useState({
    instantaneo: {
      velocidade: 0,
      consumo: 0,
      unidade: 'km/L',
      cutoff: false,
    },
    tanque: {
      porcentagem: 0,
      litros_restantes: 0,
      autonomia_km: 0,
    },
    trip_a: {
      km: 0,
      litros: 0,
      media_kml: 0,
      tempo_min: 0,
    },
    trip_b: {
      km: 0,
      litros: 0,
      media_kml: 0,
      tempo_min: 0,
    },
  });

  useEffect(() => {
    solicitarPermissoes();
    return () => {
      if (device) device.disconnect();
    };
  }, []);

  const solicitarPermissoes = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ]);
    }
  };

  // Listar dispositivos já pareados nas configurações do celular
  const abrirModalConexao = async () => {
    try {
      const paired = await RNBluetoothClassic.getBondedDevices();
      setPairedDevices(paired);
      setModalVisible(true);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível buscar dispositivos pareados.');
    }
  };

  const conectarDispositivo = async (dispositivo) => {
    try {
      const isConnected = await dispositivo.connect();
      if (isConnected) {
        setDevice(dispositivo);
        setConnected(true);
        setModalVisible(false);

        // Escuta contínua de buffer serial enviada pelo ESP32
        dispositivo.onDataReceived((data) => {
          processarMensagemJSON(data.data);
        });
      }
    } catch (err) {
      Alert.alert('Erro', `Falha ao conectar em ${dispositivo.name}`);
    }
  };

  const desconectar = async () => {
    if (device) {
      await device.disconnect();
      setConnected(false);
      setDevice(null);
    }
  };

  // Parser do JSON enviado a cada 1s pelo ESP32
  const processarMensagemJSON = (rawString) => {
    try {
      const jsonString = rawString.trim();
      if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
        const parsed = JSON.parse(jsonString);
        setTelemetry(parsed);
      }
    } catch (e) {
      // Trunca fragmentos incompletos de pacotes Bluetooth
    }
  };

  // Envia comando de Reset para o ESP32 (processarComandoBluetooth)
  const resetarTrip = async (tipoTrip) => {
    const comando = tipoTrip === 'A' ? 'RESET_TRIP_A\n' : 'RESET_TRIP_B\n';
    if (device && connected) {
      try {
        await device.write(comando);
        Alert.alert('Sucesso', `Comando de reset da TRIP ${tipoTrip} enviado!`);
      } catch (err) {
        Alert.alert('Erro', 'Falha ao enviar comando via Bluetooth.');
      }
    } else {
      Alert.alert('Aviso', 'Conecte ao Bluetooth do veículo primeiro.');
    }
  };

  // Formata minutos em formato HH:MM
  const formatarTempo = (minutosTotais) => {
    const horas = Math.floor(minutosTotais / 60);
    const mins = Math.floor(minutosTotais % 60);
    return `${horas}h ${mins < 10 ? '0' : ''}${mins}min`;
  };

  // Seleciona os dados da Trip atual
  const tripDados = activeTrip === 'A' ? telemetry.trip_a : telemetry.trip_b;
  const precoLitro = parseFloat(precoCombustivel.replace(',', '.')) || 0;
  const custoTrip = (tripDados.litros * precoLitro).toFixed(2);
  const velMediaTrip = tripDados.tempo_min > 0 
    ? ((tripDados.km / (tripDados.tempo_min / 60)) || 0).toFixed(1) 
    : '0.0';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#121218"
        translucent={false}
      />

      {/* BARRA SUPERIOR (HEADER PROTEGIDO COM MARGEM DA STATUS BAR) */}
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>ASTRA TRIP COMPUTER</Text>
        {telemetry.instantaneo.cutoff ? (
          <View style={styles.cutoffBadge}>
            <Text style={styles.cutoffText}>⚡ CUT-OFF</Text>
          </View>
        ) : (
          <View style={styles.statusDotContainer}>
            <View style={[styles.statusDot, connected ? styles.dotConnected : styles.dotDisconnected]} />
            <Text style={styles.statusDotText}>{connected ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. PAINEL PRINCIPAL (VELOCIDADE & CONSUMO INSTANTÂNEO) */}
        <View style={styles.mainCard}>
          <Text style={styles.cardSectionTitle}>PAINEL INSTANTÂNEO</Text>
          <View style={styles.speedDisplay}>
            <Text style={styles.speedValue}>
              {telemetry.instantaneo.velocidade.toFixed(0)}
            </Text>
            <Text style={styles.speedUnit}>KM/H</Text>
          </View>

          <View style={styles.instantConsumerContainer}>
            <Text style={styles.instantConsumerLabel}>CONSUMO INSTANTÂNEO</Text>
            <Text style={styles.instantConsumerValue}>
              {telemetry.instantaneo.cutoff
                ? '---'
                : telemetry.instantaneo.consumo.toFixed(1)}{' '}
              <Text style={styles.unitHighlight}>{telemetry.instantaneo.unidade}</Text>
            </Text>
          </View>
        </View>

        {/* 2. BLOCO TANQUE & AUTONOMIA */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>NÍVEL DE COMBUSTÍVEL</Text>
            <Text style={styles.fuelLitresText}>
              {telemetry.tanque.litros_restantes.toFixed(1)}L / 57L
            </Text>
          </View>

          {/* Barra de Progresso do Tanque */}
          <View style={styles.gaugeBackground}>
            <View
              style={[
                styles.gaugeFill,
                {
                  width: `${Math.min(Math.max(telemetry.tanque.porcentagem, 0), 100)}%`,
                  backgroundColor:
                    telemetry.tanque.porcentagem <= 15 ? '#E53935' : '#FF6D00',
                },
              ]}
            />
          </View>

          <View style={styles.autonomyRow}>
            <View>
              <Text style={styles.subLabel}>CAPACIDADE</Text>
              <Text style={styles.subValue}>
                {telemetry.tanque.porcentagem.toFixed(0)}%
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.subLabel}>AUTONOMIA ESTIMADA</Text>
              <Text
                style={[
                  styles.subValue,
                  telemetry.tanque.autonomia_km < 50 && styles.lowAutonomyText,
                ]}
              >
                {telemetry.tanque.autonomia_km.toFixed(0)} KM
              </Text>
            </View>
          </View>

          {/* Alerta Dinâmico de Reserva */}
          {telemetry.tanque.autonomia_km > 0 && telemetry.tanque.autonomia_km < 50 && (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>
                ⚠️ ALERTA: Autonomia baixa! Menos de 50 km restantes.
              </Text>
            </View>
          )}
        </View>

        {/* 3. SELETOR DE TRIPS (TRIP A / TRIP B) */}
        <View style={styles.card}>
          <View style={styles.tabSelector}>
            <TouchableOpacity
              style={[styles.tabButton, activeTrip === 'A' && styles.tabButtonActive]}
              onPress={() => setActiveTrip('A')}
            >
              <Text style={[styles.tabText, activeTrip === 'A' && styles.tabTextActive]}>
                TRIP A (TANQUE)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTrip === 'B' && styles.tabButtonActive]}
              onPress={() => setActiveTrip('B')}
            >
              <Text style={[styles.tabText, activeTrip === 'B' && styles.tabTextActive]}>
                TRIP B (VIAGEM)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Métricas da Trip Ativa */}
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>DISTÂNCIA</Text>
              <Text style={styles.gridValue}>
                {tripDados.km.toFixed(1)} <Text style={styles.gridUnit}>km</Text>
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>MÉDIA DE CONSUMO</Text>
              <Text style={styles.gridValue}>
                {tripDados.media_kml.toFixed(1)} <Text style={styles.gridUnit}>km/L</Text>
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>TEMPO DE MOTOR</Text>
              <Text style={styles.gridValueSmall}>
                {formatarTempo(tripDados.tempo_min)}
              </Text>
            </View>

            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>VELOCIDADE MÉDIA</Text>
              <Text style={styles.gridValue}>
                {velMediaTrip} <Text style={styles.gridUnit}>km/h</Text>
              </Text>
            </View>
          </View>

          {/* Bloco Financeiro e Custo */}
          <View style={styles.financeContainer}>
            <View style={styles.priceInputRow}>
              <Text style={styles.financeLabel}>Preço Litro (R$):</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType="numeric"
                value={precoCombustivel}
                onChangeText={setPrecoCombustivel}
              />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.financeLabel}>CUSTO DA VIAGEM</Text>
              <Text style={styles.costValue}>R$ {custoTrip}</Text>
            </View>
          </View>

          {/* Botão Reset da Trip selecionada */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => resetarTrip(activeTrip)}
          >
            <Text style={styles.resetButtonText}>ZERAR TRIP {activeTrip}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 4. BOTÃO DE CONEXÃO FIXO NA PARTE INFERIOR DA TELA (FOOTER) */}
      <View style={styles.bottomBarContainer}>
        <TouchableOpacity
          style={[
            styles.btBottomButton,
            connected ? styles.btBottomConnected : styles.btBottomDisconnected,
          ]}
          onPress={connected ? desconectar : abrirModalConexao}
          activeOpacity={0.8}
        >
          <Text style={styles.btBottomButtonText}>
            {connected
              ? `CONECTADO: ${device.name.toUpperCase()} (DESCONECTAR)`
              : '🔌 CONECTAR BLUETOOTH DO VEÍCULO'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODAL PARA SELEÇÃO DE DISPOSITIVO BLUETOOTH */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o Astra_Trip_Computer</Text>
            <FlatList
              data={pairedDevices}
              keyExtractor={(item) => item.address}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.deviceOption}
                  onPress={() => conectarDispositivo(item)}
                >
                  <Text style={styles.deviceName}>{item.name || 'Sem nome'}</Text>
                  <Text style={styles.deviceAddress}>{item.address}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: STATUSBAR_HEIGHT + 10,
    paddingBottom: 14,
    backgroundColor: '#121218',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A22',
  },
  appTitle: {
    color: '#FF6D00',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  statusDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotConnected: {
    backgroundColor: '#00E676',
  },
  dotDisconnected: {
    backgroundColor: '#FF1744',
  },
  statusDotText: {
    color: '#8E8E9A',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cutoffBadge: {
    backgroundColor: '#00E676',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cutoffText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  mainCard: {
    backgroundColor: '#121218',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderColor: '#FF6D00',
    borderWidth: 1,
  },
  cardSectionTitle: {
    color: '#8E8E9A',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  speedDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  speedValue: {
    color: '#FFF',
    fontSize: 80,
    fontWeight: '800',
    lineHeight: 85,
  },
  speedUnit: {
    color: '#FF6D00',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  instantConsumerContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  instantConsumerLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
  },
  instantConsumerValue: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  unitHighlight: {
    color: '#FF6D00',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#121218',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderColor: '#1E1E28',
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fuelLitresText: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gaugeBackground: {
    height: 12,
    backgroundColor: '#1E1E28',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 6,
  },
  autonomyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
  },
  subValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lowAutonomyText: {
    color: '#FF1744',
  },
  alertBox: {
    backgroundColor: '#330A0A',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderColor: '#FF1744',
    borderWidth: 1,
  },
  alertText: {
    color: '#FF5252',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#1E1E28',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FF6D00',
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#FFF',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#181822',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  gridLabel: {
    color: '#666',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gridValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  gridValueSmall: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  gridUnit: {
    color: '#FF6D00',
    fontSize: 12,
  },
  financeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#181822',
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  financeLabel: {
    color: '#8E8E9A',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    backgroundColor: '#252533',
    color: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    width: 60,
    textAlign: 'center',
  },
  costValue: {
    color: '#00E676',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#2A1010',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderColor: '#D32F2F',
    borderWidth: 1,
  },
  resetButtonText: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  /* FOOTER DO BOTÃO BLUETOOTH */
  bottomBarContainer: {
    backgroundColor: '#0A0A0C',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1A22',
  },
  btBottomButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  btBottomConnected: {
    backgroundColor: '#1B5E20',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  btBottomDisconnected: {
    backgroundColor: '#E65100',
  },
  btBottomButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#121218',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  deviceOption: {
    backgroundColor: '#1E1E28',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceName: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deviceAddress: {
    color: '#AAA',
    fontSize: 11,
  },
  closeModalButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#FF5252',
    fontWeight: 'bold',
  },
});