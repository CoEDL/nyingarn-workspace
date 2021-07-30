# Nyingarn User / Group / Role Manager

A lightweight, RESTful API for managing users, groups and roles. It's expected that your application
keeps track of the user infromation you require after an external login process has happened (e.g.
AAF, social login) and then you call out to this service to keep track of user -> group mappings,
user -> role mappings and group -> role mappings.

## API Documentation

If you're using the service you probably want the API documentation:
[https://coedl.github.io/nyingarn-users-groups-roles/](https://coedl.github.io/nyingarn-users-groups-roles/)

## Developing this application

-   Start up the environment: `docker compose up`
-   As it's headless it's all driven by tests

## Documenting the routes

JSDoc is used to create route documentation. Follow the convention in the code of documenting the
API route handlers.

## Building the documentation

-   `npm run generate-docs`
