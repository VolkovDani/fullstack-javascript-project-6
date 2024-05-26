// @ts-check

export default {
  translation: {
    appName: 'Менеджер задач',
    flash: {
      tasks: {
        patch: {
          success: 'Задача успешно изменена',
          error: 'Не удалось изменить задачу',
        },
        create: {
          success: 'Задача успешно создана',
          error: 'Не удалось создать задачу',
        },
        edit: {
          errorAccess: 'Задачу может удалить только её автор',
        },

      },
      session: {
        create: {
          success: 'Вы залогинены',
          error: 'Неправильный емейл или пароль',
        },
        delete: {
          success: 'Вы разлогинены',
        },
        patch: {
          errorAccess: 'Вы не можете редактировать или удалять другого пользователя',
        },
      },
      users: {
        create: {
          error: 'Не удалось зарегистрировать',
          success: 'Пользователь успешно зарегистрирован',
        },
        editPage: {
          error: 'Вы не можете редактировать или удалять другого пользователя',
        },
        delete: {
          success: 'Пользователь успешно удалён',
          errorAccess: 'Вы не можете редактировать или удалять другого пользователя',
        },
      },
      statuses: {
        create: {
          success: 'Статус успешно создан',
          error: 'Не удалось создать статус',
        },
        patch: {
          success: 'Статус успешно изменён',
          error: 'Не удалось изменить статус',
        },
        delete: {
          success: 'Статус успешно удалён',
          error: 'Не удалось удалить статус',
        },
      },
      authError: 'Доступ запрещён! Пожалуйста, авторизируйтесь.',
    },
    layouts: {
      application: {
        users: 'Пользователи',
        statuses: 'Статусы',
        signIn: 'Вход',
        signUp: 'Регистрация',
        signOut: 'Выход',
        tasks: 'Задачи',
      },
    },
    mixins: {
      forms: {
        statusName: 'Наименование',
        firstName: 'Имя',
        lastName: 'Фамилия',
        email: 'Email',
        password: 'Пароль',
        name: 'Наименование',
        description: 'Описание',
      },
      labels: {
        statusId: 'Статус',
        executorId: 'Исполнитель',
        labelId: 'Метка',
      },
    },
    views: {
      statuses: {
        index: 'Статусы',
        id: 'ID',
        statusName: 'Наименование',
        createdAt: 'Дата создания',
        actionButtons: {
          create: 'Создать статус',
          edit: 'Изменить',
          delete: 'Удалить',
        },
        new: {
          title: 'Создание статуса',
          submit: 'Создать',
        },
        edit: {
          title: 'Изменение статуса',
          submit: 'Изменить',
        },
      },
      task: {
        author: 'Автор',
        executor: 'Исполнитель',
        createdAt: 'Дата создания',
        actionButtons: {
          edit: ' Изменить',
          delete: 'Удалить',
        },
      },
      tasks: {
        edit: 'Изменение задачи',
        new: 'Создание задачи',
        index: 'Задачи',
        id: 'ID',
        taskName: 'Наименование',
        statusName: 'Статус',
        author: 'Автор',
        executer: 'Исполнитель',
        createdAt: 'Дата создания',
        actionButtons: {
          edit: 'Изменить',
          delete: 'Удалить',
          checkMyTasks: 'Только мои задачи',
          create: 'Создать задачу',
        },
        submit: 'Создать',
      },
      session: {
        new: {
          signIn: 'Вход',
          submit: 'Войти',
        },
      },
      users: {
        edit: 'Изменение пользователя',
        id: 'ID',
        fullName: 'Полное имя',
        email: 'Email',
        createdAt: 'Дата создания',
        actions: 'Действия',
        actionButtons: {
          edit: 'Изменить',
          delete: 'Удалить',
        },
        new: {
          submit: 'Сохранить',
          signUp: 'Регистрация',
        },
      },
      welcome: {
        index: {
          hello: 'Привет от Хекслета!',
          description: 'Практические курсы по программированию',
          more: 'Узнать Больше',
        },
      },
    },
  },
};
