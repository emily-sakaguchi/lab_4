/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------*/


/*--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
//Define access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZW1pbHlzYWthZ3VjaGkiLCJhIjoiY2xkbTByeWl5MDF5YjNua2RmdWYyZ240ciJ9.l0mkQSD3VSua3-9301GQbA'; // my MapBox public access token

//Initialize map and edit to your preference
const map = new mapboxgl.Map({
    container: 'map', //container id in HTML
    style: 'mapbox://styles/emilysakaguchi/clexsrdwn000901nllrb8b6wy',  //my custom mapbox style
    center: [-79.39, 43.65],  // starting point, longitude/latitude (centers Toronto)
    zoom: 12 // starting zoom level
});


/*--------------------------------------------------------------------
Step 2: VIEW GEOJSON POINT DATA ON MAP
--------------------------------------------------------------------*/
//HINT: Create an empty variable
//      Use the fetch method to access the GeoJSON from your online repository
//      Convert the response to JSON format and then store the response in your new variable
let collisionjson;

fetch('https://raw.githubusercontent.com/emily-sakaguchi/lab_4/main/ggr472-lab4/data/pedcyc_collision_06-21.geojson')

    .then(response => response.json())
    .then(response => {
        console.log(response); //Check response in console
        collisionjson = response; // Store geojson as variable using URL from fetch response
    });

   
        //MY alternate code to change point size on zoom
            //'circle-radius':['interpolate', ['linear'], ['zoom'], 9, 1, 10.5, 2, 12, 3, 15, 5],
            // the above code adjusts the size of points according to the zoom level

/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
//HINT: All code to create and view the hexgrid will go inside a map load event handler
//      First create a bounding box around the collision point data then store as a feature collection variable
//      Access and store the bounding box coordinates as an array variable
//      Use bounding box coordinates as argument in the turf hexgrid function
map.on('load', () => {

let bboxgeojson;        
let bbox = turf.envelope(collisionjson); //send point geojson to turf, creates an 'envelope' (bounding box) around points
//put the resulting envelope in a geojson format FeatureCollection
let bboxscaled = turf.transformScale(bbox, 1.10); //scale bbox up by 10%
bboxgeojson = {        
    'type': 'FeatureCollection',        
    'features': [bboxscaled]
};

console.log(bbox) //checking to see that the bbox variable has the expected characteristics
console.log(bbox.geometry.coordinates) //checking the bbox coordinates in the console

//the coordinates are ordered in this way: min X,min Y, max X, max Y
let bboxcoords = [bboxscaled.geometry.coordinates[0][0][0],            
    bboxscaled.geometry.coordinates[0][0][1],
    bboxscaled.geometry.coordinates[0][2][0], 
    bboxscaled.geometry.coordinates[0][2][1]]; 
console.log(bboxcoords)

//adding the hexgrid  to the map
    //creating the hexgrid       
    let hexgeojson = turf.hexGrid(bboxcoords, 0.5, {units: 'kilometers'}); 
    //bboxcoords specify the bounding box coordinates, i.e. the geographic limits within which to drae hexagons
    //0.5 is the length of the side of the hexagon
    //units are in kilometres which is appropriate to Toronto, the area of study, where metric units are used

/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty


    let collishex = turf.collect(hexgeojson, collisionjson, '_id', 'values');

let maxcollis = 0;

collishex.features.forEach((feature) => {
    feature.properties.COUNT = feature.properties.values.length
    if (feature.properties.COUNT > maxcollis) {
        console.log(feature);
        maxcollis = feature.properties.COUNT
    }
})
/*--------------------------------------------------------------------
ADDING DATA TO THE MAP COLLISIONS
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty
    //Add datasource using GeoJSON variable
    map.addSource('collisions-TO', {
        type: 'geojson', //geojson format is essential for the Turf.js functions used below
        data: collisionjson //using the variable I created above as the data source
    });
    
    map.addLayer({
        'id': 'serious-collisions',
        'type': 'circle',
        'source': 'collisions-TO', //matches the source given above
        'paint': {
            'circle-radius': 2,
            'circle-color': 'red' //red is appropriate to symbolize serious collisions due to its association with danger and warnings
        }
    }); 
    
    //adding the bounding box to the map
    map.addSource('collis-bbox', {
        'type': 'geojson',
        'data': bboxgeojson        
    });
                    
    map.addLayer({        
        'id': 'collisionEnvelope',        
        'type': 'fill',        
        'source': 'collis-bbox',        
        'paint': {       
            'fill-opacity': 0, //I have no fill/ a completely transparent fill to ensure the visibility of the underlying map        
            'fill-outline-color': 'black'        
        }        
    });

    map.addSource('collis-hex', {
        'type': "geojson",
        'data': hexgeojson
        });
    
    map.addLayer({
        'id': 'collishexgrid',
        'type': 'fill',
        'source': 'collis-hex',
        'paint': {
            'fill-color': [
                'step', //the step expression used here visualizes the collision counts for each hexagon
                ['get', 'COUNT'],
                '#800026',
                10, '#bd0026',
                25, '#e31a1c',
                55, 'red' //The maximum number of collisions within one hexagon
            ],
            'fill-opacity': 0.5,
            'fill-outline-color': 'white'
        }
    });
})
