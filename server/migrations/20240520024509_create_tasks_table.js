// @ts-check

export const up = (knex) => (
  knex.schema.createTable('tasks', (table) => {
    table.increments('id').primary();
    table.string('task_name');
    table.string('description');
    table.integer('statusId')
      .unsigned()
      .references('id')
      .inTable('statuses');
    table.integer('creatorId')
      .unsigned()
      .references('id')
      .inTable('users');
    table.integer('executorId')
      .unsigned()
      .references('id')
      .inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  })
);

export const down = (knex) => knex.schema.dropTable('tasks');