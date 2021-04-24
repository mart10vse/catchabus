import { settingsStorage } from 'settings';
import { localStorage } from 'local-storage';
import { me } from "companion";
import * as messaging from 'messaging';
import { createLogger } from '../common/logger';
import { geolocation } from "geolocation";
import { GoogleMapsAPI } from "../companion/gmaps";

const logger = createLogger('companion');
let FAV_STOPS = [];
let curPosition = "";

// refresh fetches
// Used by Settings Page AutoComplete
function refreshStopsList() {
  logger.log('refreshing stop list');
  const url = 'http://localhost/api/api.php/records/view_stops_routes';
  return fetch(url)
  .then(resp => resp.json())
  .then(data => {
    let arr = [];
    for (let i = 0; i < data.records.length; i++) {
        arr.push([data.records[i].stop_id,
                  data.records[i].stop_name.replace(/"/g,''),
                  data.records[i].stop_lat,
                  data.records[i].stop_lon,
                  data.records[i].routes_short_names,
                  data.records[i].stop_headsign]);
    }
    
    let uniq = [...new Set(arr)];
    let autoValues = [];
    for (let i=0; i < uniq.length; i++) {
      autoValues.push( {
        "id": uniq[i][0],
        "name": uniq[i][1],
        "lat": uniq[i][2],
        "lon": uniq[i][3],
        "connections": uniq[i][4],
        "headsign": uniq[i][5]
      } );
    }
    //console.log(autoValues);
    settingsStorage.setItem('stopslist', JSON.stringify(autoValues));
  })
  .catch((e) => {
    logger.error('fetch err: ' + e);
  });
}


function fetchBusTimes(data) {
  let userChoice = data;

  let dateObj = new Date()
  var hours = dateObj.getHours();
  var minutes = "0" + dateObj.getMinutes();
  var seconds = "0" + dateObj.getSeconds();

  var time1 = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
  var time2 = hours+10 + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
  let weekday = dateObj.toLocaleString("en", { weekday: "long" }).toLowerCase();
  logger.log('fetching bus times');
  const url = 'http://localhost/api/api.php/records/view_departure_times'
              + '?filter=stop_id,eq,' + userChoice['stop_id']
              + '&filter=' + weekday + ',eq,1' 
              + '&filter=route_short_name,eq,' + userChoice['bus']
              + '&filter=departure_time,gt,' + time1 + '&filter=departure_time,lt,' + time2
              + '&order=departure_time,asc';
  return fetch(url)
  .then(resp => resp.json())
  .then(data => {
    let arr;
    if (data.records.length >= 1) {
       arr = {
        "stop_name": data.records[0].stop_name.replace(/"/g,''),
        "bus": data.records[0].route_short_name,
        "headsign": data.records[0].trip_headsign,
        "departure_time": data.records[0].departure_time
      };
    } else console.log("something went wrong");
    sendDeparture('departure', arr);
  })
  .catch((e) => {
    logger.error('fetch err: ' + e);
  });
}



// Settings have been changed
settingsStorage.onchange = function (evt) {
  sendSettings(evt.key, evt.newValue);
};

// Listen for the onopen event
messaging.peerSocket.onopen = function() {
  sendSettings("stops", settingsStorage.getItem("stops"));
}

// Settings were changed while the companion was not running
if (me.launchReasons.settingsChanged) {
  // Send the value of the setting
  sendSettings("stops", settingsStorage.getItem("stops"));
}

function sendSettings(key, val) {
  if (val) {
    sendSettingData({
      key: key,
      value: JSON.parse(val)
    });
  }
}
function sendSettingData(data) {
  // If we have a MessageSocket, send the data to the device
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  } else {
    console.log("No peerSocket connection");
  }
}

function sendGmapsResponse(key, val) {
  if (val) {
    sendGmapsData({
      key: key,
      value: JSON.parse(val)
    });
  }
}
function sendGmapsData(data) {
  // If we have a MessageSocket, send the data to the device
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  } else {
    console.log("No peerSocket connection");
  }
}

function sendDeparture(key, val) {
  if (val) {
    sendDepartureData({
      key: key,
      value: val
    });
  }
}
function sendDepartureData(data) {
  // If we have a MessageSocket, send the data to the device
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  } else {
    console.log("No peerSocket connection");
  }
}

messaging.peerSocket.addEventListener("message", (evt) => {
  geolocation.getCurrentPosition(locationSuccess, locationError);
  let userChoice = JSON.parse(evt.data);
  logger.error("User choices " + userChoice['gps']);
  GoogleMapsAPI(curPosition, userChoice['gps']).then((res) => {
    var response = JSON.stringify(res);
    sendGmapsResponse("gmaps", response);
  });
  
  fetchBusTimes(userChoice);
  
});

function locationSuccess(position) {
  curPosition = position.coords.latitude + "," + position.coords.longitude;
  console.error("Current position " + curPosition);
  return curPosition;
}

function locationError(error) {
  console.log("Error: " + error.code, "Message: " + error.message);
}

function main() {
  refreshStopsList();
}

main();