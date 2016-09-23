$(function () {
    // Functions definitions {
    var getPopupContent = function (feature) {
        var formatLinks = function (links) {
            return _.map(links, function (v) {
                if (v.type && v.type == 'file') {
                    if (v.url) {
                        return '<a href="' + v.url + '" target="_blank">' + v.name + '</a>';
                    } else {
                        return v.name;
                    }
                } else if (v.type && v.type == 'image') {
                    if (v.url) {
                        return '<a href="' + v.url + '" target="_blank"><img src="' + v.url + '" border="0" style="width:120px;" /></a>';
                    } else {
                        return v.name;
                    }
                } else {
                    return v;
                }
            }).join('<br />');
        };
        var properties = {'id': feature.id};
        _.each(feature.properties, function (v, k) {
            if (k == 'name' || k == 'imageName') return;
            if (!v) return; // skip values that are empty / false
            if (Array.isArray(v) && v.length === 0) return; // skip values that are empty arrays
            if (k == 'links') {
                properties[k] = formatLinks(v);
                return;
            }
            properties[k] = v;
        });

        var html = '';
        html += '<h3><a href="./index.html?sysID=' + sysID + '&siteID=' + feature.id + '">SiteID = ' + feature.id + '</a></h3>';
        html += '<table>' + (_.map(properties, function (v, k) {
                return '<tr><td valign="top">' + k + ':</td><td valign="top">' + v + '<td></tr>';
            }).join('')) + '</table>';
        return html;
    };
    var onEachFeature = function (feature, layer) {
        if (feature.geometry.type === 'Polygon') {
            layer.setStyle({
                'weight': 0,
                'fillOpacity': 0
            });
            // Get bounds of polygon
            var bounds = layer.getBounds();
            // Get center of bounds
            var center = bounds.getCenter();
            // Use center to put marker on map
            var siteIcon = L.icon({
                iconUrl: 'marker/red_V.png',
                iconSize: [20, 34]
            });
            var marker = L.marker(center, {
                icon: siteIcon,
                draggable: true
            }).addTo(map);

            if (feature.properties) {
                var title = '<h2>' + (feature.properties.number ? feature.properties.number + ' - ' : '') + feature.properties.name + '</h2>';
                marker.bindPopup(title + getPopupContent(feature));
            }
        }
    };

    var loadSites = function (sysID) {
        $.ajax({
            url: "https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&object=sites",
            jsonp: "callback",
            dataType: "jsonp",
            success: function (response) {
                var layer = L.geoJson(response, {
                    onEachFeature: onEachFeature
                });
                map.fitBounds(layer.getBounds());
            }
        });
    };
    // } End of functions definitions

    // Variable definitions {
    var sysID = getUrlParameter('sysID');
    // Those aren't used right now.
    // var siteID = getUrlParameter('siteID');
    // var floorID = getUrlParameter('floorID');
    // var spaceID = getUrlParameter('spaceID');
    var png = getUrlParameter('png');
    var control;
    if (png === 0) {
        png = "";
    } else if (L.Browser.safari || L.Browser.gecko) {
        png = "";
    } else {
        png = 1;
    }
    // add various tile layers
    var EsriWorldStreet = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    });

    var EsriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    });

    var OpenStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    var None = L.tileLayer('', {
        maxZoom: 28,
        attribution: ''
    });

    var MapBox = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Imagery from <a href="https://mapbox.com/about/maps/">MapBox</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        id: 'thomasdalbert.14l14pcc',
        accessToken: 'pk.eyJ1IjoidGhvbWFzZGFsYmVydCIsImEiOiJjaXJ3cTZod3QwMDBqMnNsaHVlaWFtdjUzIn0.k68dm3gA3LSyuhD-IfHioA'
    });

    var baseMaps = {
        "None": None,
        "Mapbox": MapBox,
        "Open Street Map": OpenStreetMap,
        "ESRI Satellite": EsriWorldImagery,
        "ESRI Street": EsriWorldStreet
    };
    // } End of variable definitions

    // initialize the map
    var map = L.map('map');
    OpenStreetMap.addTo(map);
    control = L.control.layers(baseMaps).addTo(map);
    L.control.scale({
        //metric: false,
        maxWidth: 400
    }).addTo(map);
    loadSites(sysID);
});
