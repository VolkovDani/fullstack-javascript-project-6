// @ts-check

import i18next from 'i18next';

export default (app) => {
  app
    .get(
      '/statuses',
      { name: 'statuses', preValidation: app.authenticate },
      async (req, reply) => {
        const statuses = await app.objection.models.status.query();
        reply.render('statuses/index', { statuses });
        return reply;
      },
    )
    .get(
      '/statuses/new',
      { name: 'newStatus', preValidation: app.authenticate },
      async (req, reply) => {
        reply.render('statuses/new');
        return reply;
      },
    )
    .post('/statuses', { preValidation: app.authenticate }, async (req, reply) => {
      const status = new app.objection.models.status();
      status.$set(req.body.data);
      try {
        const validStatus = await app.objection.models.status.fromJson(req.body.data);
        await app.objection.models.status.query().insert(validStatus);
        req.flash('info', i18next.t('flash.statuses.create.success'));
        reply.redirect(app.reverse('statuses'));
      } catch ({ data }) {
        req.flash('error', i18next.t('flash.statuses.create.error'));
        reply.render('statuses/new', { status, errors: data });
      }
      return reply;
    })
    .get(
      '/statuses/:id/edit',
      { name: 'editStatus', preValidation: app.authenticate },
      async (req, reply) => {
        const statusId = req.params.id;
        const status = await app.objection.models.status
          .query()
          .findById(statusId);
        reply.render('statuses/edit', { status });
        return reply;
      },
    )
    .patch(
      '/statuses/:id',
      { name: 'patchStatus', preValidation: app.authenticate },
      async (req, reply) => {
        const statusId = req.params.id;
        try {
          await app.objection.models.status.fromJson(req.body.data);
          const patchedStatus = await app.objection.models.status
            .query()
            .findById(statusId);
          await patchedStatus.$query().patch(req.body.data);
          req.flash('info', i18next.t('flash.statuses.patch.success'));
          reply.redirect(app.reverse('statuses'));
        } catch ({ data }) {
          reply.statusCode = 422;
          const status = new app.objection.models.status();
          status.$set({ id: statusId, ...req.body.data });
          req.flash('error', i18next.t('flash.statuses.patch.error'));
          reply.render('statuses/edit', { id: statusId, status, errors: data });
        }
        return reply;
      },
    )
    .delete(
      '/statuses/:id',
      { name: 'deleteStatus', preValidation: app.authenticate },
      async (req, reply) => {
        const statusId = req.params.id;
        try {
          await app.objection.models.status
            .query()
            .findById(statusId)
            .delete();
          req.flash('info', i18next.t('flash.statuses.delete.success'));
          reply.redirect(app.reverse('statuses'));
        } catch ({ data }) {
          req.flash('error', i18next.t('flash.statuses.delete.error'));
        }
        return reply;
      },
    );
};
