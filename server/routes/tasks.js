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
        const tasks = await app.getFilteredTasks(req);
        const [statuses, executors, labels] = await Promise.all([
          getStatusesForSelect(),
          getUsersForSelect(),
          app.objection.models.label.query(),
        ]);
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
          .withGraphJoined('statuses')
          .withGraphJoined('creators')
          .withGraphJoined('executors')
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
          .withGraphJoined('statuses')
          .withGraphJoined('creators')
          .withGraphJoined('executors')
          .withGraphJoined('labels');

        const statuses = await getStatusesForSelect();
        const users = await getUsersForSelect();
        const labels = await app.objection.models.label
          .query();
        reply.render('tasks/edit', {
          id: task, task, statuses, users, labels,
        });
        return reply;
      },
    )
    .post(
      '/tasks',
      { preValidation: app.authenticate },
      async (req, reply) => {
        const task = new app.objection.models.task();
        req.body.data.creator = req.session.get('passport').id;
        const { labels: labelIds, ...rest } = req.body.data;
        try {
          task.$set(rest);
          const validTask = await app.objection.models.task.fromJson(rest);
          await app.objection.models.task.transaction(async (trx) => {
            const labels = [];
            if (labelIds) {
              const convertedLabelIds = [...labelIds].map((item) => Number(item));
              await app.objection.models.label
                .query(trx)
                .whereIn('id', [...convertedLabelIds])
                .then((items) => labels.push(...items));
            }
            const newTask = await app.objection.models.task
              .query(trx)
              .upsertGraphAndFetch({
                ...validTask, labels,
              }, { relate: true, unrelate: true, noUpdate: ['labels'] });

            return newTask;
          });
          req.flash('info', i18next.t('flash.tasks.create.success'));
          reply.redirect(app.reverse('tasks'));
        } catch ({ data }) {
          const statuses = await getStatusesForSelect();
          const users = await getUsersForSelect();
          const labelsSelect = await app.objection.models.label.query();

          req.flash('error', i18next.t('flash.tasks.create.error'));
          reply.render('tasks/new', {
            task, users, statuses, errors: data, labels: labelsSelect,
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
          .withGraphJoined('labels')
          .findById(taskId);
        if (!Object.hasOwn(req.body.data, 'labels')) req.body.data.labels = [];
        const statuses = await getStatusesForSelect();
        const users = await getUsersForSelect();
        const labels = await app.objection.models.label.query();
        // Создаю таск чтобы передать его обратно в форму в случае ошибок в форме
        const task = new app.objection.models.task();
        const { labels: labelIds, ...rest } = req.body.data;
        task.$set({ ...rest, id: taskId });

        try {
          await app.objection.models.task.transaction(async (trx) => {
            await patchedTask.$query(trx).patch(rest);
            await app.objection.models.labelsForTasks
              .query(trx)
              .where({ taskId })
              .skipUndefined()
              .whereNot('id', labelIds)
              .delete();
            if (_.isArray(labelIds)) {
              const arrPromises = [...labelIds].map((item) => {
                const obj = {
                  labelId: Number(item),
                  taskId: Number(task),
                };
                const labelsForTasksObj = new app.objection.models.labelsForTasks();
                labelsForTasksObj.$set(obj);
                return app.objection.models.labelsForTasks
                  .query(trx)
                  .insert(labelsForTasksObj);
              });
              await Promise.all(arrPromises);
            } else {
              const obj = {
                labelId: Number(labelIds),
                taskId: Number(task),
              };
              const labelsForTasksObj = new app.objection.models.labelsForTasks();
              labelsForTasksObj.$set(obj);
              await app.objection.models.labelsForTasks
                .query(trx)
                .insert(labelsForTasksObj);
            }
          });
          req.flash('info', i18next.t('flash.tasks.patch.success'));
          reply.redirect(app.reverse('tasks'));
        } catch ({ data }) {
          reply.statusCode = 422;

          req.flash('error', i18next.t('flash.tasks.patch.error'));
          reply.render('tasks/edit', {
            id: taskId,
            task,
            errors: data,
            statuses,
            users,
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
          await app.objection.models.task.transaction(async (trx) => {
            await app.objection.models.task
              .query(trx)
              .findById(taskId)
              .delete();
            const result = await app.objection.models.labelsForTasks
              .query(trx)
              .delete()
              .whereIn(
                'taskId',
                app.objection.models.labelsForTasks.query(trx)
                  .select('labels_for_tasks.taskId')
                  .where({ taskId }),
              );
            return result;
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
