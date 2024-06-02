// @ts-check

// const _ = require('lodash');

const BaseModel = require('./BaseModel.cjs');

module.exports = class Task extends BaseModel {
  static get tableName() {
    return 'tasks';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'statusId', 'creatorId'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1, maxLength: 255 },
        description: { type: 'string', maxLength: 255 },
        statusId: { type: 'integer', minimum: 1 },
        creatorId: { type: 'integer', minimum: 1 },
        executorId: { type: 'integer', nullable: true },
      },
    };
  }

  static modifiers = {
    findCreator(query, creatorId) {
      query.withGraphJoined('creator')
        .skipUndefined().where('creator.id', creatorId || undefined);
    },
    findStatus(query, statusId) {
      query.withGraphJoined('status')
        .skipUndefined().where('status.id', statusId || undefined);
    },
    findExecutor(query, executorId) {
      query.withGraphJoined('executor')
        .skipUndefined().where('executor.id', executorId || undefined);
    },
    findLabels(query, labelsIds) {
      query.withGraphJoined('labels')
        .skipUndefined().where('labels.id', labelsIds || undefined);
    },
  };

  $parseJson(json, opt) {
    const superJson = super.$parseJson(json, opt);
    const dict = {
      id: (id) => Number(id),
      name: (name) => name,
      description: (description) => description,
      statusId: (status) => Number(status),
      creatorId: (creator) => Number(creator),
      executorId: (executor) => Number(executor) || null,
      labels: (labels) => labels,
    };
    const convertedJson = Object.entries(superJson)
      .reduce((acc, [key, value]) => (
        { ...acc, [key]: dict[key](value) }), {});
    return convertedJson;
  }

  static get relationMappings() {
    return {
      status: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'Status.cjs',
        join: {
          from: 'tasks.statusId',
          to: 'statuses.id',
        },
      },
      creator: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'User.cjs',
        join: {
          from: 'tasks.creatorId',
          to: 'users.id',
        },
      },
      executor: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'User.cjs',
        join: {
          from: 'tasks.executorId',
          to: 'users.id',
        },
      },
      labels: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: 'Label.cjs',
        join: {
          from: 'tasks.id',
          through: {
            from: 'labels_for_tasks.taskId',
            to: 'labels_for_tasks.labelId',
          },
          to: 'labels.id',
        },
      },
    };
  }
};
