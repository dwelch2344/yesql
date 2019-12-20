const yesql = require('./yesql.js')
const assert = require('assert-diff')

it('pg simple one parameter', () => {
  assert.deepEqual(
    yesql.pg('SELECT * from pokemon WHERE id = :id;')({id: 5}),
    {
      text: 'SELECT * from pokemon WHERE id = $1;',
      values: [5]
    })
})

it('pg type cast with multiple parameters', () => {
  const query = 'SELECT id::int FROM user WHERE id=:id and born > :year;'
  const data = {id: '5', year: 2000}
  const expected = {
    text: 'SELECT id::int FROM user WHERE id=$1 and born > $2;',
    values: ['5', 2000]
  };
  assert.deepEqual(yesql.pg(query)(data), expected)
})

it('pg date format https://github.com/pihvi/yesql/issues/13', () => {
  const query = `select name, value, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') from table1 where created_at > :from and created_at <= :to;`
  const data = {from: new Date(0), to: new Date()}
  const expected = {
    text: `select name, value, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') from table1 where created_at > $1 and created_at <= $2;`,
    values: [data.from, data.to]
  };
  assert.deepEqual(yesql.pg(query)(data), expected)
})

it('mysql', () => {
  assert.deepEqual(
    yesql.mysql('SELECT * from ::ptable WHERE id = :id;')({id: 5, ptable: 'pokemon'}),
    {
      sql: 'SELECT * from ?? WHERE id = ?;',
      values: ['pokemon', 5]
    })
})

it('mysql from file', () => {
  const sql = yesql('./', {type: 'mysql'})
  assert.deepEqual(
    sql.updatePokemon({price: 6}),
    {
      sql: '-- updatePokemon\nUPDATE pokemon SET price=?;',
      values: [6]
    })
})

it('pg from file', () => {
  const sql = yesql('./', {type: 'pg'})
  assert.deepEqual(
    sql.updatePokemon({price: 6}),
    {
      text: '-- updatePokemon\nUPDATE pokemon SET price=$1;',
      values: [6]
    })
})

it('raw from file', () => {
  const sql = yesql('./')
  assert.equal(sql.updatePokemon, '-- updatePokemon\nUPDATE pokemon SET price=:price;')
  assert.equal(sql.dual, ' --dual\nselect * from dual;\n')
})

it('Missing parameter throws error', () => {
  ['pg', 'mysql'].forEach(type => {
    let msg = ''
    try {
      yesql.pg('select * from persons where name=:name;')({})
    } catch (e) {
      msg = e.message
    }
    assert(msg.startsWith('Missing value for statement.\nname'))
  })
})

it('mysql with nulls for missing', () => {
  const query = 'SELECT * from pokemon WHERE id = :id and name=:name;'
  const options = {useNullForMissing: true}
  assert.deepEqual(yesql.mysql(query, options)({id: 5}), {
    sql: 'SELECT * from pokemon WHERE id = ? and name=?;',
    values: [5, null]
  })
  assert.deepEqual(yesql('./', {type: 'mysql', useNullForMissing: true}).updatePokemon({}), {
    sql: '-- updatePokemon\nUPDATE pokemon SET price=?;',
    values: [null]
  })
})

it('pg with nulls for missing', () => {
  const query = 'SELECT * from pokemon WHERE id = :id and name=:name;'
  const options = {useNullForMissing: true}
  assert.deepEqual(yesql.pg(query, options)({id: 5}), {
    text: 'SELECT * from pokemon WHERE id = $1 and name=$2;',
    values: [5, null]
  })
  assert.deepEqual(yesql('./', {type: 'pg', useNullForMissing: true}).updatePokemon({}), {
    text: '-- updatePokemon\nUPDATE pokemon SET price=$1;',
    values: [null]
  })
})
