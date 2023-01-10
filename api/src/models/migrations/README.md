# DB migrations

<<<<<<< HEAD
=======
Be sure to execute these commands **inside** the API container

>>>>>>> implement-publish-flow
## Creating a new migration

```
npx sequelize-cli migration:generate --config ./src/models/config.cjs --migrations-path ./src/models/migrations --name {description-name-for-migration}
```

# Running all migrations

```
npx sequelize-cli db:migrate --config ./src/models/config.cjs --migrations-path ./src/models/migrations
```

## Running a specific migration

```
<<<<<<< HEAD
npx sequelize-cli db:migrate --config ./src/models/config.cjs --migrations-path ./src/models/migrations --name ./src/models/migrations/{migration-file.js}
```

=======
npx sequelize-cli db:migrate --config ./src/models/config.cjs --migrations-path ./src/models/migrations --name {migration-file.js}
```

Note: The name must be the name of the migration file; ie without the path

>>>>>>> implement-publish-flow
## Undoing all migrations

```
npx sequelize-cli db:migrate:undo --config ./src/models/config.cjs --migrations-path ./src/models/migrations
```

## Undoing a specific migration

```
<<<<<<< HEAD
npx sequelize-cli db:migrate:undo --config ./src/models/config.cjs --migrations-path ./src/models/migrations --name ./src/models/migrations/{migration-file.js}
```
=======
npx sequelize-cli db:migrate:undo --config ./src/models/config.cjs --migrations-path ./src/models/migrations --name {migration-file.js}
```

Note: The name must be the name as found in the "SequelizeMeta" table; ie the name of the file
without the path.
>>>>>>> implement-publish-flow
