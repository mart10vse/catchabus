import { createLogger } from '../common/logger';
import * as messaging from 'messaging';

const logger = createLogger('companion');

// fetches routes times based on user choice from 'app.js'
export function fetchBusTimes(data) {
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
    } else logger.error("something went wrong with API");
    sendDeparture('departure', arr);
  })
  .catch((e) => {
    logger.error('fetch err: ' + e);
  });
}

// sends departure times
function sendDeparture(key, val) {
  if (val) {
    sendDepartureData({
      key: key,
      value: val
    });
  }
}
function sendDepartureData(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    messaging.peerSocket.send(data);
  } else {
    logger.warn("No peerSocket connection");
  }
}