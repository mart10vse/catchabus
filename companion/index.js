/**
 * Represents application logic ran by companion app
 * I tried various methods of fetching for educational purposes
 * Prod version will have fetches made with Promises like fetchGmaps.js to better handle higher traffic
 */
import { settingsStorage } from 'settings';
import { me } from "companion";
import * as messaging from 'messaging';
import { geolocation } from "geolocation";
import { createLogger } from '../common/logger';
import { GoogleMapsAPI } from "../companion/fetchGmaps";
import { fetchStops } from "../companion/fetchStops";
import { fetchBusTimes } from "../companion/fetchBusTimes";

const logger = createLogger('companion');
let curPosition = "";

// settings have been changed
settingsStorage.onchange = function (evt) {
  sendSettings(evt.key, evt.newValue);
};
// listen for the onopen Messaging API event
messaging.peerSocket.onopen = function() {
  sendSettings("stops", settingsStorage.getItem("stops"));
}

// settings were changed while the companion was not running
if (me.launchReasons.settingsChanged) {
  // send the value of the setting
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
  // send the data to the device if we have message socket
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  } else {
    logger.warn("No peerSocket connection");
  }
}

// sends gmaps response to app.js
function sendGmapsResponse(key, val) {
  if (val) {
    sendGmapsData({
      key: key,
      value: JSON.parse(val)
    });
  }
}
function sendGmapsData(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  } else {
    logger.warn("No peerSocket connection");
  }
}

// calls gmaps API after obtaining message from app.js
messaging.peerSocket.addEventListener("message", (evt) => {
  geolocation.getCurrentPosition(locationSuccess, locationError);
  let userChoice = JSON.parse(evt.data);
  GoogleMapsAPI(curPosition, userChoice['gps']).then((res) => {
    var response = JSON.stringify(res);
    sendGmapsResponse("gmaps", response);
  }); 
  fetchBusTimes(userChoice);
});

function locationSuccess(position) {
  curPosition = position.coords.latitude + "," + position.coords.longitude;
  return curPosition;
}

function locationError(error) {
  logger.error("Error: " + error.code, "Message: " + error.message);
}

// launches on app start and calls stops fetching function
function main() {
  // fetch stops for settings autocomplete
  fetchStops();
}

main();