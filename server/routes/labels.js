// @ts-check

import i18next from 'i18next';

export default (app) => {
  app
    .get(
      '/labels',
      { name: 'labels', preValidation: app.authenticate },
      async (req, reply) => {
        const labels = await app.objection.models.label.query();
        reply.render('labels/index', { labels });
        return reply;
      },
    )
    .get(
      '/labels/new',
      { name: 'newLabel', preValidation: app.authenticate },
      async (req, reply) => {
        reply.render('labels/new');
        return reply;
      },
    )
    .post(
      '/labels',
      { preValidation: app.authenticate },
      async (req, reply) => {
        const label = new app.objection.models.label();
        label.$set(req.body.data);
        try {
          const validLabel = await app.objection.models.label.fromJson(req.body.data);
          await app.objection.models.label.query().insert(validLabel);
          req.flash('info', i18next.t('flash.labels.create.success'));
          reply.redirect(app.reverse('labels'));
        } catch ({ data }) {
          req.flash('error', i18next.t('flash.labels.create.error'));
          reply.render('labels/new', { label, errors: data });
        }
        return reply;
      },
    )
    .get(
      '/labels/:id/edit',
      { name: 'editLabel', preValidation: app.authenticate },
      async (req, reply) => {
        const labelId = req.params.id;
        const label = await app.objection.models.label
          .query()
          .findById(labelId);
        reply.render('labels/edit', { label });
        return reply;
      },
    )
    .patch(
      '/labels/:id',
      { name: 'patchLabel', preValidation: app.authenticate },
      async (req, reply) => {
        const labelId = req.params.id;
        try {
          await app.objection.models.label.fromJson(req.body.data);
          const patchedLabel = await app.objection.models.label
            .query()
            .findById(labelId);
          await patchedLabel.$query().patch(req.body.data);
          req.flash('info', i18next.t('flash.labels.patch.success'));
          reply.redirect(app.reverse('labels'));
        } catch ({ data }) {
          reply.statusCode = 422;
          const label = new app.objection.models.label();
          label.$set({ id: labelId, ...req.body.data });
          req.flash('error', i18next.t('flash.labels.patch.error'));
          reply.render('labels/edit', { id: labelId, label, errors: data });
        }
        return reply;
      },
    )
    .delete(
      '/labels/:id',
      { name: 'deleteLabel', preValidation: app.authenticate },
      async (req, reply) => {
        const labelId = req.params.id;
        const labels = await app.objection.models.label
          .query();
        try {
          console.log('delete --------------------------------- ');
          const relationsWithTasks = await app.objection.models.labels_for_tasks
            .query();
          console.log(relationsWithTasks);
          await app.objection.models.label
            .query()
            .findById(labelId)
            .delete();
          req.flash('info', i18next.t('flash.labels.delete.success'));
          reply.redirect(app.reverse('labels'));
        } catch ({ data }) {
          req.flash('error', i18next.t('flash.labels.delete.error'));
          reply.render('labels/index', { errors: data, labels });
        }
        return reply;
      },
    );
};
