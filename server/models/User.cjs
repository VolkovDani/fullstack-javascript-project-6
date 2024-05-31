// @ts-check

const { ValidationError } = require('objection');

const objectionUnique = require('objection-unique');
const BaseModel = require('./BaseModel.cjs');
const encrypt = require('../lib/secure.cjs');

const unique = objectionUnique({ fields: ['email'] });

module.exports = class User extends unique(BaseModel) {
  static get tableName() {
    return 'users';
  }

  $afterValidate(json, opt) {
    const emailRegExp = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/g;
    if (!emailRegExp.test(json.email)) {
      throw new ValidationError({
        type: 'testEmailPattern',
        data: {
          email: [
            {
              message: 'wrong email pattern',
              keyword: 'regexp',
              params: {
                regexp: '/^[\\w-.]+@([\\w-]+\\.)+[\\w-]{2,4}$/g',
              },
            },
          ],
        },
      });
    }
    return json;
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['email', 'password', 'firstName', 'lastName'],
      properties: {
        id: { type: 'integer' },
        firstName: { type: 'string', minLength: 1 },
        lastName: { type: 'string', minLength: 1 },
        email: { type: 'string', minLength: 1 },
        password: { type: 'string', minLength: 3 },
      },
    };
  }

  static get relationMappings() {
    return {
      tasks: {
        relation: BaseModel.HasManyRelation,
        modelClass: 'Tasks.cjs',
        join: {
          from: 'users.id',
          to: 'tasks.creatorId',
        },
      },
    };
  }

  set password(value) {
    this.passwordDigest = encrypt(value);
  }

  verifyPassword(password) {
    return encrypt(password) === this.passwordDigest;
  }
};
