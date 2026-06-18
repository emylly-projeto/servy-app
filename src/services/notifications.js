import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function taskDate(task) {
  const [day, month, year] = task.data.split('/').map(Number);
  const [hour, minute] = task.hora.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

export async function scheduleTaskNotifications(task, settings) {
  if (!settings.notifications) return;
  const allowed = await requestNotificationPermission();
  if (!allowed) return;
  const firstDate = taskDate(task);
  if (firstDate <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Memoriza',
      body: `Hora de ${task.titulo.toLowerCase()}.`,
      data: { taskId: task.id },
    },
    trigger: firstDate,
  });

  if (!settings.reinforcement) return;

  const messages = [
    [10, 'Você já concluiu esta tarefa?'],
    [20, 'Esta tarefa ainda está pendente.'],
    [30, 'Clique para marcar como concluída.'],
  ];

  for (const [minutes, body] of messages) {
    const date = new Date(firstDate.getTime() + minutes * 60000);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Memoriza', body, data: { taskId: task.id } },
      trigger: date,
    });
  }
}

export async function sendTestNotification() {
  const allowed = await requestNotificationPermission();
  if (!allowed) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Memoriza',
      body: 'Hora de tomar o remedio.',
    },
    trigger: null,
  });
  return true;
}
