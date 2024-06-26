// @ts-check

import i18next from 'i18next';
import _ from 'lodash';

export default (app) => {
  const objectionModels = app.objection.models;
  app
    .get(
      '/users',
      { name: 'users' },
      async (req, reply) => {
        const users = await objectionModels.user.query();
        reply.render('users/index', { users });
        return reply;
      },
    )
    .get(
      '/users/new',
      { name: 'newUser' },
      (req, reply) => {
        const user = new objectionModels.user();
        reply.render('users/new', { user });
      },
    )
    .get(
      '/users/:id/edit',
      { name: 'editUser', preValidation: app.authenticate },
      async (req, reply) => {
        const userId = req.params.id;
        const user = await objectionModels.user
          .query()
          .findById(userId);

        if (req.session.get('passport').id === Number(userId)) {
          reply.render('users/edit', { user });
        } else {
          req.flash('error', i18next.t('flash.users.editPage.error'));
          reply.redirect(app.reverse('users'));
        }
        return reply;
      },
    )
    .post(
      '/users',
      async (req, reply) => {
        const user = new objectionModels.user();
        user.$set(req.body.data);

        try {
          const validUser = await objectionModels.user.fromJson(req.body.data);
          await objectionModels.user.query().insert(validUser);
          req.flash('info', i18next.t('flash.users.create.success'));
          reply.redirect(app.reverse('root'));
        } catch ({ data }) {
          req.flash('error', i18next.t('flash.users.create.error'));
          reply.render('users/new', { user, errors: data });
        }

        return reply;
      },
    )
    .patch(
      '/users/:id',
      { name: 'patchUser', preValidation: app.authenticate },
      async (req, reply) => {
        const userId = req.params.id;
        if (req.session.get('passport').id !== Number(userId)) {
          req.flash('error', i18next.t('flash.users.patch.errorAccess'));
          reply.redirect(app.reverse('users'));
        }
        const { password, ...neededRest } = req.body.data;
        try {
          await objectionModels.user.fromJson(req.body.data);
          const patchedUser = await objectionModels.user
            .query()
            .findById(userId);

          await patchedUser.$query().patch(req.body.data);

          req.flash('info', i18next.t('flash.users.patch.success'));
          reply.redirect(app.reverse('users'));
        } catch ({ data }) {
          const user = new objectionModels.user();
          user.$set({ id: userId, ...neededRest });
          req.flash('error', i18next.t('flash.users.patch.error'));
          reply.code(422).render('users/edit', { id: userId, user, errors: data });
        }
        return reply;
      },
    )
    .delete(
      '/users/:id',
      { name: 'deleteUser', preValidation: app.authenticate },
      async (req, reply) => {
        const userId = req.params.id;
        if (req.session.get('passport').id !== Number(userId)) {
          req.flash('error', i18next.t('flash.users.delete.errorAccess'));
          reply.redirect(app.reverse('users'));
          return reply;
        }
        const task = await objectionModels.task
          .query()
          .where({ creatorId: userId })
          .orWhere({ executorId: userId });
        if (!_.isEmpty(task)) {
          req.flash('error', i18next.t('flash.users.delete.error'));
          reply.redirect(app.reverse('users'));
          return reply;
        }
        try {
          await objectionModels.user
            .query()
            .findById(Number(userId))
            .delete();
          // выходим из сессии чтобы не создавать ошибку
          req.logOut();
          req.flash('info', i18next.t('flash.users.delete.success'));
          reply.redirect(app.reverse('users'));
        } catch ({ data }) {
          req.flash('error', i18next.t('flash.users.delete.error'));
        }
        return reply;
      },
    );
};
