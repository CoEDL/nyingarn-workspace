# DB migrations

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
npx sequelize-cli db:migrate --config ./src/models/config.cjs --migrations-path ./src/models/migrations --name ./src/models/migrations/{migration-file.js}
```

## Undoing all migrations

```
npx sequelize-cli db:migrate:undo --config ./src/models/config.cjs --migrations-path ./src/models/migrations
```

## Undoing a specific migration

```
npx sequelize-cli db:migrate:undo --config ./src/models/config.cjs --migrations-path ./src/models/migrations --name ./src/models/migrations/{migration-file.js}
```
