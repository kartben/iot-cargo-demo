'use strict';

angular.module('app')

    .factory('ConfigData', ['$http', '$q', 'APP_CONFIG', 'Notifications', function ($http, $q, APP_CONFIG, Notifications) {
        var listeners = [], factory = {}, currentShipments = [], allShipmentPkgIds = [], offlineMode = false,
            auth = make_base_auth(APP_CONFIG.EDC_USERNAME, APP_CONFIG.EDC_PASSWORD);

        function make_base_auth(user, password) {
            var tok = user + ':' + password;
            var hash = btoa(tok);
            return "Basic " + hash;
        }
        
        factory.addListener = function (listener) {
            listeners.push(listener);
        };

        factory.getDesc = function(pkgId) {
            for (var i = 0; i < currentShipments.length; i++) {
                if (currentShipments[i].pkgId == pkgId) {
                    return (currentShipments[i].name ? currentShipments[i].name : currentShipments[i].pkgId);
                }
            }
        };

        factory.removeAllListeners = function () {
            listeners = [];
        };
        factory.removeListener = function (listener) {
            listeners = listeners.filter(function (l) {
                return (l != listener);
            });
        };

        factory.getCurrentShipments = function () {
            return currentShipments;
        };

        factory.getAllShipmentPkgIds = function () {
            return allShipmentPkgIds;
        };

        factory.removeShipment = function(shipment, onSuccess, onFail) {
            // set config
            var tmpShipments = currentShipments.filter(function(shipObj) {
                return (shipment.pkgId != shipObj.pkgId);
            });

            persistShipments(tmpShipments, function (newShipments) {

                currentShipments = newShipments;
                listeners.forEach(function (listener) {
                    listener(null);
                });
                onSuccess(currentShipments);
            }, function (errMsg) {
                onFail(errMsg);
            });
        };

        factory.addShipment = function(shipment, onSuccess, onFail) {
            // set config
            var tmpShipments = currentShipments.concat(shipment);

            persistShipments(tmpShipments, function (newShipments) {

                currentShipments = newShipments;
                listeners.forEach(function (listener) {
                    listener(null);
                });
                onSuccess(currentShipments);

            }, function (errMsg) {
                onFail(errMsg);
            });
        };

        factory.saveShipments = function() {
            persistShipments(currentShipments, function(newShipments) {

            }, function(errMsg) {

            });

        };

        var persistShipments = function(shipments, onSuccess, onFail) {
            if (offlineMode) {
                onSuccess(shipments);
                return;
            }

            $http({
                method: 'PUT',
                url: APP_CONFIG.JDG_REST_ENDPOINT + '/rhiot/sensorConfig',
                data: JSON.stringify(shipments)
            }).then(function successCallback(response) {
                onSuccess(shipments);
            }, function errorCallback(response) {
                onFail(response.statusText);
            });

        };

        function toUnique(a, b, c) { //array,placeholder,placeholder
            b = a.length;
            while (c = --b)
                while (c--) a[b] !== a[c] || a.splice(c, 1);
            return a // not needed ;)
        }


        factory.reset = function () {


            allShipmentPkgIds = [];
            currentShipments = [];
            
            function offlineMode() {
                offlineMode = true;
                currentShipments = [
                    {
                        pkgId: "Precious Cargo Package ID",
                        name: "Precious Cargo",
                        fromAddress: 'San Francisco International Airport',
                        toAddress: 'Hilton San Francisco Union Square',
                        eta: (new Date().getTime() + (Math.random() * 144 * 60 * 60 * 1000)),
                        randomData: true
                    }
                ];
            }

            // get config
            $http({
                method: 'GET',
                url: APP_CONFIG.JDG_REST_ENDPOINT + '/rhiot/sensorConfig'
            }).then(function (response) {
                currentShipments = response.data;
                if ((currentShipments == undefined) || (currentShipments.constructor !== Array)) {
                    Notifications.error("Error fetching Sensor Configuration (invalid data). Reload to retry");
                    offlineMode();
                    listeners.forEach(function (listener) {
                        listener(null);
                    });
                    return;
                }

                currentShipments = currentShipments.filter(function(shipment) {
                    return shipment.pkgId;
                });

            }, function sensorConfigError(response) {
                Notifications.error("Error fetching Sensor Configuration: " + response.statusText + ". Reload to retry");
                offlineMode();
                listeners.forEach(function (listener) {
                    listener(null);
                });

            });

            // get asset list
/*
            $http({
                method: 'GET',
                url: APP_CONFIG.EDC_REST_ENDPOINT + '/assets',
                headers: {
                    'Authorization': auth
                }
            }).then(function successCallback(response) {

                response.data.assetInfo.forEach(function(asset) {
*/

                    $http({
                        method: 'GET',
                        url: APP_CONFIG.EDC_REST_ENDPOINT + '/topics',
                        headers: {
                            'Authorization': auth
                        }
                    }).then(function successCallback(response) {
                        var arr = [];

                        response.data.topicInfo.forEach(function(topic) {
                            arr.push(topic.topic.replace(/^(.*?)\/(.*?)\/(.*?)/, '$1/+/$3'));
                        });

                        toUnique(arr);
                        arr.sort();

                        allShipmentPkgIds = arr;

                        listeners.forEach(function (listener) {
                            listener(null);
                        });


                    }, function errorCallback(response) {
                        Notifications.error("error fetching asset topics list: " + response.statusText);
                    });


/*

                });

            }, function errorCallback(response) {
                Notifications.error("error fetching asset list: " + response.statusText);

            });
*/

            // {
            // 	pkgId: '0520 - ColdFire Parts',
            // 	fromAddress: '100 Central Avenue, Orlando, FL',
            // 	toAddress: 'Orlando International Airport',
            // 	eta: Date.now() + (Math.random() * (1000 * 60 * 60 * 24 * 3))
            // }

/*
            $http({
                method: 'GET',
                url: APP_CONFIG.EDC_REST_ENDPOINT + '/assets',
                headers: {
                    'Authorization': auth
                }
            }).then(function successCallback(response) {

                response.data.assetInfo.forEach(function(asset) {

                    $http({
                        method: 'GET',
                        url: APP_CONFIG.EDC_REST_ENDPOINT + '/assets/' + asset.asset + '/topics',
                        headers: {
                            'Authorization': auth
                        }
                    }).then(function successCallback(response) {

                        response.data.topicInfo.forEach(function(topic) {
                            allShipmentPkgIds.push(topic.topic);
                        });

                        listeners.forEach(function (listener) {
                            listener(null);
                        });


                    }, function errorCallback(response) {
                        Notifications.error("error fetching asset topics list: " + response.statusText);
                    });



                });

            }, function errorCallback(response) {
                Notifications.error("error fetching asset list: " + response.statusText);
            });
*/

        };

        factory.reset();

        return factory;
    }]);
