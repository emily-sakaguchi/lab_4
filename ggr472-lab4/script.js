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
ADDING MAPBOX CONTROLS AS ELEMENTS ON MAP
--------------------------------------------------------------------*/
//Adds buttons for zoom and rotation to the map.
map.addControl(new mapboxgl.NavigationControl());

//Adds a button to make the map fullscreen
map.addControl(new mapboxgl.FullscreenControl());

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
                '#BAFEBE',
                10, '#A1C64B',
                20, '#FEE300',
                30, '#FF8700',
                40, '#E00805' //The maximum number of collisions within one hexagon
            ],
            'fill-opacity': 0.5,
            'fill-outline-color': 'white'
        }
    });
});

/*--------------------------------------------------------------------
LEGEND
--------------------------------------------------------------------*/
//Declare array variables for labels and colours
var legendlabels = [ //I use var rather than const here to provide myself with flexiblity as the legend changes
    '0-9',
    '10-19', 
    '20-29',
    '30-39',
    '40-55'
];

var legendcolours = [ //I use var rather than const here to provide myself with flexiblity as the legend changes
    '#BAFEBE', // mint green for 0-9
    '#A1C64B', // sage green for 10-19
    '#FEE300', // yellow for 20-29
    '#FF8700', // orange yellow for 30-39
    '#E00805' // soft red for 40-55
];

//legend variable that corresponds to legend div tag in html
const legend = document.getElementById('legend');

//Creates a legend block containing colours and labels
legendlabels.forEach((label, i) => {
    const color = legendcolours[i];

    const item = document.createElement('div'); //creates the rows
    const key = document.createElement('span'); //adds a key (circle of colour) to the row

    key.className = 'legend-key'; //style proprties assigned in style.css
    key.style.backgroundColor = color; //the color is assigned in the layers array

    const value = document.createElement('span'); //adds a value to each row 
    value.innerHTML = `${label}`; //adds a text label to the value 

    item.appendChild(key); //appends the key to the legend row
    item.appendChild(value); //appends the value to the legend row

    legend.appendChild(item); //appends each row to the legend
});


/*--------------------------------------------------------------------
INTERACTIVITY
- check boxes and buttons
--------------------------------------------------------------------*/

//Legend display (check box)
let legendcheck = document.getElementById('legendcheck');

legendcheck.addEventListener('click', () => {
    if (legendcheck.checked) {
        legendcheck.checked = true; //when checked (true), the legend block is visible
        legend.style.display = 'block';
    }
    else {
        legend.style.display = "none"; 
        legendcheck.checked = false; //when unchecked (false), the legend block is not displayed
    }
});

//Collision points layer display (check box)
document.getElementById('layercheck').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'serious-collisions',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});

/*--------------------------------------------------------------------
POP-UP ON CLICK EVENT
- When the cursor moves over the map, it changes from the default hand to a pointer
- When the cursor clicks on a hexagon, the number of collisions in that hexagon appear in a pop-up
- All pop-ups  also include a brief amount of text describing how to interpret the hexagons
--------------------------------------------------------------------*/
map.on('mouseenter', 'collishexgrid', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switches cursor to pointer when mouse is over provterr-fill layer
});

map.on('mouseleave', 'collishexgrid', () => {
    map.getCanvas().style.cursor = ''; //Switches cursor back when mouse leaves neighbourhood-fill layer
});


map.on('click', 'collishexgrid', (e) => {
    new mapboxgl.Popup() //Declares a new popup on each click
        .setLngLat(e.lngLat) //Coordinates of the mouse click to determine the coordinates of the pop-up
        //Text for the pop-up:
        .setHTML("<b>Collision count:</b> " + e.features[0].properties.COUNT + "<br>" +// shows neighbourhood name
            "How to interpret this map: ") //
        .addTo(map); //Adds the popup to the map
});


    
    