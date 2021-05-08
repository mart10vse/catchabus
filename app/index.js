/**
 * Represents application logic ran by watch itself
 */
import * as messaging from "messaging";
import document from "document";
import clock from "clock";
import { HeartRateSensor } from "heart-rate";
import { me as appbit } from "appbit";
import exercise from "exercise";
import { vibration } from "haptics";

// get elements from view
let stopsList = document.getElementById("stops-list");
let busList = document.getElementById("bus-list");

let screen1 = document.getElementById("screen_stops");
let screen2 = document.getElementById("screen_bus");
let screen3 = document.getElementById("screen_run");

let hrText = document.getElementById("hr");
let timeText = document.getElementById("time");
let distanceText = document.getElementById("distance");
let runText = document.getElementById("run");

let endBtn = document.getElementById("endBtn");

let NUM_ELEMS = 14;
let FAV_STOPS = [];

let touchedStopID = "";
let touchedBusID = "";
let touchedStopGPS = "";

// open Messaging API socket 
messaging.peerSocket.addEventListener("open", () => {
  console.log("Ready to send or receive messages");
});
// Messaging API error
messaging.peerSocket.addEventListener("error", (err) => {
  console.error(`Connection error: ${err.code} - ${err.message}`);
});

// send data back to companion
function sendMessage(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  }
}


// Messaging API listener, procs only on message with stops
messaging.peerSocket.addEventListener("message", (evt) => {
  if (evt && evt.data && evt.data.key === "stops") {
    FAV_STOPS = evt.data.value;
    NUM_ELEMS = FAV_STOPS.length;

    // obtains necessary info for populating list
    stopsList.delegate = {
      getTileInfo: (index) => {
        return {
          type: "stop-pool",
          id: FAV_STOPS[index].id,
          value: FAV_STOPS[index].name,
          lat: FAV_STOPS[index].lat,
          lon: FAV_STOPS[index].lon,
          con: FAV_STOPS[index].connections,
          index: index
        };
      },
      // populate tile with info returned by delegate interface
      configureTile: (tile, info) => {
        if (info.type == "stop-pool") {
          tile.getElementById("text").text = info.value;
          let bg = tile.getElementById("bg");
          bg.addEventListener("click", () => {
            touchedStopID = info.id;
            touchedStopGPS = `${info.lat},${info.lon}`;

            // necessary to "draw" next screen with routes/buses 
            screen1.style.display ="none";
            screen2.style.display ="inline";
            screen3.style.display ="none";

            let bus = info.con.split(",");
            // delegate list of routes
            busList.delegate = {
              getTileInfo: (index) => {
                return {
                  type: "bus-pool",
                  value: bus[index],
                  index: index
                };
              },
              configureTile: (tile, info) => {
                if (info.type == "bus-pool") {
                  tile.getElementById("text").text = info.value;
                  let bg = tile.getElementById("bg");
                  bg.addEventListener("click", () => {
                    touchedBusID = info.value;                  
                    let userChoice = {
                      "stop_id": touchedStopID,
                      "bus": touchedBusID,
                      "gps": touchedStopGPS,
                    };
                    // sends user choices to companion for time and gmaps fetching
                    sendMessage(JSON.stringify(userChoice));
                  });
                }
              }
            };
            // docs: 'length must be set AFTER delegate'
            busList.length = bus.length;
          });
        }
      }
    };
    stopsList.length = NUM_ELEMS;
  }
});

// fetched departure time from companion
messaging.peerSocket.addEventListener("message", (evt) => {
  if (evt && evt.data && evt.data.key === "departure") {
    let departureData = evt.data.value;

    // draws timer/stats screen
    screen1.style.display = "none";
    screen2.style.display = "none";
    screen3.style.display = "inline";

    // converts obtained departure time to javascript and Clock API friendly date/time  
    let dtString = departureData["departure_time"].split(":");
    let today = new Date();
    let departureTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), dtString[0],dtString[1],dtString[2]);

    // prepares times for comparing walk duration from gmaps
    let runOrWalk = new Date(departureTime - today);
    let runOrWalkDuration = runOrWalk.getMinutes()*60+runOrWalk.getSeconds();
    let isSoon = true;
  
  // fetched gmaps data from companion
  messaging.peerSocket.addEventListener("message", (evt) => {
    if (evt && evt.data && evt.data.key === "gmaps") {
      let gmapsResponse = evt.data.value;
      let distanceMeters = gmapsResponse.rows[0].elements[0].distance.value;
      let duration = gmapsResponse.rows[0].elements[0].duration.value;

      // compares walking time to decide if one has to run or walk
      if (runOrWalkDuration < duration) {
        isSoon = false;
      } else {
        isSoon = true;
      }
      distanceText.text = JSON.stringify(distanceMeters) + " m";
    }
  });
  
  // obtain HR readings
  if (HeartRateSensor && appbit.permissions.granted("access_heart_rate")) {
    const hrm = new HeartRateSensor({ frequency: 1 });
    hrm.addEventListener("reading", () => {
      hrText.text = hrm.heartRate;
    });
    hrm.start();
  }

  // starts exercise session that can be later reviewed with additional info in Fitbit phone app
  exercise.start("Catching bus", { gps: false });
  
  // departure countdown
  let today2 = new Date();
  clock.granularity = "seconds";
  if(today2 <= departureTime) {
  clock.ontick = (evt) => {
      today2 = evt.date;
      let date = new Date(departureTime - evt.date);
      var minutes = "0" + date.getMinutes();
      var seconds = "0" + date.getSeconds();
      var formattedTime = minutes.substr(-2) + ':' + seconds.substr(-2);

      timeText.text = formattedTime;

      if (isSoon) {
        runText.text = "Take it slowly";
      } else {
        runText.text = "RUN!";
      }       
    }
  }
  else {
    runText.text = "Time's up!";
    exercise.stop();
    // TODO vibrations for edge cases
    vibration.start("nudge-max");
  }
  }
});

// exits app on button click
endBtn.addEventListener("click", () => {
  appbit.exit();
})