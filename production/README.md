- [Getting setup to run this environment](#getting-setup-to-run-this-environment)
  - [Set up DNS](#set-up-dns)
  - [Get your SSL certificates](#get-your-ssl-certificates)
  - [Edit the nginx configurations](#edit-the-nginx-configurations)
  - [Generate dhparams](#generate-dhparams)
  - [Create the .env and configuration files](#create-the-env-and-configuration-files)
    - [Describo configuration](#describo-configuration)
    - [Workspace configuration](#workspace-configuration)
    - [Environment configuration](#environment-configuration)
- [Starting the environment](#starting-the-environment)
- [Stopping the environment](#stopping-the-environment)
- [Restarting the environment](#restarting-the-environment)

# Getting setup to run this environment

The master document is at
[https://github.com/CoEDL/nyingarn-workspace/wiki/Setting-up-a-production-deployment](https://github.com/CoEDL/nyingarn-workspace/wiki/Setting-up-a-production-deployment).

## Set up DNS

Register the following names:

-   workspace.${your domain}
-   s3.${your domain}
-   s3-console.${your domain}
-   tus.${your domain}
-   describo.${your domain}

## Get your SSL certificates

See the documentation @
[https://github.com/CoEDL/nyingarn-workspace/wiki/Setting-up-a-production-deployment#get-the-required-ssl-certificates-from-letsencrypt](https://github.com/CoEDL/nyingarn-workspace/wiki/Setting-up-a-production-deployment#get-the-required-ssl-certificates-from-letsencrypt)

## Edit the nginx configurations

You will need to edit the nginx configurations and service configurations to use the DNS names
you've defined above.

## Generate dhparams

```
openssl dhparam -out ./dhparams.pem 2048
```

## Create the .env and configuration files

Copy env to `.env` and edit the variables. Whilst you're at it you can edit the configuration files
described in the next section.

### Describo configuration

Describo specific configuration is in `configuration-describo.json`

### Workspace configuration

Workspace specific configuration is in `configuration-nyingarn.json`

### Environment configuration

In order to run the environment some configuration is needed as environment variables in the docker
compose files. This configuration is kept in the filei `.env` in this directory.

Docker compose automatically looks for this file when starting up services and joins in the content.
Specifically, database credentials are found in the file. Though some information is found in there
and the service specific configurations identified above.

(Think of it like this: the describo and workspace api applications will read a JSON configuration
at startup to configure themselves. Other services like the tus upload endpoint are thirs party
services that are configured via env variables. Hence why some configuration is in .env and the
service specific configuration files).

# Starting the environment

./workspace-init.sh start

# Stopping the environment

./workspace-init.sh stop

# Restarting the environment

./workspace-init.sh restart
