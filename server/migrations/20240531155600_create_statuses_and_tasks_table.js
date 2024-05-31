// @ts-check

export const up = (knex) =>
  knex.schema
    .createTable('statuses', (table) => {
      table.increments('id').primary();
      table.string('name', 50).unique();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .then(() =>
      knex.schema.hasTable('tasks').then((exists) => {
        if (!exists)
          return knex.schema.createTable('tasks', (table) => {
            table.increments('id').primary();
            table.string('name');
            table.string('description');
            table
              .integer('status_id')
              .references('id')
              .inTable('statuses')
              .onDelete('RESTRICT');
            table
              .integer('creator_id')
              .references('id')
              .inTable('users')
              .onDelete('RESTRICT');
            table.integer('executor_id');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
          });
      })
    );

export const down = (knex) => knex.schema.dropTable('statuses');