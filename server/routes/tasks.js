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
    );
};
