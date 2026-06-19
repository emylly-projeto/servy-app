import React, { useEffect, useMemo, useState } from 'react';

import { initializeApp } from "firebase/app";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import { auth } from "./firebase.js";

import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Calendar } from 'react-native-calendars';

import { loadDb, loadSettings, saveDb, saveSettings } from './src/services/storage';
import { scheduleTaskNotifications, sendTestNotification } from './src/services/notifications';

const purple = '#5429CC';
const deepPurple = '#211478';
const bg = '#FAFAFF';
const text = '#111047';
const muted = '#625E7C';

export default function App() {
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState('Splash');
  const [tab, setTab] = useState('Home');
  const [db, setDb] = useState({ users: [], tasks: [] });
  const [settings, setSettings] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [erro, setErro] = useState('');
  

  useEffect(() => {
    async function start() {
      const loadedDb = await loadDb();
      const loadedSettings = await loadSettings();
      setDb(loadedDb);
      setSettings(loadedSettings);
      setReady(true);
      setTimeout(() => setRoute('Login'), 1800);
    }
    start();
  }, []);

  async function handleLogin() {
  setErro('');

  const resultado = await onLogin(email, senha);

  if (resultado?.error) {
    setErro(resultado.error);
  }
}

  async function persist(nextDb) {
    setDb(nextDb);
    await saveDb(nextDb);
  }

  const tasks = useMemo(() => db.tasks.filter((task) => task.usuarioId === user?.id), [db.tasks, user]);
  const pending = tasks.filter((task) => !task.concluida);
  const completed = tasks.filter((task) => task.concluida);
  const todayTasks = tasks.filter((task) => task.data === formatDate(new Date()));
  const nextTask = pending[0];


  /*
  // CÓDIGO DO CONTROLLER PARA LOGIN. //
  */
 
  async function login(email, senha) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);

      const firebaseUser = userCredential.user;

      console.log("Login realizado:", firebaseUser);

      setUser(firebaseUser);

      return {
        success: true,
        message: "Login realizado com sucesso!",
        user: firebaseUser,
      };

    } catch (error) {
      if (error.code === "auth/invalid-credential") {
        return { error: "E-mail ou senha incorretos." };
      }

      return { error: "Erro ao realizar login." };
    }
  }

  /*
  // FIM DO CÓDIGO DO CONTROLLER PARA LOGIN. //
  */

  
  /*
  // CÓDIGO DO CONTROLLER PARA LOGIN COM GOOGLE ( DEMO ). //
  */

  function loginWithGoogle() {
    const demoUser = db.users[0];
    if (!demoUser) {
      Alert.alert('Google', 'Nenhum usuario de demonstracao encontrado.');
      return;
    }
    Alert.alert('Google', 'Login com Google simulado para apresentacao.');
    setUser(demoUser);
    setRoute('App');
  }

  /*
  // FIM DO CÓDIGO DO CONTROLLER PARA LOGIN COM GOOGLE ( DEMO ) //
  */

  /*
  // CÓDIGO DO CONTROLLER PARA REGISTRO. //
  */
 
  async function register(form) {
  try {
    await createUserWithEmailAndPassword(
      auth,
      form.email,
      form.senha
    );

    return {
      success: true,
      message: "Conta criada com sucesso!"
    };

  } catch (error) {
    console.error(error);

    if (error.code === "auth/email-already-in-use") {
      return {
        error: "Este e-mail já está cadastrado."
      };
    }

    if (error.code === "auth/weak-password") {
      return {
        error: "A senha deve ter pelo menos 6 caracteres."
      };
    }

    return {
      error: "Erro ao criar conta."
    };
  }
}

  /*
  // FIM DO CÓDIGO DO CONTROLLER PARA REGISTRO. //
  */

  async function saveTask(form) {
    if (!form.titulo.trim()) {
      Alert.alert('Atenção', 'Informe o título da tarefa.');
      return;
    }
    const task = {
      id: form.id || Date.now(),
      usuarioId: user.id,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      data: form.data,
      hora: form.hora,
      prioridade: form.prioridade,
      repetir: form.repetir,
      concluida: form.concluida || false,
      dataCriacao: form.dataCriacao || new Date().toISOString(),
    };
    const exists = db.tasks.some((item) => item.id === task.id);
    const nextTasks = exists ? db.tasks.map((item) => (item.id === task.id ? task : item)) : [...db.tasks, task];
    await persist({ ...db, tasks: nextTasks });
    await scheduleTaskNotifications(task, settings);
    setEditingTask(null);
    setRoute('App');
  }

  async function updateTask(task) {
    const nextTasks = db.tasks.map((item) => (item.id === task.id ? task : item));
    await persist({ ...db, tasks: nextTasks });
    setSelectedTask(task);
  }

  function confirmComplete(task, nextValue = true) {
    const message = nextValue ? 'Deseja marcar esta tarefa como concluida?' : 'Deseja voltar esta tarefa para pendente?';
    Alert.alert('Confirmar acao', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => updateTask({ ...task, concluida: nextValue }) },
    ]);
  }

  async function deleteTask(task) {
    await persist({ ...db, tasks: db.tasks.filter((item) => item.id !== task.id) });
    setSelectedTask(null);
    setRoute('App');
  }

  async function updateSettings(nextSettings) {
    setSettings(nextSettings);
    await saveSettings(nextSettings);
  }

  if (!ready || route === 'Splash') return <SplashScreen />;
  if (route === 'Login')
    return (
      <LoginScreen
        onLogin={login}
        onGoogle={loginWithGoogle}
        onRegister={() => setRoute('Register')}
        setRoute={setRoute}
      />
    );
  if (route === 'Register') return <RegisterScreen onBack={() => setRoute('Login')} onSubmit={register} />;
  if (route === 'AddTask') return <TaskFormScreen task={editingTask} onBack={() => setRoute('App')} onSubmit={saveTask} />;
  if (route === 'ForgotPassword') return <ForgotPasswordScreen onBack={() => setRoute('Login')} />;
  if (route === 'Detail') return <TaskDetailScreen task={selectedTask} onBack={() => setRoute('App')} onEdit={(task) => { setEditingTask(task); setRoute('AddTask'); }} onDone={(task) => confirmComplete(task, true)} onDelete={deleteTask} />;
  if (route === 'Notification') return <NotificationScreen onBack={() => setRoute('App')} />;
  if (route === 'Reinforcement') return <ReinforcementScreen onBack={() => setRoute('App')} />;
  if (route === 'Widget') return <WidgetPreviewScreen onBack={() => setRoute('App')} nextTask={nextTask} pending={pending.length} />;

  return (
    <View style={styles.app}>
      <ExpoStatusBar style="dark" />
      {tab === 'Home' && (
        <HomeScreen
          user={user}
          pending={pending}
          completed={completed}
          todayTasks={todayTasks}
          nextTask={nextTask}
          onAdd={() => { setEditingTask(null); setRoute('AddTask'); }}
          onDetail={(task) => { setSelectedTask(task); setRoute('Detail'); }}
          onDone={(task) => confirmComplete(task, true)}
          onPreview={(nextRoute) => setRoute(nextRoute)}
        />
      )}
      {tab === 'Tasks' && (
        <TasksScreen
          pending={pending}
          completed={completed}
          onAdd={() => { setEditingTask(null); setRoute('AddTask'); }}
          onDetail={(task) => { setSelectedTask(task); setRoute('Detail'); }}
          onDone={(task) => confirmComplete(task, !task.concluida)}
          onEdit={(task) => { setEditingTask(task); setRoute('AddTask'); }}
          onDelete={deleteTask}
        />
      )}
      {tab === 'Calendar' && <CalendarScreen tasks={tasks} onDetail={(task) => { setSelectedTask(task); setRoute('Detail'); }} onAdd={() => setRoute('AddTask')} />}
      {tab === 'Settings' && <SettingsScreen settings={settings} onChange={updateSettings} />}
      <BottomNav tab={tab} setTab={setTab} />
    </View>
  );
}

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <View style={styles.brandRow}>
        <LogoBox />
        <Text style={styles.brandText}>Memoriza</Text>
      </View>
      <Text style={styles.splashSubtitle}>Seu aliado para lembrar{'\n'}o que realmente importa.</Text>
      <View style={styles.splashCard}>
        <Text style={styles.bigLogo}>🧠🔔</Text>
        <Text style={styles.splashTitle}>Memoriza</Text>
        <Text style={styles.splashCopy}>Organize sua mente,{'\n'}nunca esqueça o que{'\n'}é importante.</Text>
        <View style={styles.loadingDot} />
      </View>
    </View>
  );
}

function LoginScreen({ onLogin, onGoogle, onRegister, setRoute }) {
const [email, setEmail] = useState('');
const [senha, setSenha] = useState('');
const [erro, setErro] = useState('');
const [sucesso, setSucesso] = useState('');
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.authContent}>
        <Text style={styles.authLogo}>Memoriza</Text>
        <Text style={styles.authTitle}>Bem-vindo de volta!</Text>
        <Text style={styles.authSubtitle}>Faça login para continuar</Text>
        <Input
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="seuemail@gmail.com"
        />

        <Input
          label="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          placeholder="Digite sua senha"
        />
        {erro ? (
          <Text style={{ color: 'red', marginBottom: 10 }}>
            {erro}
          </Text>
        ) : null}

        {sucesso ? (
          <Text style={{ color: 'green', marginBottom: 10 }}>
            {sucesso}
          </Text>
        ) : null}
        <Text style={styles.forgot} onPress={() => setRoute('ForgotPassword')}>Esqueceu sua senha?</Text>
        <Button
          title="Entrar"
          onPress={async () => {
            setErro('');
            setSucesso('');

            const resultado = await onLogin(email, senha);

            if (resultado?.error) {
              setErro(resultado.error);
            }
            if (resultado?.success) {
              setSucesso(resultado.message);

              setTimeout(() => {
                setRoute('App');
              }, 1500);
            }
          }}
        />
        <View style={styles.orRow}><View style={styles.line} /><Text style={styles.or}>ou</Text><View style={styles.line} /></View>
        <Pressable style={styles.googleButton} onPress={onGoogle}><Text style={styles.googleText}>G  Entrar com Google</Text></Pressable>
        <Text style={styles.bottomLink}>Não tem uma conta? <Text style={styles.link} onPress={onRegister}>Cadastre-se</Text></Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
function ForgotPasswordScreen({ onBack }) {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  return (
    <ScreenHeader title="Esqueci minha senha" onBack={onBack}>
      <View style={{ marginTop: 16 }}>
        <Text style={styles.authSubtitle}>
          Digite seu e-mail e enviaremos as instruções para redefinir sua senha.
        </Text>
        <Input
          label="E-mail"
          value={email}
          onChangeText={(v) => { setEmail(v); setErro(''); setEnviado(false); }}
          keyboardType="email-address"
          placeholder="seuemail@gmail.com"
        />
        {erro ? (
          <Text style={{ color: 'red', fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>
            {erro}
          </Text>
        ) : null}
        {enviado ? (
          <Text style={{ color: '#238C44', fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>
             E-mail enviado! Verifique sua caixa de entrada.
          </Text>
        ) : null}
        <Button
          title={carregando ? 'Enviando...' : 'Enviar Senha'}
          onPress={async () => {
            setErro('');
            setEnviado(false);

            if (!email.trim()) {
              setErro('Informe seu e-mail.');
              return;
            }

            setCarregando(true);
            try {
              await sendPasswordResetEmail(auth, email.trim());
              setEnviado(true);
            } catch (error) {
              if (error.code === 'auth/user-not-found') {
                setErro('Nenhuma conta encontrada com este e-mail.');
              } else if (error.code === 'auth/invalid-email') {
                setErro('E-mail inválido.');
              } else {
                setErro('Não foi possível enviar o e-mail. Tente novamente.');
              }
            } finally {
              setCarregando(false);
            }
          }}
        />
      </View>
    </ScreenHeader>
  );
}

function RegisterScreen({ onBack, onSubmit }) {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '', accepted: false });
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  return (
    <ScreenHeader title="Criar conta" onBack={onBack}>
      <Text style={styles.authSubtitle}>Vamos começar!</Text>
    <Input
      label="Nome completo"
      value={form.nome}
      onChangeText={(v) => setForm({ ...form, nome: v })}
      placeholder="Seu nome"
    />

    <Input
      label="E-mail"
      value={form.email}
      onChangeText={(v) => setForm({ ...form, email: v })}
      placeholder="seuemail@gmail.com"
    />

    <Input
      label="Senha"
      value={form.senha}
      onChangeText={(v) => setForm({ ...form, senha: v })}
      placeholder="Digite sua senha"
      secureTextEntry
    />

    <Input
      label="Confirmar senha"
      value={form.confirmar}
      onChangeText={(v) => setForm({ ...form, confirmar: v })}
      placeholder="Repita sua senha"
      secureTextEntry
    />
      <Pressable style={styles.checkRow} onPress={() => setForm({ ...form, accepted: !form.accepted })}>
        <View style={[styles.checkbox, form.accepted && styles.checkboxOn]}><Text style={styles.checkText}>{form.accepted ? '✓' : ''}</Text></View>
        <Text>Eu concordo com os <Text style={styles.link}>Termos de Uso</Text></Text>
      </Pressable>
      {erro ? (
      <Text style={{ color: 'red', marginBottom: 10 }}>
        {erro}
      </Text>
    ) : null}

    {sucesso ? (
      <Text style={{ color: 'green', marginBottom: 10 }}>
        {sucesso}
      </Text>
    ) : null}
      <Button
        title="Cadastrar"
        onPress={async () => {
          setErro('');
          setSucesso('');

          const resultado = await onSubmit(form);

          if (resultado?.error) {
            setErro(resultado.error);
          }

          if (resultado?.success) {
            setSucesso(resultado.message);

            setTimeout(() => {
              onBack();
            }, 1500);
          }
        }}
      />
      <Pressable onPress={onBack}><Text style={styles.bottomLink}>Já tem uma conta? <Text style={styles.link}>Entrar</Text></Text></Pressable>
    </ScreenHeader>
  );
}

function HomeScreen({ user, pending, completed, todayTasks, nextTask, onAdd, onDetail, onDone, onPreview }) {
  return (
    <Screen>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.h1}>Olá, {user?.displayName || user?.nome || user?.email?.split('@')[0] || 'Usuário'}! 👋</Text>
          <Text style={styles.sub}>Vamos ter um dia incrível!</Text>
        </View>
        <Pressable onPress={() => onPreview('Notification')}><Text style={styles.navIcon}>🔔</Text></Pressable>
      </View>
      <Card>
        <Text style={styles.cardLabel}>Próxima tarefa</Text>
        {nextTask ? (
          <Pressable style={styles.nextRow} onPress={() => onDetail(nextTask)}>
            <View style={styles.iconBubble}><Text style={styles.taskEmoji}>💊</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{nextTask.titulo}</Text>
              <Text style={styles.taskMeta}>Hoje, {nextTask.hora}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ) : <Text>Nenhuma tarefa pendente.</Text>}
      </Card>
      <View style={styles.statsRow}>
        <Stat label="Pendentes" value={pending.length} bg="#F0EAFE" color={purple} />
        <Stat label="Concluídas" value={completed.length} bg="#EAF7E9" color="#238C44" />
        <Stat label="Hoje" value={todayTasks.length} bg="#EAF1FF" color="#1B68D1" />
      </View>
      <View style={styles.previewButtons}>
        <MiniButton title="Notificação" onPress={() => onPreview('Notification')} />
        <MiniButton title="Reforço" onPress={() => onPreview('Reinforcement')} />
        <MiniButton title="Widget" onPress={() => onPreview('Widget')} />
      </View>
      <Text style={styles.sectionTitle}>Minhas tarefas</Text>
      <Card style={{ paddingVertical: 6 }}>
        {pending.slice(0, 4).map((task) => <TaskItem key={task.id} task={task} onPress={() => onDetail(task)} onDone={() => onDone(task)} />)}
      </Card>
      <Fab onPress={onAdd} />
    </Screen>
  );
}

function TasksScreen({ pending, completed, onAdd, onDetail, onDone, onEdit, onDelete }) {
  const [active, setActive] = useState('Pendentes');
  const items = active === 'Pendentes' ? pending : completed;
  return (
    <Screen>
      <View style={styles.topRow}>
        <Text style={styles.h1}>Minhas tarefas</Text>
        <Text style={styles.navIcon}>⌕ ⋮</Text>
      </View>
      <View style={styles.tabs}>
        {['Pendentes', 'Concluídas'].map((item) => (
          <Pressable key={item} style={[styles.tabPill, active === item && styles.tabPillOn]} onPress={() => setActive(item)}>
            <Text style={[styles.tabText, active === item && styles.tabTextOn]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <TaskItem task={item} onPress={() => onDetail(item)} onDone={() => onDone(item)} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} menu />}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma tarefa encontrada.</Text>}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <Fab onPress={onAdd} />
    </Screen>
  );
}

function TaskFormScreen({ task, onBack, onSubmit }) {
  const [form, setForm] = useState(task || {
    titulo: 'Tomar remédio',
    descricao: 'Tomar após o café da manhã',
    data: formatDate(new Date()),
    hora: '08:00',
    repetir: 'Todos os dias',
    prioridade: 'Baixa',
  });
  return (
    <ScreenHeader title={task ? 'Editar tarefa' : 'Nova tarefa'} onBack={onBack}>
      <Input label="Título *" value={form.titulo} onChangeText={(v) => setForm({ ...form, titulo: v })} />
      <Input label="Descrição" value={form.descricao} onChangeText={(v) => setForm({ ...form, descricao: v })} multiline />
      <Input label="Data" value={form.data} onChangeText={(v) => setForm({ ...form, data: v })} />
      <Input label="Hora" value={form.hora} onChangeText={(v) => setForm({ ...form, hora: v })} />
      <Text style={styles.label}>Repetir</Text>
      <View style={styles.selectBox}><Text>{form.repetir}</Text><Text>⌄</Text></View>
      <Text style={styles.label}>Prioridade</Text>
      <View style={styles.priorityRow}>
        {['Baixa', 'Média', 'Alta'].map((item) => <PriorityPill key={item} item={item} selected={form.prioridade === item} onPress={() => setForm({ ...form, prioridade: item })} />)}
      </View>
      <Button title="Salvar tarefa" onPress={() => onSubmit(form)} />
    </ScreenHeader>
  );
}

function TaskDetailScreen({ task, onBack, onEdit, onDone, onDelete }) {
  if (!task) return null;
  return (
    <ScreenHeader title="Detalhes da tarefa" onBack={onBack} action="✎" onAction={() => onEdit(task)}>
      <View style={styles.detailCenter}>
        <View style={styles.detailIcon}><Text style={{ fontSize: 48 }}>💊</Text></View>
        <Text style={styles.detailTitle}>{task.titulo}</Text>
        <Text style={[styles.priorityBadge, { color: priorityColor(task.prioridade), backgroundColor: `${priorityColor(task.prioridade)}20` }]}>{task.prioridade} prioridade</Text>
      </View>
      <View style={styles.divider} />
      <DetailRow icon="📅" text={task.data} />
      <DetailRow icon="🕘" text={task.hora} />
      <DetailRow icon="🔁" text={`Repetir: ${task.repetir}`} />
      <DetailRow icon="📝" text={task.descricao} />
      <View style={{ height: 40 }} />
      <Button title={task.concluida ? 'Tarefa concluída' : 'Marcar como concluída'} onPress={() => onDone(task)} />
      <Pressable onPress={() => onDelete(task)}><Text style={styles.deleteText}>Excluir tarefa</Text></Pressable>
    </ScreenHeader>
  );
}

function CalendarScreen({ tasks, onDetail, onAdd }) {
  const [selected, setSelected] = useState(toIsoDate(new Date()));
  const selectedBr = isoToBr(selected);
  const dayTasks = tasks.filter((task) => task.data === selectedBr);
  const marked = {};
  tasks.forEach((task) => { marked[brToIso(task.data)] = { marked: true, dotColor: '#FF3048' }; });
  marked[selected] = { ...(marked[selected] || {}), selected: true, selectedColor: purple };
  return (
    <Screen>
      <Text style={styles.h1}>Calendário</Text>
      <Calendar
        current={selected}
        markedDates={marked}
        onDayPress={(day) => setSelected(day.dateString)}
        theme={{ selectedDayBackgroundColor: purple, todayTextColor: purple, arrowColor: purple }}
      />
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>{selectedBr}</Text>
      {dayTasks.map((task) => <TaskItem key={task.id} task={task} onPress={() => onDetail(task)} />)}
      {dayTasks.length === 0 && <Text style={styles.empty}>Nenhuma tarefa para esta data.</Text>}
      <Fab onPress={onAdd} />
    </Screen>
  );
}

function SettingsScreen({ settings, onChange }) {
  return (
    <Screen>
      <Text style={styles.h1}>Configurações</Text>
      <Text style={styles.sectionTitle}>Notificações</Text>
      <Card>
        <Setting label="Ativar notificações" value={settings.notifications} onValueChange={(v) => onChange({ ...settings, notifications: v })} />
        <Setting label="Som" value={settings.sound} onValueChange={(v) => onChange({ ...settings, sound: v })} />
        <Setting label="Vibração" value={settings.vibration} onValueChange={(v) => onChange({ ...settings, vibration: v })} />
      </Card>
      <Text style={styles.sectionTitle}>Reforço de lembretes</Text>
      <Card>
        <Setting label="Ativar reforço automático" value={settings.reinforcement} onValueChange={(v) => onChange({ ...settings, reinforcement: v })} />
        <View style={styles.settingRow}><Text>Intervalo do reforço</Text><Text>{settings.interval} minutos ›</Text></View>
      </Card>
      <Text style={styles.sectionTitle}>Outros</Text>
      <Card>
        <Setting label="Tema claro/escuro" value={settings.darkTheme} onValueChange={(v) => onChange({ ...settings, darkTheme: v })} />
        <View style={styles.settingRow}><Text>Sobre o app</Text><Text>›</Text></View>
      </Card>
    </Screen>
  );
}

function NotificationScreen({ onBack }) {
  return (
    <View style={styles.lockScreen}>
      <Pressable onPress={onBack} style={styles.backFloat}><Text style={{ color: 'white' }}>‹ Voltar</Text></Pressable>
      <Text style={styles.lockTime}>08:00</Text>
      <Text style={styles.lockDate}>Quinta-feira, 5 de junho</Text>
      <View style={styles.notificationCard}>
        <Text style={{ fontWeight: '900' }}>Memoriza <Text style={styles.timeSmall}>agora</Text></Text>
        <Text style={{ marginTop: 8 }}>Hora de tomar o remédio! 💊{'\n'}Não se esqueça de cuidar de você! 💜</Text>
      </View>
      <Text style={styles.unlock}>deslize para desbloquear</Text>
    </View>
  );
}

function ReinforcementScreen({ onBack }) {
  const reminders = [
    ['agora', 'Hora de tomar o remédio! 💊', 'Não se esqueça de cuidar de você! 💜'],
    ['10 min depois', 'Você já tomou seu remédio? 🤔', 'Sua saúde importa!'],
    ['20 min depois', 'Ainda não marcou como concluída.', 'Vamos lá! Você consegue! 💪'],
    ['30 min depois', 'Tarefa ainda pendente.', 'Clique para marcar como concluída. ✅'],
  ];
  return (
    <ScreenHeader title="Reforço de notificações" onBack={onBack}>
      {reminders.map((item, index) => (
        <React.Fragment key={item[0]}>
          <Card>
            <Text style={styles.cardLabel}>Memoriza <Text style={styles.timeSmall}>{item[0]}</Text></Text>
            <Text style={styles.taskTitle}>{item[1]}</Text>
            <Text>{item[2]}</Text>
          </Card>
          {index < reminders.length - 1 && <Text style={styles.downArrow}>↓</Text>}
        </React.Fragment>
      ))}
    </ScreenHeader>
  );
}

function WidgetPreviewScreen({ onBack, nextTask, pending }) {
  return (
    <View style={styles.widgetScreen}>
      <Pressable onPress={onBack} style={styles.backFloat}><Text style={{ color: 'white' }}>‹ Voltar</Text></Pressable>
      <View style={styles.widgetCard}>
        <Text style={styles.cardLabel}>Memoriza 🔔</Text>
        <Text style={[styles.cardLabel, { marginTop: 20 }]}>Próxima tarefa</Text>
        <View style={styles.nextRow}>
          <View style={styles.iconBubble}><Text style={styles.taskEmoji}>💊</Text></View>
          <View>
            <Text style={styles.taskTitle}>{nextTask?.titulo || 'Nenhuma tarefa'}</Text>
            <Text style={styles.taskMeta}>Hoje, {nextTask?.hora || '--:--'}</Text>
          </View>
        </View>
        <Text style={[styles.cardLabel, { marginTop: 14 }]}>Pendentes</Text>
        <Text style={styles.link}>{pending} tarefas</Text>
      </View>
    </View>
  );
}

function Screen({ children }) {
  return <View style={styles.screen}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>{children}</ScrollView></View>;
}

function ScreenHeader({ title, onBack, children, action, onAction }) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.headerTitle}>{title}</Text><Pressable onPress={onAction}><Text style={styles.back}>{action || ''}</Text></Pressable></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>{children}</ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({ label, ...props }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#AAA6BE" style={[styles.input, props.multiline && { height: 88, textAlignVertical: 'top' }]} {...props} />
    </View>
  );
}

function Button({ title, onPress }) {
  return <Pressable onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}

function MiniButton({ title, onPress }) {
  return <Pressable onPress={onPress} style={styles.miniButton}><Text style={styles.miniButtonText}>{title}</Text></Pressable>;
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Stat({ label, value, bg: backgroundColor, color }) {
  return <View style={[styles.stat, { backgroundColor }]}><Text style={[styles.statLabel, { color }]}>{label}</Text><Text style={[styles.statValue, { color }]}>{value}</Text></View>;
}

function TaskItem({ task, onPress, onDone, onEdit, onDelete, menu }) {
  return (
    <Pressable style={styles.taskItem} onPress={onPress}>
      <View style={[styles.iconBubble, { backgroundColor: `${priorityColor(task.prioridade)}18` }]}><Text>{taskIcon(task.titulo)}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.taskTitle}>{task.titulo}</Text>
        <Text style={styles.taskMeta}>{task.data === formatDate(new Date()) ? 'Hoje' : task.data}, {task.hora}</Text>
      </View>
      <Text style={[styles.prioritySmall, { color: priorityColor(task.prioridade), backgroundColor: `${priorityColor(task.prioridade)}18` }]}>{task.prioridade}</Text>
      {onDone && <Pressable onPress={onDone}><Text style={styles.circle}>{task.concluida ? '✓' : '○'}</Text></Pressable>}
      {menu && <Pressable onPress={() => Alert.alert('Tarefa', 'Escolha uma ação', [{ text: 'Editar', onPress: onEdit }, { text: 'Excluir', onPress: onDelete, style: 'destructive' }, { text: 'Cancelar', style: 'cancel' }])}><Text style={styles.menu}>⋮</Text></Pressable>}
    </Pressable>
  );
}

function PriorityPill({ item, selected, onPress }) {
  const color = priorityColor(item);
  return <Pressable onPress={onPress} style={[styles.priorityPill, selected && { backgroundColor: color }]}><Text style={{ color: selected ? 'white' : color, fontWeight: '800' }}>{item}</Text></Pressable>;
}

function DetailRow({ icon, text: value }) {
  return <View style={styles.detailRow}><Text style={styles.detailIconText}>{icon}</Text><Text style={styles.detailText}>{value}</Text></View>;
}

function Setting({ label, value, onValueChange }) {
  return <View style={styles.settingRow}><Text>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ true: purple }} /></View>;
}

function BottomNav({ tab, setTab }) {
  const items = [['Home', '⌂', 'Início'], ['Tasks', '▣', 'Tarefas'], ['Calendar', '□', 'Calendário'], ['Settings', '⚙', 'Ajustes']];
  return <View style={styles.bottomNav}>{items.map(([key, icon, label]) => <Pressable key={key} style={styles.navItem} onPress={() => setTab(key)}><Text style={[styles.navIconSmall, tab === key && { color: purple }]}>{icon}</Text><Text style={[styles.navLabel, tab === key && { color: purple }]}>{label}</Text></Pressable>)}</View>;
}

function Fab({ onPress }) {
  return <Pressable onPress={onPress} style={styles.fab}><Text style={styles.fabText}>+</Text></Pressable>;
}

function LogoBox() {
  return <View style={styles.logoBox}><Text style={styles.logoEmoji}>🧠</Text></View>;
}

function priorityColor(priority) {
  if (priority === 'Alta') return '#FF3048';
  if (priority === 'Média') return '#F4A621';
  return '#37A85C';
}

function taskIcon(title) {
  const lower = title.toLowerCase();
  if (lower.includes('remédio') || lower.includes('remedio')) return '💊';
  if (lower.includes('estudar') || lower.includes('prova')) return '📘';
  if (lower.includes('reunião') || lower.includes('reuniao')) return '👥';
  if (lower.includes('comprar')) return '🛒';
  if (lower.includes('ligar')) return '📞';
  return '🔔';
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function brToIso(value) {
  const [d, m, y] = value.split('/');
  return `${y}-${m}-${d}`;
}

function isoToBr(value) {
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: bg },
  screen: { flex: 1, backgroundColor: bg, paddingTop: StatusBar.currentHeight || 42, paddingHorizontal: 22 },
  splash: { flex: 1, backgroundColor: bg, padding: 28, alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  logoBox: { width: 68, height: 68, borderRadius: 18, backgroundColor: purple, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 34 },
  brandText: { marginLeft: 14, fontSize: 34, color: deepPurple, fontWeight: '900' },
  splashSubtitle: { marginTop: 24, textAlign: 'center', fontSize: 18, lineHeight: 25, color: text },
  splashCard: { marginTop: 22, width: '100%', flex: 1, maxHeight: 430, borderRadius: 34, backgroundColor: deepPurple, alignItems: 'center', justifyContent: 'center', padding: 26 },
  bigLogo: { fontSize: 72 },
  splashTitle: { color: 'white', fontSize: 34, fontWeight: '900', marginTop: 10 },
  splashCopy: { color: 'white', textAlign: 'center', marginTop: 12, lineHeight: 20 },
  loadingDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'white', marginTop: 24 },
  authContent: { paddingTop: 70, paddingBottom: 40 },
  authLogo: { color: purple, fontSize: 30, fontWeight: '900', textAlign: 'center' },
  authTitle: { fontWeight: '900', textAlign: 'center', marginTop: 8 },
  authSubtitle: { color: muted, textAlign: 'center', marginBottom: 28 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '800', marginBottom: 8, color: text },
  input: { height: 52, borderWidth: 1, borderColor: '#E0DFF0', borderRadius: 12, paddingHorizontal: 14, backgroundColor: 'white', color: text },
  forgot: { alignSelf: 'flex-end', color: purple, fontSize: 12, fontWeight: '800', marginBottom: 16 },
  button: { height: 54, backgroundColor: purple, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonText: { color: 'white', fontWeight: '900' },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: '#E2DFED' },
  or: { marginHorizontal: 12, color: muted },
  googleButton: { height: 52, borderWidth: 1, borderColor: '#E0DFF0', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  googleText: { fontWeight: '800' },
  bottomLink: { textAlign: 'center', marginTop: 28, color: muted },
  link: { color: purple, fontWeight: '900' },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { fontSize: 30, color: text, minWidth: 32 },
  headerTitle: { fontWeight: '900', fontSize: 17 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: '#1B2458', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: purple, borderColor: purple },
  checkText: { color: 'white', fontWeight: '900' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  h1: { fontSize: 22, fontWeight: '900', color: text },
  sub: { color: muted, marginTop: 4 },
  navIcon: { fontSize: 22, color: text },
  card: { backgroundColor: 'white', borderWidth: 1, borderColor: '#E7E4F5', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardLabel: { color: purple, fontWeight: '900', fontSize: 13 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  iconBubble: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F0EAFE', alignItems: 'center', justifyContent: 'center' },
  taskEmoji: { fontSize: 22 },
  taskTitle: { color: text, fontWeight: '900' },
  taskMeta: { color: muted, fontSize: 12, marginTop: 3 },
  chevron: { fontSize: 28, color: text },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  stat: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  statLabel: { fontSize: 11, fontWeight: '800' },
  statValue: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  previewButtons: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  miniButton: { flex: 1, backgroundColor: '#F0EAFE', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  miniButtonText: { color: purple, fontWeight: '800', fontSize: 12 },
  sectionTitle: { fontSize: 16, color: text, fontWeight: '900', marginBottom: 10, marginTop: 6 },
  fab: {
    position: "absolute",
    right: 22,
    bottom: 9,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: purple,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  fabText: { color: 'white', fontSize: 32, marginTop: -2 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  tabPill: { flex: 1, height: 42, borderRadius: 12, backgroundColor: '#F1EFF9', alignItems: 'center', justifyContent: 'center' },
  tabPillOn: { backgroundColor: purple },
  tabText: { color: text, fontWeight: '800' },
  tabTextOn: { color: 'white' },
  taskItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0EEF7' },
  prioritySmall: { fontSize: 11, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  circle: { fontSize: 24, color: '#1B2458' },
  menu: { fontSize: 22, color: muted },
  empty: { color: muted, textAlign: 'center', marginTop: 30 },
  selectBox: { height: 52, borderWidth: 1, borderColor: '#E0DFF0', borderRadius: 12, paddingHorizontal: 14, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  priorityPill: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#E0DFF0', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
  detailCenter: { alignItems: 'center', paddingVertical: 24 },
  detailIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#FFE0E7', alignItems: 'center', justifyContent: 'center' },
  detailTitle: { marginTop: 18, fontSize: 22, fontWeight: '900', color: text },
  priorityBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, fontWeight: '900', overflow: 'hidden' },
  divider: { height: 1, backgroundColor: '#E8E5F1', marginVertical: 18 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  detailIconText: { fontSize: 20, width: 28 },
  detailText: { fontWeight: '700', color: text, flex: 1 },
  deleteText: { color: 'red', textAlign: 'center', fontWeight: '800', marginTop: 18 },
  settingRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lockScreen: { flex: 1, padding: 28, alignItems: 'center', backgroundColor: '#6F4CC8' },
  backFloat: { position: 'absolute', top: 44, left: 22, zIndex: 2 },
  lockTime: { color: 'white', fontSize: 56, fontWeight: '300', marginTop: 86 },
  lockDate: { color: 'white', marginTop: 4 },
  notificationCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 16, padding: 16, marginTop: 70 },
  timeSmall: { color: muted, fontSize: 11, fontWeight: '500' },
  unlock: { color: 'white', position: 'absolute', bottom: 34 },
  downArrow: { textAlign: 'center', color: purple, fontSize: 26, marginTop: -10, marginBottom: 6 },
  widgetScreen: { flex: 1, backgroundColor: deepPurple, alignItems: 'center', justifyContent: 'center', padding: 26 },
  widgetCard: { width: '100%', backgroundColor: '#F7F3FF', borderRadius: 18, padding: 20 },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 76, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E8E5F1', flexDirection: 'row', paddingTop: 8 },
  navItem: { flex: 1, alignItems: 'center' },
  navIconSmall: { fontSize: 20, color: '#1B2458' },
  navLabel: { fontSize: 11, color: '#1B2458', marginTop: 2, fontWeight: '700' },
});
