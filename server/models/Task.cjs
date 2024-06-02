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
      if (creatorId) query.where('creators.id', creatorId);
    },
    findStatus(query, statusId) {
      if (statusId) query.where('statuses.id', statusId);
    },
    findExecutor(query, executorId) {
      if (executorId) query.where('executors.id', executorId);
    },
    findLabels(query, labelsIds) {
      if (labelsIds) query.where('labels.id', labelsIds);
    },
  };

  $parseJson(json, opt) {
    const superJson = super.$parseJson(json, opt);
    const dict = {
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
      statuses: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'Status.cjs',
        join: {
          from: 'tasks.statusId',
          to: 'statuses.id',
        },
      },
      creators: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'User.cjs',
        join: {
          from: 'tasks.creatorId',
          to: 'users.id',
        },
      },
      executors: {
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
