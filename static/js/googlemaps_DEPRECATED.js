// INFO FROM https://developers.google.com/maps/documentation/javascript/examples/places-searchbox#maps_places_searchbox-javascript 

// This example adds a search box to a map, using the Google Place Autocomplete
// feature. People can enter geographical searches. The search box will return a
// pick list containing a mix of places and predicted search terms.
// This example requires the Places library. Include the libraries=places
// parameter when you first load the API. For example:
// <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">

function initAutocomplete() {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();
    const map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 8,
        mapTypeId: "roadmap",
    });
    directionsRenderer.setMap(map);
    
    const onSubmitHandler = function (evt) {
        evt.preventDefault();
        calculateAndDisplayRoute(directionsService, directionsRenderer);
    };

    document.getElementById('submit-calculations').addEventListener('click', onSubmitHandler);


    // Create the search box and link it to the UI element.
    const input = document.getElementById("pac-input");
    const searchBox = new google.maps.places.SearchBox(input);
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    // Bias the SearchBox results towards current map's viewport.
    map.addListener("bounds_changed", () => {
        searchBox.setBounds(map.getBounds());
    });
    let markers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();
        if (places.length == 0) {
            return;
        }
        // Clear out the old markers.
        markers.forEach((marker) => {
            marker.setMap(null);
        });
        markers = [];
        // For each place, get the icon, name and location.
        const bounds = new google.maps.LatLngBounds();
        places.forEach((place) => {
            if (!place.geometry) {
                console.log("Returned place contains no geometry");
                return;
            }
            const icon = {
                url: place.icon,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25),
            };
            // Create a marker for each place.
            markers.push(
                new google.maps.Marker({
                    map,
                    icon,
                    title: place.name,
                    position: place.geometry.location,
                })
            );


            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);

        const formatted_address = searchBox.getPlaces()[0].formatted_address;        
        append_to_current_direction(formatted_address);
        
    });
}

function calculateAndDisplayRoute(directionsService, directionsRenderer) {
    directionsService.route(
      {
        origin: {
          query: document.getElementById("origin").value,
        },
        destination: {
          query: document.getElementById("destination").value,
        },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      function (response, status) {
        if (status === "OK") {
            directionsRenderer.setDirections(response);
            console.log(response);
            const parsedResponse = parseResponseForLocations(response);
            axios.get('/get-weather-report', parsedResponse);
        } else {
          window.alert("Directions request failed due to " + status);
        }
      }
    );
  }


const update_current_label = ($current)=>{
    $inputDivs = $('.input-group-append').get()
    $inputDivs.forEach((element)=>{
        value = element.children[0].value;
        if(value === ''){
            console.log(value);
            $('#current-label')[0].innerText = element.children[0].placeholder;
            return;
        }
    });

}

const append_to_current_direction = (address)=>{
    $current = $('#current-label').get()[0].innerText.toLowerCase();
    // console.log($(`#${current}-input`))
    $(`#${$current}`).get()[0].value=address;

    update_current_label($current);
}

const formatDateForWeatherBit = (time)=>{
    //regex to match JS Date UTC time to the weather UTC time
    time = time.toISOString();
    time = time.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g)[0];
    return time;
}

const extractHoursMinutes = (duration)=>{
    let minutes = 0;
    let hours = 0;

    if(duration.includes('hour')){
        hours = parseInt(duration.match(/(\d+)\shour/)[1]);
    }
    if(duration.includes('min')){
        minutes = parseInt(duration.match(/(\d+)\smin/)[1]);
    }
    return [minutes, hours];
}

const parseResponseForLocations = (response)=>{
    //NOTE: result's first 2 values are predetermined to be the end pt and start pt respectively
    const result = {times: {}, locations: {}};

    // let startTime = new Date().toISOString();
    let time = new Date();

    let endTime = time;
    let tripDuration = response.routes[0].legs[0].duration.text;

    //add end pt and time to the result as result[0]
    [minutes, hours] = extractHoursMinutes(tripDuration);
    endTime.setHours(endTime.getHours() + hours);
    endTime.setMinutes(endTime.getMinutes() + minutes);
    result.times[0] = formatDateForWeatherBit(endTime);
    result.locations[0] = response.routes[0].legs[0].end_address;
    
    // add start time/location to the result as result[1]
    result.times[1] = formatDateForWeatherBit(time);
    result.locations[1] = response.routes[0].legs[0].start_address;
    let resultCounter = 2;
    
    let minutesTillOneHour = 60;
    let feetTillMile = 5280;
    
    
    /*
    BEFORE HITTING THE 1 HR MARK:
    Each mile, record a timestamp of where the driver *should* be
    and add to the array.
    Reset currentFeet to 0
    
    AFTER HITTING 1 HR MARK:
    Each hour, record a timestamp of where the driver *should* be
    and add to the array.
    
    UPDATE TIME   
    
    */
   let miles = 0;
   let feet = 0;
   steps = response.routes[0].legs[0].steps;
   steps.forEach((step)=>{


        //have hit 1 hour mark?
        /*if(minutesTillOneHour > 0){

            [stepMiles, stepFeet] = breakUpStepDistance(step);
            miles+=stepMiles;
            feet+=stepFeet;
            console.log(`miles:${miles} \t feet:${feet}`);
            feetTillMile += feet;
            while(feetTillMile >= 5280){
                miles++;
                feetTillMile-=5280;
            }

            let locationCountForStep = 0; 
            while(miles >= 10){
                //calculate time/distance for step with multiple miles:
                locationCountForStep++;
                miles-=10;
            }

            const responseForStep = extractLocationsForStep(locationCountForStep, step, time);
            //returns a list of 3 lists with corresponding indexes
            //first list: latitude
            //second list: longitude
            //third list: estimated time at each lat/long

            for(let i = 0; i < responseForStep[0].length; i++){
                result.locations[resultCounter] = `${responseForStep[0][i]}, ${responseForStep[1][i]}`;
                result.times[resultCounter] = responseForStep[2][i];
                resultCounter++;
            }

            //update time
            stepDuration = step.duration.text;
            if(!stepDuration.includes('hour')){//must just be minutes
                minutesTillOneHour -= parseInt(stepDuration.substring(0, stepDuration.length-5));
            }else{
                minutesTillOneHour = 0;
            }


        }else{//2nd phase, check location/place every hr

        }*/
        
        //update time
        const [minutes, hours] = extractHoursMinutes(step.duration.text);
        time.setMinutes(time.getMinutes() + minutes);
        time.setHours(time.getHours() + hours);
    });
    return result;
}
/*
const extractLocationsForStep = (locationCount, step, currentTime) => {
    const lats = [];
    const lngs = [];
    const times = [];
    //Estimate corresponding times for the locations
    //Assume that each 10 miles (aka each lat/lng) = ~10 minutes

     
    const stepDuration = step.duration.text;
    if(locationCount === 1){
        lats.push(step.path[step.path/2].lat());
        lngs.push(step.path[step.path/2].lng());
        currentTime.setMinutes(currentTime.getMinutes() + 10)
        times.push(currentTime);
    }else if(locationCount > 1){
        const stepPathLength = step.path.length;
        const pathLocationsRatio = stepPathLength/locationCount;
        for(let i = 0; i < locationCount; i++){
            lats.push(step.path[i*pathLocationsRatio].lat());
            lngs.push(step.path[i*pathLocationsRatio].lng());
            currentTime.setMinutes(currentTime.getMinutes() + 10);
            times.push(currentTime); 
        }
    }
    return [lats, lngs];
}

const breakUpStepDistance = (step)=>{

    const distance = step.distance.text;
    let miles = 0;
    let feet = 0;
    if(distance.includes('mi')){
        matches = parseFloat(distance.match(/(\d+.\d+)\smi/)[1]);
    }
    
    if(distance.includes('ft')){
        feet = parseFloat(distance.match(/(\d+.\d+)\sft/)[1]);
    }

    return [miles, feet];

}*/