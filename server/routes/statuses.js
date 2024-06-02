// @ts-check

import i18next from 'i18next';
import _ from 'lodash';

export default (app) => {
  const objectionModels = app.objection.models;
  app
    .get(
      '/statuses',
      { name: 'statuses', preValidation: app.authenticate },
      async (req, reply) => {
        const statuses = await objectionModels.status.query();
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
    .post(
      '/statuses',
      { preValidation: app.authenticate },
      async (req, reply) => {
        const status = new objectionModels.status();
        status.$set(req.body.data);
        try {
          const validStatus = await objectionModels.status.fromJson(req.body.data);
          await objectionModels.status.query().insert(validStatus);
          req.flash('info', i18next.t('flash.statuses.create.success'));
          reply.redirect(app.reverse('statuses'));
        } catch ({ data }) {
          req.flash('error', i18next.t('flash.statuses.create.error'));
          reply.render('statuses/new', { status, errors: data });
        }
        return reply;
      },
    )
    .get(
      '/statuses/:id/edit',
      { name: 'editStatus', preValidation: app.authenticate },
      async (req, reply) => {
        const statusId = req.params.id;
        const status = await objectionModels.status
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
          await objectionModels.status.fromJson(req.body.data);
          const patchedStatus = await objectionModels.status
            .query()
            .findById(statusId);
          await patchedStatus.$query().patch(req.body.data);
          req.flash('info', i18next.t('flash.statuses.patch.success'));
          reply.redirect(app.reverse('statuses'));
        } catch ({ data }) {
          const status = new objectionModels.status();
          status.$set({ id: statusId, ...req.body.data });
          req.flash('error', i18next.t('flash.statuses.patch.error'));
          reply.code(422).render('statuses/edit', { id: statusId, status, errors: data });
        }
        return reply;
      },
    )
    .delete(
      '/statuses/:id',
      { name: 'deleteStatus', preValidation: app.authenticate },
      async (req, reply) => {
        const status = req.params.id;
        const relatedTask = await objectionModels.task
          .query()
          .where({ statusId: status });
        if (!_.isEmpty(relatedTask)) {
          req.flash('error', i18next.t('flash.statuses.delete.error'));
          reply.redirect(app.reverse('statuses'));
          return reply;
        }
        try {
          await objectionModels.status
            .query()
            .findById(status)
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
