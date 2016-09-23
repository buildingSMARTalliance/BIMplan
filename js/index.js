$(function () {
    // Functions definitions {

    var createPopUp = function (feature, layer) {
        var _getPopupContent = function (feature) {
            var popupId = feature.properties.featureType + '_' + feature.id + '_popup';
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
            var properties = {};
            if (feature.properties.featureType == 'Building') {
                var _formatFloorLinks = function (floors) {
                    return _.map(floors, function (floor) {
                        return '<a href="./index.html?sysID=' + sysID + '&siteID=' + siteID + '&floorID=' + floor.id + '" target="_self">' + floor.properties.name + '</a>';
                    }).join('<br />');
                };
                if (loadedFloors[feature.id]) {
                    properties.floors = _formatFloorLinks(loadedFloors[feature.id]);
                } else {
                    properties.floors = '<h3>Loading</h3>';
                    $.ajax({
                        url: "https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=floors&bldgID=" + feature.id,
                        jsonp: "callback",
                        dataType: "jsonp",
                        success: function (response) {
                            loadedFloors[feature.id] = response.features;
                            $('#' + popupId + ' #floors').html(_formatFloorLinks(loadedFloors[feature.id]));
                        }
                    });
                }
            }


            properties.id = feature.id;
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
            html += '<table id="' + popupId + '">' + (_.map(properties, function (v, k) {
                    return '<tr><td valign="top">' + k + ':</td><td id="' + k + '" valign="top">' + v + '<td></tr>';
                }).join('')) + '</table>';
            return html;
        }
        if (feature.properties) {
            if (feature.properties.featureType == 'Component') {
                // If it is a component popup, also show component type information
                var title = '<h2>' + (feature.properties.unique_mark ? feature.properties.unique_mark + ' - ' : '') + feature.properties.name + '</h2>';
                var componentContent = _getPopupContent(feature);
                if (feature.properties.typeId) {
                    var componentType = componentTypes[feature.properties.typeId];
                    componentContent += '<h2>' + componentType.properties.name + '</h2>';
                    componentContent += _getPopupContent(componentType);
                }
                layer.bindPopup(title + componentContent);
            } else {
                layer.bindPopup(function () {
                    var title = '<h2>' + (feature.properties.number ? feature.properties.number + ' - ' : '') + feature.properties.name + '</h2>';
                    var content = title + _getPopupContent(feature);
                    if (feature.properties.featureType == 'Space' && loadedComponents !== false && !loadedComponents[feature.id]) {
                        // If it is a space popup (and the components are not yet loadedComponents for this space), show link to load components
                        content += '<a href="javascript:;" onclick="loadComponents(' + feature.id + ');">Load components</a>';
                    }
                    return content;
                });
            }
        }
    };
    var loadComponents = function (spaceID) {
        $('.leaflet-popup').remove();
        $.ajax({
            url: "https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=components&floorID=" + floorID + (spaceID ? '&spaceID=' + spaceID : ''),
            jsonp: "callback",
            dataType: "jsonp",
            success: function (response) {
                if (spaceID) {
                    loadedComponents[spaceID] = true;
                } else {
                    loadedComponents = false;
                }
                var layer;
                // manually parse geojson, create overlays and insert into layer
                if (png) {
                    var _createComponentOverlay = function (feature, map) {
                        var polyline = feature.geometry.coordinates[0];
                        var topleft = L.latLng(polyline[3][1], polyline[3][0]),
                            topright = L.latLng(polyline[2][1], polyline[2][0]),
                            bottomleft = L.latLng(polyline[0][1], polyline[0][0]);
                        var imageName = (feature.properties.imageName ? feature.properties.imageName : 'Rectangle.png');
                        var overlay = L.imageOverlay.rotated('furnBitmaps/' + imageName, topleft, topright, bottomleft, {
                            pane: 'markerPane',
                            opacity: 1
                        });
                        return overlay;
                    };
                    var _createComponentPolygon = function (feature, map) {
                        // creates a semi-transparent polygon overlay below the png to capture mouse click for the popup
                        var polyline = feature.geometry.coordinates[0];
                        var polygon = L.polygon(_.map(polyline, function (p) {
                            return [p[1], p[0]];
                        }), {color: '#fff', opacity: 0.01});
                        createPopUp(feature, polygon);
                        return polygon;
                    };

                    var components = _.map(response.features, function (f) {
                        return _createComponentOverlay(f, map);
                    });
                    var polygons = _.map(response.features, function (f) {
                        return _createComponentPolygon(f, map);
                    });
                    layer = L.layerGroup(components.concat(polygons));
                } else {
                    layer = L.geoJson(response, overlayParams);
                }
                componentLayer.addLayer(layer);
            }
        });
    };
    window.loadComponents = loadComponents;

    var createPolygonStyle = function (feature) {
        var fillColor = "#fff", opacity = 0.6, color = "#000";
        if (feature.properties.featureType == 'Site') {
            fillColor = '#d4fff4';
            opacity = 0.2;
        } else if (feature.properties.featureType == 'Building') {
            fillColor = '#99f';
        } else if (feature.properties.featureType == 'Floor') {
            fillColor = '#b9b9e8';
        } else if (feature.properties.featureType == 'Component') {
            // polygon for components that don't use the PNGs (Firefox, Safari)
            opacity = 0.3;
            color = fillColor = '#00f';
        } else if (feature.properties.featureType == 'Space') {
            if (feature.properties.hasComponents) {
                opacity = 0.8;
                color = "#F00";
            } else {
                opacity = 0.6;
                color = "#000";
            }
        }
        return {color: color, weight: 0.8, fillColor: fillColor, fillOpacity: opacity};
    };

    var createBuildingMarker = function (feature, coord) {
        return L.marker(coord, {
            icon: L.icon({
                iconUrl: 'home.png',
                iconSize: [27, 21]
            })
        });
    };
    var createLayer = function (url, layerName, params, z) {
        var _getFeatureBounds = function (feature) {
            var arr;
            if (feature.geometry.type == 'MultiPolygon') {
                arr = _.flatten(_.flatten(feature.geometry.coordinates, true), true);
            } else if (feature.geometry.type == 'Polygon') {
                arr = _.flatten(feature.geometry.coordinates, true);
            }
            var latlngs = _.map(arr, function (elem) {
                return [elem[1], elem[0]];
            });
            var polygon = L.polygon(latlngs);
            return polygon.getBounds();
        };
        var layer = L.layerGroup([]).setZIndex(z).addTo(map);
        control.addOverlay(layer, layerName);
        $.ajax({
            url: url,
            jsonp: "callback",
            dataType: "jsonp",
            success: function (response) {
                var geoJsonLayer = L.geoJson(response, params).setZIndex(z).addTo(map);
                layer.addLayer(geoJsonLayer);


                if (layerName == 'Floor' && floorID) {
                    map.fitBounds(_getFeatureBounds(response.features[0]));

                    // add iPad link button
                    var buildingId = response.features[0].properties.buildingId;
                    var bldgSpatialStructureID = response.features[0].properties.onuma.bldgSpatialStructureID;
                    var floorSpatialStructureID = response.features[0].properties.onuma.floorSpatialStructureID;
                    var url = "https://www.onuma.com/bookmarklink/#onumaOnlineBookmark://|" + sysID + "|" + siteID + "|" + bldgSpatialStructureID + "|" + buildingId + "|" + floorSpatialStructureID + "|" + floorID + "|-1|-1";
                    var iPadLinkHtml = $("<a class='btn' target='_blank'>Open on iPad 3D<br>or in ONUMA</a>").prop('href', url);
                    $("#iPadLink").html(iPadLinkHtml);
                } else if (layerName == 'Site') {
                    map.fitBounds(_getFeatureBounds(response.features[0]));
                }
            }
        });
    };

    var loadComponentTypes = function () {
        $.ajax({
            url: "https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=types",
            jsonp: "callback",
            dataType: "jsonp",
            success: function (response) {
                _.each(response.attributes, function (componentType) {
                    componentTypes[componentType.id] = componentType;
                });
            },
        });
    };

    var createComponentsLayer = function () {
        // create an empty components layer;
        // components will be added  after clicking on the space popup link (Load components)
        var z = 1000, layerName = 'Components';
        componentLayer = L.layerGroup([]).setZIndex(z).addTo(map);
        control.addOverlay(componentLayer, layerName);
        map.on('zoomend', function () {
            if (map.getZoom() < 19 && map.hasLayer(componentLayer)) {
                map.removeLayer(componentLayer);
            }
            if (map.getZoom() >= 19 && !map.hasLayer(componentLayer)) {
                console.log('added');
                map.addLayer(componentLayer);
            }
        });
    };
    var updateInfoHtml = function () {
        var infoHtml = '';
        infoHtml += "<strong>OR</strong> click on spaces <span class='red'>with red outlines</span> to load components of individual spaces.<br>"
            + "At some point when zooming out, components are being turned off.";
        $("#planInfo").html(infoHtml);
    }
    var updateUrlRequestsHtml = function () {
        var geojsonRequestsHtml = '';
        geojsonRequestsHtml += "<ul>"
            + "<li>"
            + "GeoJSON web service responses for current plan:"
            + "</li>"
            + "<li>"
            + "<a href='https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=sites' target='_blank'>Current Site</a>"
            + "</li>"
            + "<li>"
            + "<a href='https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=buildings' target='_blank'>Buildings on Site</a>"
            + "</li>";
        if (floorID) {
            geojsonRequestsHtml += "<li>"
                + "<a href='https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=floors&floorID=" + floorID + "' target='_blank'>Current Floor</a>"
                + "</li>"
                + "<li>"
                + "<a href='https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=spaces&floorID=" + floorID + "' target='_blank'>Current Spaces</a>"
                + "</li>";
        }
        geojsonRequestsHtml += "</ul>";
        $("#urlRequests").html(geojsonRequestsHtml);
    };
    var updatePortfolioBackLinkHtml = function () {
        var portfolioBackLinkHtml = '';
        portfolioBackLinkHtml = "<a class='btn' href='./portfolio.html?sysID=" + sysID + "'>Portfolio</a>";
        $("#portfolio").html(portfolioBackLinkHtml);
    };
    var updateSiteLinkHtml = function () {
        var siteLinkHtml = '';
        siteLinkHtml = "<a class='btn' href='./index.html?sysID=" + sysID + "&siteID=" + siteID + "'>Site View</a>";
        $("#site").html(siteLinkHtml);
    };
    var updateLoadComponentsHtml = function () {
        var loadComponentsHtml = '';
        loadComponentsHtml = "<a class='btn' onclick='loadComponents()'>Load All Components</a>";
        $("#loadComponents").html(loadComponentsHtml);
    };
    // } End of functions definitions


    // Variable definitions {
    // } End of variable definitions
    var componentTypes = {}; // { componentTypeId: componentType }
    var loadedComponents = {}; // object used to store loaded components ({ spaceId: true })
    var loadedFloors = {}; // object used to store loaded floors ({ bldgId: floors })
    var sysID = getUrlParameter('sysID');
    var siteID = getUrlParameter('siteID');
    var floorID = getUrlParameter('floorID');
    var spaceID = getUrlParameter('spaceID');
    var png = getUrlParameter('png');
    var componentLayer;
    var control;
    if (png === 0) {
        png = "";
    } else if ((L.Browser.safari && png != 1) || (L.Browser.gecko && png != 1)) {
        png = "";
    } else {
        png = 1;
    }
    var overlayParams = {
        dataType: "jsonp",
        onEachFeature: createPopUp,
        style: createPolygonStyle,
        pointToLayer: createBuildingMarker
    };

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

    // initialize the map / set it to max Zoom of OpenStreetMap if no floors are shown
    // var map = L.map('map').setView([47.55895, -122.34165], 21);
    var map = L.map('map');
    if (!floorID) {
        // show OpenStreetMap if no floors are shown
        map.setMaxZoom(19);
        OpenStreetMap.addTo(map);
    }
    control = L.control.layers(baseMaps).addTo(map);
    L.control.scale({
        //metric: false,
        //maxWidth: 500
    }).addTo(map);

    createLayer("https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=sites", 'Site', overlayParams, 410);
    createLayer("https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=buildings", 'Building', overlayParams, 420);
    if (floorID) {
        createLayer("https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=floors&floorID=" + floorID, 'Floor', overlayParams, 430);
        createLayer("https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=spaces&floorID=" + floorID, 'Space', overlayParams, 440);
        loadComponentTypes();
        createComponentsLayer();
        updateSiteLinkHtml();
        updateLoadComponentsHtml();
        updateInfoHtml();
    } else {
        //create floor layer without popup
        createLayer("https://www.onuma.com/plan/OPS/export/saveGeoJSON.php?sysID=" + sysID + "&siteID=" + siteID + "&object=floors", 'Floor', {
            dataType: "jsonp",
            style: createPolygonStyle
        }, 430);
    }
    updateUrlRequestsHtml();
    updatePortfolioBackLinkHtml();
});
