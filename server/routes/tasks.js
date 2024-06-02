// @ts-check
import i18next from 'i18next';

export default (app) => {
  const objectionModels = app.objection.models;
  const getUsersForSelect = () => objectionModels.user
    .query()
    .then((data) => data.map(({ id, firstName, lastName }) => ({ id, name: `${firstName} ${lastName}` })));
  const getListItems = () => Promise.all([
    objectionModels.status.query(),
    getUsersForSelect(),
    objectionModels.label.query(),
  ]);

  app
    .get(
      '/tasks',
      { name: 'tasks', preValidation: app.authenticate },
      async (req, reply) => {
        const tasks = await app.getFilteredTasks(req);
        const [statuses, executors, labels] = await getListItems();
        reply.render('tasks/index', {
          tasks, statuses, executors, labels, selected: { ...req.query },
        });
        return reply;
      },
    )
    .get(
      '/tasks/new',
      { name: 'newTask', preValidation: app.authenticate },
      async (req, reply) => {
        const [statuses, executors, labels] = await getListItems();
        reply.render('tasks/new', {
          task: {}, executors, statuses, labels,
        });
        return reply;
      },
    )
    .get(
      '/tasks/:id',
      { name: 'taskPage', preValidation: app.authenticate },
      async (req, reply) => {
        const taskId = req.params.id;
        const task = await objectionModels.task
          .query()
          .findById(taskId)
          .withGraphJoined('[status, creator, executor, labels]');
        reply.render('tasks/info', { task });
        return reply;
      },
    )
    .get(
      '/tasks/:id/edit',
      { name: 'editTask', preValidation: app.authenticate },
      async (req, reply) => {
        const taskId = req.params.id;
        const task = await objectionModels.task
          .query()
          .findById(taskId)
          .withGraphJoined('[status, creator, executor, labels]');
        const [statuses, executors, labels] = await getListItems();
        reply.render('tasks/edit', {
          id: task, task, statuses, executors, labels,
        });
        return reply;
      },
    )
    .post(
      '/tasks',
      { preValidation: app.authenticate },
      async (req, reply) => {
        req.body.data.creatorId = req.session.get('passport').id;
        const task = new objectionModels.task();
        const { labels: labelsFromForm, ...rest } = req.body.data;
        try {
          task.$set(rest);
          const validTask = await objectionModels.task.fromJson(rest);
          await objectionModels.task.transaction(async (trx) => {
            const labels = await objectionModels.label.query(trx).findByIds(labelsFromForm || []);
            const newTask = await objectionModels.task
              .query(trx)
              .upsertGraphAndFetch({
                ...validTask, labels,
              }, { relate: true, unrelate: true, noUpdate: ['labels'] });
            return newTask;
          });
          req.flash('info', i18next.t('flash.tasks.create.success'));
          reply.redirect(app.reverse('tasks'));
        } catch ({ data }) {
          const [statuses, executors, labels] = await getListItems();
          task.labels = await objectionModels.label.query().findByIds(labelsFromForm || []);
          req.flash('error', i18next.t('flash.tasks.create.error'));
          reply.render('tasks/new', {
            task, executors, statuses, errors: data, labels,
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
        const task = new objectionModels.task();
        const { labels: labelsFromForm, ...rest } = req.body.data;
        try {
          task.$set({
            ...rest, id: taskId,
          });
          await objectionModels.task.transaction((async (trx) => {
            const labels = await objectionModels.label.query(trx).findByIds(labelsFromForm || []);
            await objectionModels.task.query(trx)
              .upsertGraphAndFetch({
                labels, ...rest, id: taskId,
              }, { relate: true, unrelate: true, noUpdate: ['labels'] });
          }));
          req.flash('info', i18next.t('flash.tasks.patch.success'));
          reply.redirect(app.reverse('tasks'));
        } catch ({ data }) {
          task.labels = await objectionModels.label.query().findByIds(labelsFromForm || []);

          req.flash('error', i18next.t('flash.tasks.patch.error'));
          const [statuses, executors, labels] = await getListItems();
          reply.code(422).render('tasks/edit', {
            id: taskId,
            task,
            errors: data,
            statuses,
            executors,
            labels,
          });
        }
        return reply;
      },
    )
    .delete(
      '/tasks/:id',
      { name: 'deleteTask', preValidation: app.authenticate },
      async (req, reply) => {
        const taskId = req.params.id;
        const userId = Number(req.session.get('passport').id);
        const task = await objectionModels.task
          .query()
          .findById(taskId);
        if (userId !== task.creatorId) {
          req.flash('error', i18next.t('flash.tasks.delete.errorAccess'));
          reply.redirect(app.reverse('tasks'));
          return reply;
        }
        try {
          await objectionModels.task.transaction(async (trx) => {
            await objectionModels.task
              .query(trx)
              .findById(taskId)
              .delete();
            await objectionModels.labelsForTasks
              .query(trx)
              .delete()
              .where({ taskId });
          });
          req.flash('info', i18next.t('flash.tasks.delete.success'));
          reply.redirect(app.reverse('tasks'));
        } catch ({ data }) {
          req.flash('error', i18next.t('flash.tasks.delete.error'));
        }
        return reply;
      },
    );
};
