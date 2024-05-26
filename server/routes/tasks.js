// @ts-check
import i18next from 'i18next';
import _ from 'lodash';

export default (app) => {
  app
    .get(
      '/tasks',
      { name: 'tasks', preValidation: app.authenticate },
      async (req, reply) => {
        const isCurrentUserTasks = () => {
          if (!_.isEmpty(req.query.isCreatorUser)) {
            const currentUser = req.session.get('passport').id;
            return currentUser;
          }
          return null;
        };

        const tasks = await app.objection.models.task.query()
          .withGraphJoined('status')
          .withGraphJoined('creator')
          .withGraphJoined('executor')
          .modify('findCreator', isCurrentUserTasks())
          .modify('findStatus', req.query.statusId)
          .modify('findExecutor', req.query.executorId);

        const statuses = await app.objection.models.status
          .query()
          .then((data) => data.map(({ id, statusName }) => ({ id, name: statusName })));
        const executors = await app.objection.models.user
          .query()
          .then((data) => data.map(({ id, firstName, lastName }) => ({ id, name: `${firstName} ${lastName}` })));
        const labels = [];
        reply.render('tasks/index', {
          tasks, statuses, executors, labels,
        });
        return reply;
      },
    )
    .get(
      '/tasks/new',
      { name: 'newTask', preValidation: app.authenticate },
      async (req, reply) => {
        const task = new app.objection.models.task();
        const statuses = await app.objection.models.status
          .query()
          .then((items) => items.map(({ id, statusName }) => ({
            id,
            name: statusName,
          })));
        const users = await app.objection.models.user
          .query()
          .then((items) => items.map(
            ({ firstName, lastName, id }) => ({
              id,
              name: `${firstName} ${lastName}`,
            }),
          ));
        reply.render('tasks/new', { task, users, statuses });
        return reply;
      },
    )
    .get(
      '/tasks/:id',
      { name: 'taskPage', preValidation: app.authenticate },
      async (req, reply) => {
        const taskId = req.params.id;
        const task = await app.objection.models.task
          .query()
          .alias('task')
          .findOne({ 'task.id': taskId })
          .withGraphJoined('status')
          .withGraphJoined('creator')
          .withGraphJoined('executor');

        reply.render('tasks/info', { task });
        return reply;
      },
    )
    .get(
      '/tasks/:id/edit',
      { name: 'editTask', preValidation: app.authenticate },
      async (req, reply) => {
        const taskId = req.params.id;
        const task = await app.objection.models.task
          .query()
          .alias('task')
          .findOne({ 'task.id': taskId })
          .withGraphJoined('status')
          .withGraphJoined('creator')
          .withGraphJoined('executor');

        const statuses = await app.objection.models.status
          .query()
          .then((items) => items.map(({ id, statusName }) => ({
            id,
            name: statusName,
          })));
        const users = await app.objection.models.user
          .query()
          .then((items) => items.map(
            ({ firstName, lastName, id }) => ({
              id,
              name: `${firstName} ${lastName}`,
            }),
          ));

        reply.render('tasks/edit', {
          id: taskId, task, statuses, users,
        });
        return reply;
      },
    )
    .post(
      '/tasks',
      { preValidation: app.authenticate },
      async (req, reply) => {
        const task = new app.objection.models.task();
        task.$set(req.body.data);
        try {
          const creatorId = req.session.get('passport').id;
          const {
            name, description, statusId, executorId,
          } = req.body.data;
          const preparedBodyData = {
            name,
            creatorId,
            description,
            statusId: Number(statusId),
            executorId: Number(executorId),
          };
          const validTask = await app.objection.models.task.fromJson(preparedBodyData);
          await app.objection.models.task.query().insert(validTask);
          req.flash('info', i18next.t('flash.tasks.create.success'));
          reply.redirect(app.reverse('tasks'));
        } catch ({ data }) {
          const statuses = await app.objection.models.status
            .query()
            .then((items) => items.map(({ id, statusName }) => ({
              id,
              name: statusName,
            })));
          const users = await app.objection.models.user
            .query()
            .then((items) => items.map(
              ({ firstName, lastName, id }) => ({
                id,
                name: `${firstName} ${lastName}`,
              }),
            ));

          req.flash('error', i18next.t('flash.tasks.create.error'));
          reply.render('tasks/new', {
            task, users, statuses, errors: data,
          });
        }
        return reply;
      },
    )
    .patch(
      '/tasks/:id',
      { name: 'patchTask', preValidation: app.authenticate },
      async (req, reply) => {
        const taskId = req.params.id;
        const patchedTask = await app.objection.models.task
          .query()
          .findById(taskId);
        try {
          await patchedTask.$query().patch(req.body.data);
          req.flash('info', i18next.t('flash.tasks.patch.success'));
          reply.redirect(app.reverse('tasks'));
        } catch ({ data }) {
          reply.statusCode = 422;
          // Создаю таск чтобы передать его обратно в форму в случае ошибок в форме
          const task = new app.objection.models.task();
          task.$set({ ...req.body.data, id: taskId });

          const statuses = await app.objection.models.status
            .query()
            .then((items) => items.map(({ id, statusName }) => ({
              id,
              name: statusName,
            })));
          const users = await app.objection.models.user
            .query()
            .then((items) => items.map(
              ({ firstName, lastName, id }) => ({
                id,
                name: `${firstName} ${lastName}`,
              }),
            ));

          req.flash('error', i18next.t('flash.tasks.patch.error'));
          reply.render('tasks/edit', {
            id: taskId,
            task,
            errors: data,
            statuses,
            users,
          });
        }
        return reply;
      },
    );
};
