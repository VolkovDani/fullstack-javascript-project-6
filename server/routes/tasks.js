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
          .then((data) => data.map(({ id, firstName, lastName }) => ({ id, name: `${firstName} ${lastName}` })))
        const labels = [];
        reply.render('tasks/index', {
          tasks, statuses, executors, labels,
        });
        return reply;
      },
    );
};
