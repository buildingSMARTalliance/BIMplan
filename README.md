Leaflet BIMplan creates building plan overlays from GeoJSON web services
([Demo](https://bim-genie.com/static/planview/portfolio.html?sysID=177))

# Leaflet BIMplan

Leaflet BIMplan creates building plan overlays from GeoJSON web services.

This is a prototype viewer that is part of BIMStorm Data Independence.

This runs best on Chrome browsers. Other browsers work, but the equipment level plans do not render images yet.

Join [BIMStorm.com](http://BIMStorm.com) to learn more and how you can use this and expand the functionality.

Some of the known issues:

- Not all building equipment and furniture is displaying correctly with the rotated image overlays in all browsers. For Firefox and Safari we change to display furniture as orthogonal and rotated polygons instead of the image overlays.
- The furniture display works best in Google Chrome but also in Internet Explorer 11 (surprise!) (no earlier versions have been tested)
- Not all buildings have detailed floor plans coming from the BIM Cloud Server
- We are still making adjustments to the code to display optimized floor plans.
- Many improvements are possible
  - most importantly: add authentication for the Cloud Server Requests!
  - markers at portfolio level colored and with icons representing the status or the condition of the site
  - color coding of spaces dependent on space attributes
  - add additional attributes for buildings, spaces, and equipment
  - etc.

## Using Leaflet BIMplan

- Navigate between portfolio level and building floor plan level
- Select a building icon to navigate to it's floors
- Select a space to dynamically load its components (equipment + furniture)
- Select a link to display the GeoJSON Cloud Server response

## License

Copyright (c) Onuma, Inc. / 2016

Leaflet BIMplan is free software. Please see [LICENSE](LICENSE) for details.

For licenses of Leaflet, the Leaflet plugins, and js libraries see their respective repositories:

- [Leaflet](https://github.com/Leaflet/Leaflet)
- [Leaflet.ImageOverlay.Rotated Plugin](https://github.com/IvanSanchez/Leaflet.ImageOverlay.Rotated)
- [UnderscoreJS](https://github.com/jashkenas/underscore)
- [jQuery](https://github.com/jquery/jquery)

