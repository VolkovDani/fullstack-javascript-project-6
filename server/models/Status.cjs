// @ts-check

const objectionUnique = require('objection-unique');
const BaseModel = require('./BaseModel.cjs');

const unique = objectionUnique({ fields: ['statusName'] });

module.exports = class Status extends unique(BaseModel) {
  static get tableName() {
    return 'statuses';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['statusName'],
      properties: {
        id: { type: 'integer' },
        statusName: { type: 'string', minLength: 1 },
      },
    };
  }
};
