// @ts-check

export const up = (knex) => knex.schema
  .alterTable('tasks', (table) => {
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
  })

export const down = (knex) => knex.schema.alterTable('tasks', (table) => {
  table.dropColumn('status_id');
  table.dropColumn('creator_id');
});


