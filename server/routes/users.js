// @ts-check

import i18next from 'i18next';

export default (app) => {
  app
    .get('/users', { name: 'users' }, async (req, reply) => {
      const users = await app.objection.models.user.query();
      reply.render('users/index', { users });
      return reply;
    })
    .get('/users/new', { name: 'newUser' }, (req, reply) => {
      const user = new app.objection.models.user();
      reply.render('users/new', { user });
    })
    .get('/users/:id/edit', { name: 'editUser', preValidation: app.authenticate }, async (req, reply) => {
      const userId = req.params.id;
      const user = await app.objection.models.user
        .query()
        .findOne({ id: userId });

      if (Number(req.session.get('passport').id) === Number(userId)) {
        reply.render('users/edit', { user });
      } else {
        req.flash('error', i18next.t('flash.users.editPage.error'));
        reply.redirect(app.reverse('users'));
      }
      return reply;
    })
    .post('/users', async (req, reply) => {
      const user = new app.objection.models.user();
      user.$set(req.body.data);

      try {
        const validUser = await app.objection.models.user.fromJson(req.body.data);
        await app.objection.models.user.query().insert(validUser);
        req.flash('info', i18next.t('flash.users.create.success'));
        reply.redirect(app.reverse('root'));
      } catch ({ data }) {
        req.flash('error', i18next.t('flash.users.create.error'));
        reply.render('users/new', { user, errors: data });
      }

      return reply;
    });
  // .patch('/users/:id', async (req, reply) => {
  //   const userId = req.params.id;
  //   req.flash('info', userId);
  // });
};
