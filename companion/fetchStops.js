import { createLogger } from '../common/logger';
import { settingsStorage } from 'settings';

const logger = createLogger('companion');

// fetches stops for companion settings usage
export function fetchStops() {
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
      logger.log("saving data to localstorage");
      settingsStorage.setItem('stopslist', JSON.stringify(autoValues));
    })
    .catch((e) => {
      logger.error('fetch err: ' + e);
    });
  }