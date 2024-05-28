// @ts-check
import i18next from 'i18next';
import _ from 'lodash';

export default (app) => {
  const getStatusesForSelect = () => app.objection.models.status.query();
  const getUsersForSelect = () => app.objection.models.user
    .query()
    .then((data) => data.map(({ id, firstName, lastName }) => ({ id, name: `${firstName} ${lastName}` })));

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
          .withGraphJoined('labels')
          .modify('findCreator', isCurrentUserTasks())
          .modify('findStatus', req.query.statusId)
          .modify('findExecutor', req.query.executorId)
          .modify('findLabels', req.query.labelId);

        const statuses = await getStatusesForSelect();
        const executors = await getUsersForSelect();
        const labels = await app.objection.models.label.query();
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
        const statuses = await getStatusesForSelect();
        const users = await getUsersForSelect();
        const labels = await app.objection.models.label.query();
        reply.render('tasks/new', {
          task, users, statuses, labels,
        });
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
          .withGraphJoined('executor')
          .withGraphJoined('labels');
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
          .withGraphJoined('executor')
          .withGraphJoined('labels');

        const statuses = await getStatusesForSelect();
        const users = await getUsersForSelect();
        const labels = await app.objection.models.label
          .query();
        reply.render('tasks/edit', {
          id: taskId, task, statuses, users, labels,
        });
        return reply;
      },
    )
    .post(
      '/tasks',
      { preValidation: app.authenticate },
      async (req, reply) => {
        const task = new app.objection.models.task();
        req.body.data.creatorId = req.session.get('passport').id;
        const { labels: labelIds, ...rest } = req.body.data;
        console.log(' ------------------------------------ ');
        console.log(req.body.data);
        try {
          task.$set(rest);
          const validTask = await app.objection.models.task.fromJson(rest);
          await app.objection.models.task.transaction(async (trx) => {
            const labels = [];
            if (labelIds) {
              const convertedLabelIds = [...labelIds].map((item) => Number(item));
              console.log('labelids', convertedLabelIds);
              await app.objection.models.label
                .query(trx)
                .whereIn('id', [...convertedLabelIds])
                .then((items) => labels.push(...items));
            }
            console.log(labels);
            const newTask = await app.objection.models.task
              .query(trx)
              .upsertGraphAndFetch({
                ...validTask, labels,
              }, { relate: true, unrelate: true, noUpdate: ['labels'] });
            return newTask;
          });
          req.flash('info', i18next.t('flash.tasks.create.success'));
          reply.redirect(app.reverse('tasks'));
        } catch (data) {
          console.log(data);
          const statuses = await getStatusesForSelect();
          const users = await getUsersForSelect();
          const labelsSelect = await app.objection.models.label.query();

          req.flash('error', i18next.t('flash.tasks.create.error'));
          reply.render('tasks/new', {
            task, users, statuses, errors: data.data, labels: labelsSelect,
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

          const statuses = await getStatusesForSelect();
          const users = await getUsersForSelect();

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
    )
    .delete(
      '/tasks/:id',
      { name: 'deleteTask', preValidation: app.authenticate },
      async (req, reply) => {
        const taskId = Number(req.params.id);
        const userId = Number(req.session.get('passport').id);
        const task = await app.objection.models.task
          .query()
          .findById(taskId);
        if (userId !== task.creatorId) {
          req.flash('error', i18next.t('flash.tasks.delete.errorAccess'));
          reply.redirect(app.reverse('tasks'));
          return reply;
        }
        try {
          await app.objection.models.task
            .query()
            .findById(taskId)
            .delete();
          req.flash('info', i18next.t('flash.tasks.delete.success'));
          reply.redirect(app.reverse('tasks'));
        } catch ({ data }) {
          req.flash('error', i18next.t('flash.tasks.delete.error'));
        }
        return reply;
      },
    );
};
