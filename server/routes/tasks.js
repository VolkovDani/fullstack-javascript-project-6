// @ts-check
import i18next from 'i18next';
import _ from 'lodash';

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
        const task = new objectionModels.task();
        const [statuses, executors, labels] = await getListItems();
        reply.render('tasks/new', {
          task, executors, statuses, labels,
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
            const labels = [];
            if (!_.isEmpty(labelsFromForm)) {
              await objectionModels.label
                .query(trx)
                .whereIn('id', labelsFromForm)
                .then((items) => labels.push(...items));
            }
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
          if (!_.isEmpty(labelsFromForm)) {
            task.labels = await objectionModels.label.query().whereIn('id', labelsFromForm);
          }
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
        const patchedTask = await objectionModels.task
          .query()
          .withGraphJoined('labels')
          .findById(taskId);
        // Создаю таск чтобы передать его обратно в форму в случае ошибок в форме
        const task = new objectionModels.task();
        const { labels: labelIds, ...rest } = req.body.data;
        try {
          task.$set({
            ...rest, id: taskId,
          });
          await objectionModels.task.transaction(async (trx) => {
            await patchedTask.$query(trx).patch(rest);
            if (!_.isEmpty(labelIds)) {
              if (_.isArray(labelIds)) {
                const convertedLabels = labelIds.map((item) => Number(item));
                await objectionModels.labelsForTasks
                  .query(trx)
                  .where({ taskId })
                  .skipUndefined()
                  .whereNotIn('labelId', convertedLabels)
                  .delete();

                const arrPromises = [...labelIds].map((item) => {
                  const obj = {
                    labelId: Number(item),
                    taskId: Number(taskId),
                  };
                  const labelsForTasksObj = new objectionModels.labelsForTasks();
                  labelsForTasksObj.$set(obj);
                  return objectionModels.labelsForTasks
                    .query(trx)
                    .insert(labelsForTasksObj);
                });
                await Promise.all(arrPromises);
              } else {
                await objectionModels.labelsForTasks
                  .query(trx)
                  .where({ taskId })
                  .skipUndefined()
                  .whereNot('labelId', Number(labelIds))
                  .delete();

                await objectionModels.labelsForTasks
                  .query(trx)
                  .where({ taskId })
                  .skipUndefined()
                  .delete();

                const obj = {
                  labelId: Number(labelIds),
                  taskId: Number(taskId),
                };
                const labelsForTasksObj = new objectionModels.labelsForTasks();
                labelsForTasksObj.$set(obj);
                await objectionModels.labelsForTasks
                  .query(trx)
                  .insert(labelsForTasksObj);
              }
            } else {
              await objectionModels.labelsForTasks
                .query(trx)
                .where({ taskId })
                .delete();
            }
          });
          req.flash('info', i18next.t('flash.tasks.patch.success'));
          reply.redirect(app.reverse('tasks'));
        } catch ({ data }) {
          reply.statusCode = 422;
          req.flash('error', i18next.t('flash.tasks.patch.error'));
          const [statuses, executors, labels] = await getListItems();
          reply.render('tasks/edit', {
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
        const taskId = Number(req.params.id);
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
            const result = await objectionModels.labelsForTasks
              .query(trx)
              .delete()
              .whereIn(
                'taskId',
                objectionModels.labelsForTasks.query(trx)
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
