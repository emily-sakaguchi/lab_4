/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js 
--------------------------------------------------------------------
Step 1: INITIALIZE MAP
--------------------------------------------------------------------*/
//My mpabox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZW1pbHlzYWthZ3VjaGkiLCJhIjoiY2xkbTByeWl5MDF5YjNua2RmdWYyZ240ciJ9.l0mkQSD3VSua3-9301GQbA'; // my MapBox public access token

//This code initializes the map and sets the starting point to be zoomed into Toronto
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
map.addControl(new mapboxgl.NavigationControl(), 'top-left'); 
//I have specified top left location to move the controls from the default position in the top-right

//Adds a button to make the map fullscreen
map.addControl(new mapboxgl.FullscreenControl(), 'top-left');
//I have specified top left location to move the controls from the default position in the top-right

/*--------------------------------------------------------------------
PREPARING THE GEOJSON POINT DATA 
- The "step 2" process of adding the data to the map has been reorganized
- The data is added below the creation of the bounding box and hexgrid to streamline the code and keep it organized
--------------------------------------------------------------------*/
  
let collisionjson; //empty variable to store the collision points GeoJSON data

//below I use the fecth method to access the GeoJSON from the online GitHub repository
fetch('https://raw.githubusercontent.com/emily-sakaguchi/lab_4/main/ggr472-lab4/data/pedcyc_collision_06-21.geojson')

    .then(response => response.json()) // Converts the response to JSON format  
    .then(response => {
        console.log(response); //Checking the response in console
        collisionjson = response; // Stores the response in the variable created above
    });

/*--------------------------------------------------------------------
    Step 3: CREATE BOUNDING BOX AND HEXGRID
--------------------------------------------------------------------*/
map.on('load', () => { // the map load event handler contains all the code to create the hexgrid and view the data on the map

let bboxgeojson; //an empty variable that will be used to store and access the boundng box created below       
let bbox = turf.envelope(collisionjson); //sends point geojson to turf to creates an 'envelope' (bounding box) around the points

let bboxscaled = turf.transformScale(bbox, 1.10); //scales the bbox up by 10% to create some buffering around the points closest to the edge
bboxgeojson = {  //puts the resulting envelope in a geojson format FeatureCollection
    'type': 'FeatureCollection',        
    'features': [bboxscaled]
};

console.log(bbox) //checking to see that the bbox variable has the expected characteristics
console.log(bbox.geometry.coordinates) //checking the bbox coordinates in the console

//bboxcoords is an array variable that stores the bbox coordinate information 
//the coordinates are ordered in this way: min X,min Y, max X, max Y
let bboxcoords = [bboxscaled.geometry.coordinates[0][0][0],       
    bboxscaled.geometry.coordinates[0][0][1],
    bboxscaled.geometry.coordinates[0][2][0], 
    bboxscaled.geometry.coordinates[0][2][1]]; 
console.log(bboxcoords)

//adding the hexgrid to the map
    //creating the hexgrid       
    let hexgeojson = turf.hexGrid(bboxcoords, 0.5, {units: 'kilometers'}); 
    /*- inputting bboxcoords as an argument i the turf.hexGrid function specifies the bounding box coordinates,
        - i.e. this is necessary to set the geographic limits within which to draw the hexagons
    - 0.5 is the length of the side of the hexagon
    - units are in kilometres which is appropriate to Toronto, the area of study, where metric units are used

--------------------------------------------------------------------
Step 4: AGGREGATE COLLISIONS BY HEXGRID
--------------------------------------------------------------------*/
//the Turf collect function is used below to collect the unique '_id' properties from the collision points data for each hexagon
//the result of the function is stored in a variable called collishex
    let collishex = turf.collect(hexgeojson, collisionjson, '_id', 'values');
    console.log(collishex) //Viewing the collect output in the console

let maxcollis = 0; //a variable to store the maximum count of collisions in a given cell

//below is a conditional statment to find the maximu collision count in any given hexagon
collishex.features.forEach((feature) => {
    feature.properties.COUNT = feature.properties.values.length
    if (feature.properties.COUNT > maxcollis) { //this line tests if the count in a hexagon exceeds the maximum count found up to that point
        console.log(feature); //Allows me to view the process of determining the macimum count in the console
        maxcollis = feature.properties.COUNT//if the collision count is higher, this value becomes the new maximum stored in maxcollis
    }
})

/*--------------------------------------------------------------------
ADDING DATA TO THE MAP 
--------------------------------------------------------------------*/
    //Adding the collisions data using GeoJSON variable
    map.addSource('collisions-TO', {
        type: 'geojson', //geojson format is essential for the Turf.js functions used below
        data: collisionjson //using the variable I created above as the data source
    });
    
    map.addLayer({
        'id': 'serious-collisions',
        'type': 'circle',
        'source': 'collisions-TO', //matches the source given above
        'paint': {
            'circle-radius': 2, //I have made the points small small so that they willnot distract from the hexgrid visualiztion
            'circle-color': 'red' //red is appropriate to symbolize serious collisions due to its association with danger and warnings
        }
    }); 
    
    //adding the bounding box to the map
    map.addSource('collis-bbox', {
        'type': 'geojson',
        'data': bboxgeojson //this is the bounding box variable I created above         
    });
                    
    map.addLayer({        
        'id': 'collisionEnvelope',        
        'type': 'fill',        
        'source': 'collis-bbox',        
        'paint': {       
            'fill-opacity': 0, //I have no fill/a completely transparent fill to ensure the visibility of the underlying basemap        
            'fill-outline-color': 'white'        
        }        
    });

    map.addSource('collis-hex', {
        'type': "geojson",
        'data': hexgeojson //this is the hexgrid variable I created above
        });
    
    map.addLayer({
        'id': 'collishexgrid',
        'type': 'fill',
        'source': 'collis-hex',
        'paint': {
            'fill-color': [
                'step', //the step expression used here visualizes the collision counts for each hexagon
            //if I had more time to work on this, I would play around with interpolate-hcl
            //I feel that interpolate-hcl's smooth, continous colour ramp would be better suited to represent counts, which are continuous
                ['get', 'COUNT'],
                '#BAFEBE', //mint green for 0-9
                10, '#A1C64B', // sage green
                20, '#FEE300', // yellow
                30, '#FF8700',// orange
                40, '#E00805' //soft red for values 40- 55, the maximum number of collisions within one hexagon
            ],
            'fill-opacity': 0.5, //this will allow for partial visibility of the underlying basemap and collision points (if toggled)
            'fill-outline-color': 'white' //white will show divisions without being too stark against the light-coloured fill
        }
    });
}); //end of the map load event

/*--------------------------------------------------------------------
LEGEND
- the below code is for a legend of the colour ramp created using the step expresssion above
- it is coded to be interactive, i.e. users can toggle it on and off
--------------------------------------------------------------------*/
//Declaring an array variable for labels and colours
let legendlabels = [ //I use let rather than const here to provide myself with flexiblity as the legend changes
    '0-9',
    '10-19', 
    '20-29',
    '30-39',
    '40-55'
];

let legendcolours = [ //I use let rather than const here to provide myself with flexiblity as the legend changes
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
- check boxes to toggle the legend and collision points layer
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

//Collision points layer display (check box) - allows users to filter the collision points off of the map
document.getElementById('layercheck').addEventListener('change', (e) => {
    map.setLayoutProperty(
        'serious-collisions',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});

/*--------------------------------------------------------------------
POP-UP ON CLICK EVENT
- To indicate to users they can click on hexagons, the cursor changes to a pointer when it moves over them
- When the cursor clicks on a hexagon, the number of collisions in that hexagon appear in a pop-up
- All pop-ups also include a brief amount of text describing how to interpret the hexagon collision count
--------------------------------------------------------------------*/
map.on('mouseenter', 'collishexgrid', () => {
    map.getCanvas().style.cursor = 'pointer'; //Switches the cursor to a pointer when the mouse is over a hexagon layer
});

map.on('mouseleave', 'collishexgrid', () => {
    map.getCanvas().style.cursor = ''; //Switches cursor back when mouse leaves the hexgrid/bounding box
});


map.on('click', 'collishexgrid', (e) => {
    new mapboxgl.Popup() //Declares a new popup on each click
        .setLngLat(e.lngLat) //Coordinates of the mouse click to determine the coordinates of the pop-up
        //Text for the pop-up:
        .setHTML("<b>Collision count:</b> " + e.features[0].properties.COUNT + "<br>" +// shows the collision count
        //the below texts provides an explanation to help users understand the pop-up information
            "The collision count is the number of pedestrian-motor vehicle collisions within this hexagonal area.") 
        .addTo(map); //Adds the popup to the map
});


    
    