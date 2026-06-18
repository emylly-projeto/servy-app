import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_KEY = '@memoriza_db';
const SETTINGS_KEY = '@memoriza_settings';

const today = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const seed = {
  users: [
    {
      id: 1,
      nome: 'Ana Silva',
      email: 'seuemail@gmail.com',
      senha: '123456',
      dataCadastro: new Date().toISOString(),
    },
  ],
  tasks: [
    { id: 1, usuarioId: 1, titulo: 'Tomar remédio', descricao: 'Tomar após o café da manhã', data: today(), hora: '08:00', prioridade: 'Alta', repetir: 'Todos os dias', concluida: false, dataCriacao: new Date().toISOString() },
    { id: 2, usuarioId: 1, titulo: 'Estudar para a prova', descricao: 'Revisar o conteúdo principal', data: today(), hora: '14:00', prioridade: 'Média', repetir: 'Nunca', concluida: false, dataCriacao: new Date().toISOString() },
    { id: 3, usuarioId: 1, titulo: 'Reunião de projeto', descricao: 'Alinhar atividades da semana', data: today(), hora: '16:00', prioridade: 'Alta', repetir: 'Toda semana', concluida: false, dataCriacao: new Date().toISOString() },
    { id: 4, usuarioId: 1, titulo: 'Comprar mercado', descricao: 'Comprar itens essenciais', data: tomorrow(), hora: '10:00', prioridade: 'Baixa', repetir: 'Nunca', concluida: false, dataCriacao: new Date().toISOString() },
    { id: 5, usuarioId: 1, titulo: 'Ligar para a mãe', descricao: 'Conversar e confirmar visita', data: tomorrow(), hora: '09:00', prioridade: 'Média', repetir: 'Nunca', concluida: false, dataCriacao: new Date().toISOString() },
    { id: 6, usuarioId: 1, titulo: 'Ler relatório', descricao: 'Finalizar leitura pendente', data: today(), hora: '18:00', prioridade: 'Baixa', repetir: 'Nunca', concluida: true, dataCriacao: new Date().toISOString() },
  ],
};

export async function loadDb() {
  const raw = await AsyncStorage.getItem(DB_KEY);
  if (raw) return JSON.parse(raw);
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(seed));
  return seed;
}

export async function saveDb(db) {
  await AsyncStorage.setItem(DB_KEY, JSON.stringify(db));
}

export async function loadSettings() {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (raw) return JSON.parse(raw);
  return {
    notifications: true,
    sound: true,
    vibration: true,
    reinforcement: true,
    interval: 10,
    darkTheme: false,
  };
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
