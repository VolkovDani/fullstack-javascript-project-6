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
    });
};
