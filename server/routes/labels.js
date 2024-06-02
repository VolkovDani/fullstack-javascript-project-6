// @ts-check

import i18next from 'i18next';
import _ from 'lodash';

export default (app) => {
  const objectionModels = app.objection.models;
  app
    .get(
      '/labels',
      { name: 'labels', preValidation: app.authenticate },
      async (req, reply) => {
        const labels = await objectionModels.label.query();
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
        const label = new objectionModels.label();
        label.$set(req.body.data);
        try {
          const validLabel = await objectionModels.label.fromJson(req.body.data);
          await objectionModels.label.query().insert(validLabel);
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
        const label = await objectionModels.label
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
          await objectionModels.label.fromJson(req.body.data);
          const patchedLabel = await objectionModels.label
            .query()
            .findById(labelId);
          await patchedLabel.$query().patch(req.body.data);
          req.flash('info', i18next.t('flash.labels.patch.success'));
          reply.redirect(app.reverse('labels'));
        } catch ({ data }) {
          const label = new objectionModels.label();
          label.$set({ id: labelId, ...req.body.data });
          req.flash('error', i18next.t('flash.labels.patch.error'));
          reply.code(422).render('labels/edit', { id: labelId, label, errors: data });
        }
        return reply;
      },
    )
    .delete(
      '/labels/:id',
      { name: 'deleteLabel', preValidation: app.authenticate },
      async (req, reply) => {
        const label = req.params.id;
        const labels = await objectionModels.label
          .query();
        try {
          const relationsWithTasks = await objectionModels.labelsForTasks
            .query()
            .where({ labelId: label });
          if (!_.isEmpty(relationsWithTasks)) {
            req.flash('error', i18next.t('flash.labels.delete.error'));
            reply.render('labels/index', { labels });
            return reply;
          }
          await objectionModels.label
            .query()
            .findById(label)
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
