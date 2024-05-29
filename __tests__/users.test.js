// @ts-check

import _ from 'lodash';
import fastify from 'fastify';

import init from '../server/plugin.js';
import encrypt from '../server/lib/secure.cjs';
import { getSessionCookieFromResponse, getTestData, prepareData } from './helpers/index.js';

describe('test users CRUD', () => {
  let app;
  let knex;
  let models;
  const testData = getTestData();

  let signInResponse;
  beforeAll(async () => {
    app = fastify({
      exposeHeadRoutes: false,
      logger: { target: 'pino-pretty' },
    });
    await init(app);
    knex = app.objection.knex;
    models = app.objection.models;

    // TODO: пока один раз перед тестами
    // тесты не должны зависеть друг от друга
    // перед каждым тестом выполняем миграции
    // и заполняем БД тестовыми данными
    await knex.migrate.latest();
    await prepareData(app);
  });

  beforeEach(async () => {
    signInResponse = await app.inject({
      method: 'POST',
      url: app.reverse('session'),
      payload: {
        data: testData.users.userForLogin,
      },
    });
  });

  it('index', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('users'),
    });

    expect(response.statusCode).toBe(200);
  });

  it('new', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('newUser'),
    });

    expect(response.statusCode).toBe(200);
  });

  it('edit', async () => {
    const wrongResponse = await app.inject({
      method: 'GET',
      url: app.reverse('editUser', { id: 1 }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(wrongResponse.statusCode).toBe(302);

    const correctResponse = await app.inject({
      method: 'GET',
      url: app.reverse('editUser', { id: 2 }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    expect(correctResponse.statusCode).toBe(200);
  });

  it('create', async () => {
    const params = testData.users.new;
    const response = await app.inject({
      method: 'POST',
      url: app.reverse('users'),
      payload: {
        data: params,
      },
    });

    expect(response.statusCode).toBe(302);
    const expected = {
      ..._.omit(params, 'password'),
      passwordDigest: encrypt(params.password),
    };
    const user = await models.user.query().findOne({ email: params.email });
    expect(user).toMatchObject(expected);

    const responseIndexPage = await app.inject({
      method: 'GET',
      url: app.reverse('users'),
    });

    expect(responseIndexPage.statusCode).toBe(200);
  });

  it('drop user with tasks', async () => {
    const { newTask } = testData.tasks;
    const { userForLogin, existing } = testData.users;

    await app.inject({
      method: 'POST',
      url: app.reverse('tasks'),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: newTask,
      },
    });
    const deleteUserResponse = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteUser', { id: Number(userForLogin.id) }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });
    expect(deleteUserResponse.statusCode).toBe(302);
    const userFromDB = await models.user.query().findById(existing.id);
    const { password, ...userData } = existing;
    expect(userFromDB).toMatchObject(userData);

    await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteTask', { id: testData.tasks.new.id }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    await expect(models.task
      .query()
      .findById(testData.tasks.new.id)
      .throwIfNotFound()).rejects.toThrowError('NotFoundError');
  });

  it('patch', async () => {
    const userData = testData.users.existing;
    const patchedUser = testData.users.patched;
    const { UserNames } = testData.patches;
    // Запрос с указанием только имени и фамилии
    const wrondResponse = await app.inject({
      method: 'PATCH',
      url: app.reverse('patchUser', { id: Number(userData.id) }),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: UserNames,
      },
    });
    expect(wrondResponse.statusCode).toBe(422);

    const user = await models.user.query().findOne({ id: 2 });
    expect(user).not.toMatchObject(patchedUser);

    const { correctPatchData } = testData.patches;
    const correctResponse = await app.inject({
      method: 'PATCH',
      url: app.reverse('patchUser', { id: Number(userData.id) }),
      cookies: getSessionCookieFromResponse(signInResponse),
      payload: {
        data: correctPatchData,
      },
    });
    expect(correctResponse.statusCode).toBe(302);

    const updatedUser = await models.user.query().findOne({ id: 2 });
    expect(updatedUser).toMatchObject(patchedUser);
  });

  it('delete', async () => {
    const { existing, taskIdForDeleting } = testData.users;

    // удаляем пользователя
    await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteUser', { id: Number(existing.id) }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    await expect(models.user
      .query()
      .findOne({ id: 2 })
      .throwIfNotFound()).resolves.not.toThrowError('NotFoundError');

    await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteTask', { id: taskIdForDeleting.id }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteUser', { id: Number(existing.id) }),
      cookies: getSessionCookieFromResponse(signInResponse),
    });

    await expect(models.user
      .query()
      .findOne({ id: 2 })
      .throwIfNotFound()).rejects.toThrowError('NotFoundError');
  });

  afterEach(async () => {
    // Пока Segmentation fault: 11
    // после каждого теста откатываем миграции
    // await knex.migrate.rollback();
  });

  afterAll(async () => {
    await app.close();
  });
});
