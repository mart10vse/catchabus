// function for fetching gmaps API - with Promises
export function GoogleMapsAPI(origin, destination) {
    return new Promise(function(resolve, reject) {
    var url = "https://maps.googleapis.com/maps/api/distancematrix/json?&key=<API_KEY_HERE>";
    url += "&mode=walking&units=metric&departure_time=now";
    url += "&origins=" + origin;
    url += "&destinations=" + destination;
    console.log("Fetching URL: " + url);
    fetch(url).then(function(response) {
        return response.json();
    }).then(function(json) {
         resolve(json);
    }).catch(function (error) {
        console.error("Fetching " + url + " failed: " + JSON.stringify(error));
        reject(resultArray);
    });
    });
}