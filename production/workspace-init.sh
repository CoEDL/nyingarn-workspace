#!/bin/bash

export PATH=/usr/local/bin:$PATH

start() {
    	docker-compose -f docker-compose-01-base-services.yml up -d
    	sleep 10
    	docker-compose -f docker-compose-02-nyingarn.yml up -d
}

stop() {
    docker-compose -f docker-compose-02-nyingarn.yml stop && docker-compose -f docker-compose-02-nyingarn.yml rm -f
    docker-compose -f docker-compose-01-base-services.yml stop && docker-compose -f docker-compose-01-base-services.yml rm -f
}

maintenance_on() {
    docker-compose -f docker-compose-02-nyingarn.yml stop && docker-compose -f docker-compose-02-nyingarn.yml rm -f
    docker run \
        -d --rm \
        -v "$PWD/maintenance.html:/usr/share/nginx/html/index.html" \
        -v "$PWD/nginx-maintenance.conf:/etc/nginx/conf.d/default.conf" \
        -v "/srv/workspace/letsencrypt:/srv/letsencrypt" \
        -v "$PWD/dhparams.pem:/etc/nginx/dhparams.pem" \
        -p 80:80 \
        -p 443:443 \
        nginx:latest
}

maintenance_off() {
    docker stop $(docker ps | grep nginx:latest  | awk '{print $1}')
    docker-compose -f docker-compose-02-nyingarn.yml up -d
}

case "$1" in
    start)
       start
       ;;
    stop)
       stop
       ;;
    mon)
       maintenance_on
       ;;
    moff)
       maintenance_off
       ;;
    restart)
       maintenance_on
       maintenance_off
       ;;
    update)
      docker compose -f docker-compose-01-base-services.yml pull
      docker compose -f docker-compose-02-nyingarn.yml pull
      ;;
    *)
       echo "Usage: $0 {start|stop|restart}"
esac

exit 0