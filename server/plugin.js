// @ts-check

import { fileURLToPath } from 'url';
import path from 'path';
import fastifyStatic from '@fastify/static';
// NOTE: не поддердивает fastify 4.x
// import fastifyErrorPage from 'fastify-error-page';
import fastifyView from '@fastify/view';
import fastifyFormbody from '@fastify/formbody';
import fastifySecureSession from '@fastify/secure-session';
import fastifyPassport from '@fastify/passport';
import fastifySensible from '@fastify/sensible';
import { plugin as fastifyReverseRoutes } from 'fastify-reverse-routes';
import fastifyMethodOverride from 'fastify-method-override';
import fastifyObjectionjs from 'fastify-objectionjs';
import qs from 'qs';
import Pug from 'pug';
import i18next from 'i18next';
import _ from 'lodash';
import Rollbar from 'rollbar';

import ru from './locales/ru.js';
import en from './locales/en.js';
// @ts-ignore
import addRoutes from './routes/index.js';
import getHelpers from './helpers/index.js';
import * as knexConfig from '../knexfile.js';
import models from './models/index.js';
import FormStrategy from './lib/passportStrategies/FormStrategy.js';

const __dirname = fileURLToPath(path.dirname(import.meta.url));

const mode = process.env.NODE_ENV || 'development';
const isDevelopment = mode === 'development';

const setUpViews = (app) => {
  const helpers = getHelpers(app);
  app.register(fastifyView, {
    engine: {
      pug: Pug,
    },
    includeViewExtension: true,
    defaultContext: {
      ...helpers,
      assetPath: (filename) => `/assets/${filename}`,
    },
    templates: path.join(__dirname, '..', 'server', 'views'),
  });

  app.decorateReply('render', function render(viewPath, locals) {
    this.view(viewPath, { ...locals, reply: this });
  });
};

const setUpStaticAssets = (app) => {
  const pathPublic = path.join(__dirname, '..', 'dist');
  app.register(fastifyStatic, {
    root: pathPublic,
    prefix: '/assets/',
  });
};

const setupLocalization = async () => {
  await i18next
    .init({
      lng: 'ru',
      fallbackLng: 'en',
      debug: isDevelopment,
      resources: {
        ru,
        en,
      },
    });
};

const addHooks = (app) => {
  app.addHook('preHandler', async (req, reply) => {
    reply.locals = {
      isAuthenticated: () => req.isAuthenticated(),
    };
  });
};

const registerPlugins = async (app) => {
  await app.register(fastifySensible);
  // await app.register(fastifyErrorPage);
  await app.register(fastifyReverseRoutes);
  await app.register(fastifyFormbody, { parser: qs.parse });
  await app.register(fastifySecureSession, {
    secret: process.env.SESSION_KEY,
    cookie: {
      path: '/',
    },
  });

  fastifyPassport.registerUserDeserializer(
    (user) => app.objection.models.user.query().findById(user.id),
  );
  fastifyPassport.registerUserSerializer((user) => Promise.resolve(user));
  fastifyPassport.use(new FormStrategy('form', app));
  await app.register(fastifyPassport.initialize());
  await app.register(fastifyPassport.secureSession());
  await app.decorate('fp', fastifyPassport);
  app.decorate('authenticate', (...args) => fastifyPassport.authenticate(
    'form',
    {
      failureRedirect: app.reverse('root'),
      failureFlash: i18next.t('flash.authError'),
    },
  // @ts-ignore
  )(...args));

  app.decorate('getFilteredTasks', async (req) => {
    const isCurrentUserTasks = () => {
      if (!_.isEmpty(req.query.isCreatorUser)) {
        return req.session.get('passport').id;
      }
      return null;
    };
    const tasks = await app.objection.models.task.query()
      .modify('findCreator', isCurrentUserTasks())
      .modify('findStatus', req.query.status)
      .modify('findExecutor', req.query.executor)
      .modify('findLabels', req.query.label);
    return tasks;
  });

  await app.register(fastifyMethodOverride);
  await app.register(fastifyObjectionjs, {
    knexConfig: knexConfig[mode],
    models,
  });
  // include and initialize the rollbar library with your access token
  const rollbar = new Rollbar({
    accessToken: process.env.ROLLBAR_API_KEY,
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
      code_version: '1.0.0',
      environment: mode,
    },
  });

  await app.addHook('onError', (request, reply, error, done) => {
    rollbar.error(error, request);
    done();
  });
};

export const options = {
  exposeHeadRoutes: false,
};

// eslint-disable-next-line no-unused-vars
export default async (app, _options) => {
  await registerPlugins(app);

  await setupLocalization();
  setUpViews(app);
  setUpStaticAssets(app);
  addRoutes(app);
  addHooks(app);

  return app;
};
