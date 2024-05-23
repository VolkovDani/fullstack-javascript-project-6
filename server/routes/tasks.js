// @ts-check

export default (app) => {
  app
    .get(
      '/tasks',
      { name: 'tasks', preValidation: app.authenticate },
      async (req, reply) => {
        const tasks = await app.objection.models.task.query();
        const statuses = await app.objection.models.status
          .query()
          .then((data) => data.map(({ id, statusName }) => ({ id, name: statusName })));
        console.log(statuses);
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
          .then((statuses) => statuses.map(({ id, statusName }) => ({
            id,
            name: statusName,
          })));
        const users = await app.objection.models.user
          .query()
          .then((users) => users.map(
            ({ firstName, lastName, id }) => ({
              id,
              name: `${firstName} ${lastName}`,
            }),
          ));
        reply.render('tasks/new', { task, users, statuses });
        return reply;
      },
    );
};
