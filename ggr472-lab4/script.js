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


        let bboxgeojson;
        let bbox = turf.envelope(collisionjson); //send point geojson to turf, creates an 'envelope' (bounding box) around points
            //put the resulting envelope in a geojson format FeatureCollection
        bboxgeojson = {
            "type": "FeatureCollection",
            "features": [bbox]
        };
        
        console.log(bbox)
        console.log(bbox.geometry.coordinates)
        
        let bboxcoords = (bbox.geometry.coordinates[0][0][0], // min X
                bbox.geometry.coordinates[0][0][1], // /min Y
                bbox.geometry.coordinates[0][2][0], //max X
                bbox.geometry.coordinates[0][2][1]) //max Y
        
            let hexgeojson = turf.hexGrid(bboxcoords, 0.5, {units: 'kilometres'});

map.on('load', () => {
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
            'circle-radius': 5,
            'circle-color': 'red' //red is appropriate to symbolize serious collisions due to its association with danger and warnings
        }
    }); //adding the bounding box to the map
            
    map.addSource('collis-bbox', {
        "type": "geojson",
        "data": bboxgeojson        
    });
                    
    map.addLayer({        
        "id": "collisionEnvelope",        
        "type": "fill",        
        "source": "collis-bbox",        
        "paint": {
            'fill-color': "red",        
            'fill-opacity': 0.5,        
            'fill-outline-color': "black"        
        }        
    });
    
    //adding the hexgrid  to the map
    map.addSource('collis-hex', {
        "type": "geojson",
        "data": hexgeojson
        });
    
    map.addLayer({
        "id": "collishexgrid",
        "type": "fill",
        "source": "collis-hex",
        "paint": {
            'fill-color': "red",
            'fill-opacity': 0.5,
            'fill-outline-color': "black"
        }
    });
});

/*--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//HINT: Use Turf collect function to collect all '_id' properties from the collision points data for each heaxagon
//      View the collect output in the console. Where there are no intersecting points in polygons, arrays will be empty



// /*--------------------------------------------------------------------
// Step 5: FINALIZE YOUR WEB MAP
// --------------------------------------------------------------------*/
//HINT: Think about the display of your data and usability of your web map.
//      Update the addlayer paint properties for your hexgrid using:
//        - an expression
//        - The COUNT attribute
//        - The maximum number of collisions found in a hexagon
//      Add a legend and additional functionality including pop-up windows


