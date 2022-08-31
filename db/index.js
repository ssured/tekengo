const bSql = require("better-sqlite3");

module.exports.Db = class Db {
  constructor(file = "data.db") {
    const db = (this.db = bSql(file, {}));

    setupSQLCommands.map((s) => db.prepare(s).run());

    const insertIntoSource = this.db.prepare(
      "INSERT OR IGNORE INTO nodes (sha, json) VALUES (?,?);"
    );

    insertIntoSource.run(
      "1234",
      JSON.stringify({
        a: "A",
        b: [0, "B"],
        c: [1, "C"],
      })
    );

    console.log(this.db.prepare("SELECT * FROM edges").get());
  }

  //   read(subj: string): { p: string; o: string; t: number }[];
  //   read(subj: string, prop: string): { o: string; t: number } | undefined;
  //   read(subj: string, prop?: string) {
  //     return prop == null
  //       ? this.db.prepare(`SELECT p, o, t FROM state WHERE s = ?`).get(subj)
  //       : this.db
  //           .prepare(`SELECT o, t FROM state WHERE s = ? AND p = ?`)
  //           .get(subj, prop);
  //   }

  //   write(
  //     state: number,
  //     delta: { [key in string]: { [key in string]: string } }
  //   ) {
  //     const insertIntoSource = this.db.prepare(
  //       "INSERT INTO source (t, delta) VALUES (?,?);"
  //     );

  //     insertIntoSource.run(state, JSON.stringify(delta));

  /**
   * https://stackoverflow.com/questions/19337029/insert-if-not-exists-statement-in-sqlite
   * INSERT OR IGNORE INTO nodes(sha, json) VALUES("123", "{}")
   */

  //   }
};

const setupSQLCommands = [
  `
  -- DROP TABLE IF EXISTS nodes;
  -- DROP TABLE IF EXISTS edges;
  
  CREATE TABLE IF NOT EXISTS nodes (
      sha TEXT NOT NULL,
      json TEXT NOT NULL,
      PRIMARY KEY (sha),
      UNIQUE(sha, json)
  );`,

  `CREATE TABLE IF NOT EXISTS edges (
    s TEXT NOT NULL, 
    t TEXT NOT NULL, 
    PRIMARY KEY (s, t)
  );`,

  //   `CREATE INDEX IF NOT EXISTS nodes_idx_sha ON nodes(sha);`,
  //   `CREATE INDEX IF NOT EXISTS edges_idx_source ON edges(source);`,
  //   `CREATE INDEX IF NOT EXISTS edges_idx_target ON edges(target);`,

  /**
   * Het is mogelijk om een index op een expressie te maken
   * create index test_extract_vx_idx on test(json_extract(data, '$.vx'))
   * https://www.delphitools.info/2021/06/17/sqlite-as-a-no-sql-database/
   */

  `CREATE TRIGGER IF NOT EXISTS update_edges_on_insert
    AFTER INSERT ON nodes
  BEGIN
    INSERT INTO edges(s, t)
      SELECT
        new.sha s,
        entry.value ->> 1 t
      FROM
        json_each(new.json) as entry
      WHERE
        entry.type = 'array' AND entry.value ->> 0 = 0 AND json_type(entry.value -> 1) = 'text';
  END;
  `,
];
