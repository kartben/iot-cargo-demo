'use strict';

var module = angular.module('app', ['ngRoute', 'ui.bootstrap', 'patternfly',
                                    'angular-websocket', 'ngMap',
                                    'angular-rickshaw', 'angularMoment',
                                    'frapontillo.bootstrap-switch']);

angular.element(document).ready(function () {

    // get config
    var initInjector = angular.injector(["ng"]);
    var $http = initInjector.get("$http");

    $http.get("config.json").then(function (response) {
        module.constant("APP_CONFIG", response.data);
        console.log("Bootstrapping system");
        angular.bootstrap(document, ["app"], {
            strictDi: true
        });
    });
});

Rickshaw.namespace('Rickshaw.Graph.Renderer.Xkcd');

Rickshaw.Graph.Renderer.Xkcd = Rickshaw.Class.create(Rickshaw.Graph.Renderer, {
    name: 'xkcd',

    defaults: function ($super) {
        return Rickshaw.extend($super(), {
            unstack: true,
            fill: false,
            stroke: true,
            stops: {
                stops: [],
                min: 0,
                max: 100
            }
        });
    },

    render: function () {
        var graph = this.graph;
        var strokeWidth = 3;

        graph.vis.selectAll('*').remove();

        var element = graph.vis.selectAll("path")
            .data(this.graph.stackedData)
            .enter();

        var line = d3.svg.line()
            .x(function (d) {
                return graph.x(d.x)
            })
            .y(function (d) {
                return graph.y(d.y)
            })
            .interpolate(this.graph.interpolation).tension(this.tension);

        var nodes = element.append("svg:path")
            .attr("d", line)
            .style("stroke-width", strokeWidth + "px")
            .style("stroke", "url(#line-gradient)")
            .style("fill", "none");

        element.append("linearGradient")
            .attr("id", "line-gradient")
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", 0).attr("y1", graph.y(this.stops.min))
            .attr("x2", 0).attr("y2", graph.y(this.stops.max))
            .selectAll("stop")
            .data(this.stops.stops)
            .enter().append("stop")
            .attr("offset", function (d) {
                return d.offset;
            })
            .attr("stop-color", function (d) {
                return d.color;
            });


        var i = 0;
        graph.series.forEach(function (series) {
            if (series.disabled) return;
            series.path = nodes[0][i++];
            this._styleSeries(series);
        }, this);
    }
});
