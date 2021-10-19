#!/bin/bash


start() {
	cd /srv/workspace
    	docker-compose -f docker-compose-01-base-services.yml up -d
    	sleep 5
    	docker-compose -f docker-compose-02-describo.yml up -d
    	sleep 5
    	docker-compose -f docker-compose-03-nyingarn.yml up -d
}

stop() {
    cd /srv/workspace
    docker-compose -f docker-compose-03-nyingarn.yml stop && docker-compose -f docker-compose-03-nyingarn.yml rm -f
    docker-compose -f docker-compose-02-describo.yml stop && docker-compose -f docker-compose-02-describo.yml rm -f
    docker-compose -f docker-compose-01-base-services.yml stop && docker-compose -f docker-compose-01-base-services.yml rm -f
}

case "$1" in 
    start)
       start
       ;;
    stop)
       stop
       ;;
    restart)
       stop
       start
       ;;
    *)
       echo "Usage: $0 {start|stop|restart}"
esac

exit 0 
